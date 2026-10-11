import { describe, expect, it } from 'vitest';
import { calculateEstimate } from '../../src/calculators';
import { confidenceLevel } from '../../src/calculators/evidence';
import { fmtNum, makeT } from '../../src/i18n';
import { migrateInput, mfatahExampleInput, newAddition, varndaExampleInput } from '../../src/lib/defaults';
import { approveRate, migrateRatebook, upsertRate, validateRatebook } from '../../src/lib/ratebookStore';
import { makeSaved, parseSavedEstimate, ratebookWithSnapshot, ratesUsedBy } from '../../src/lib/savedEstimates';
import { basisText } from '../../src/reports/format';
import type { EstimateResult, Ratebook } from '../../src/types';
import { NOW, codes, rb, threeFloors, withRate } from './helpers';

const line = (r: EstimateResult, k: string) => r.lines.find((l) => l.key === k)!;
const en = makeT('en');
const ar = makeT('ar');

describe('Per-scenario formulas (Phase 2.1)', () => {
  const r = calculateEstimate(varndaExampleInput(), rb(), NOW);

  it('Varnda low / typical / high totals', () => {
    expect(r.ownerTotal).toEqual({ low: 154040, mid: 170600, high: 192680 });
    expect(r.construction).toEqual({ low: 129600, mid: 144000, high: 163200 });
    expect(line(r, 'design').amount).toEqual({ low: 10368, mid: 11520, high: 13056 });
    expect(line(r, 'contingency').amount).toEqual({ low: 9072, mid: 10080, high: 11424 });
    expect(line(r, 'fixed_fees').amount).toEqual({ low: 5000, mid: 5000, high: 5000 });
  });

  it('each scenario carries its own rate and result', () => {
    const ag = line(r, 'above_ground');
    expect(ag.basisBy.low).toMatchObject({ area: 960, rate: 135, result: 129600 });
    expect(ag.basisBy.mid).toMatchObject({ area: 960, rate: 150, result: 144000 });
    expect(ag.basisBy.high).toMatchObject({ area: 960, rate: 170, result: 163200 });
    expect(line(r, 'design').basisBy.low).toMatchObject({ pct: 8, baseAmt: 129600, result: 10368 });
    expect(line(r, 'contingency').basisBy.high).toMatchObject({ pct: 7, baseAmt: 163200, result: 11424 });
  });

  it('English formula strings match each scenario amount', () => {
    expect(basisText(en, line(r, 'above_ground'), 'low')).toBe('960 m² × 135 KWD/m² = 129,600');
    expect(basisText(en, line(r, 'above_ground'), 'mid')).toBe('960 m² × 150 KWD/m² = 144,000');
    expect(basisText(en, line(r, 'above_ground'), 'high')).toBe('960 m² × 170 KWD/m² = 163,200');
    expect(basisText(en, line(r, 'design'), 'low')).toBe('8% × 129,600 (above-ground base) = 10,368');
    expect(basisText(en, line(r, 'design'), 'high')).toBe('8% × 163,200 (above-ground base) = 13,056');
    expect(basisText(en, line(r, 'contingency'), 'low')).toBe('7% × 129,600 (above-ground base) = 9,072');
    expect(basisText(en, line(r, 'contingency'), 'high')).toBe('7% × 163,200 (above-ground base) = 11,424');
  });

  it('Arabic formula strings match each scenario amount', () => {
    expect(basisText(ar, line(r, 'above_ground'), 'low')).toBe('960 م² × 135 د.ك/م² = 129,600');
    expect(basisText(ar, line(r, 'design'), 'high')).toBe('8% × 163,200 (أساس الأدوار فوق الأرض) = 13,056');
  });

  it('formulas survive JSON export / import', () => {
    const saved = parseSavedEstimate(JSON.stringify(makeSaved(varndaExampleInput(), r, rb())));
    expect(saved.result.lines.find((l) => l.key === 'above_ground')!.basisBy.high.rate).toBe(170);
  });
});

describe('Construction vs owner budget (Phase 2.3) and range honesty (2.4)', () => {
  it('owner total = construction + owner additional, every scenario', () => {
    const r = calculateEstimate(varndaExampleInput(), rb(), NOW);
    expect(r.ownerAdditional).toEqual({ low: 24440, mid: 26600, high: 29480 });
    for (const k of ['low', 'mid', 'high'] as const) expect(r.construction![k] + r.ownerAdditional![k]).toBe(r.ownerTotal![k]);
    expect(r.lines.filter((l) => l.group === 'construction').map((l) => l.key)).toEqual(['above_ground']);
  });

  it('single-value rates are flagged as having no range', () => {
    expect(calculateEstimate(mfatahExampleInput(), rb(), NOW).rangeAvailable).toBe(false);
    expect(calculateEstimate(varndaExampleInput(), rb(), NOW).rangeAvailable).toBe(true);
  });

  it('line kinds distinguish area-rate, calculated, allowance, percentage, fixed and owner', () => {
    const i = varndaExampleInput();
    i.additions = [
      { ...newAddition('elevator', 'turnkey'), rate: '12000', source: 'q' },
      { ...newAddition('landscaping', 'turnkey'), status: 'provisional', quantity: '100', rate: '20', source: 'est' },
    ];
    i.ownerDirect = [{ id: 'o', description: 'Furniture', amount: '1000' }];
    const r = calculateEstimate(i, rb(), NOW);
    expect(Object.fromEntries(r.lines.map((l) => [l.key, l.kind]))).toEqual({
      above_ground: 'area_rate', additions: 'calculated', allowances: 'allowance', owner_direct: 'owner', design: 'percentage', fixed_fees: 'fixed', contingency: 'percentage',
    });
  });
});

describe('Scope-ownership matrix (Phases 5–6)', () => {
  it('upgrade via standard unit rate: 30 × 120 − 30 × 60 = 1,800', () => {
    const i = threeFloors();
    i.additions = [{ ...newAddition('aluminium', 'turnkey'), status: 'upgrade', quantity: '30', rate: '120', standardRate: '60', source: 'Supplier Q-12' }];
    const r = calculateEstimate(i, rb(), NOW);
    expect(r.additions[0]).toMatchObject({ gross: 3600, allowance: 1800, net: 1800, baselineDocumented: false });
    expect(r.construction!.mid).toBe(144000 + 1800);
    expect(codes(r.issues)).toContain('UPGRADE_BASELINE_UNDOCUMENTED');
  });

  it('upgrade uses the allowance documented by the base rate', () => {
    const book = withRate(rb(), {
      rate_id: 'U-TK', scope: 'turnkey', grade: 'medium', grade_system: 'urban', price_low: 150, price_mid: 160, price_high: 170, approval_status: 'urban_approved',
      evidence_status: 'urban_approved', source_date: '2026-10-01', included_components: [{ key: 'aluminium', allowance_rate: 60, allowance_unit: 'm²' }],
    });
    const i = threeFloors();
    i.additions = [{ ...newAddition('aluminium', 'turnkey'), status: 'upgrade', quantity: '30', rate: '120', source: 'Supplier' }];
    const r = calculateEstimate(i, book, NOW);
    expect(r.additions[0]).toMatchObject({ allowance: 1800, net: 1800, baselineDocumented: true });
    expect(codes(r.issues)).not.toContain('UPGRADE_BASELINE_UNDOCUMENTED');
  });

  it('extra already included in baseline is not charged again', () => {
    const i = threeFloors();
    i.additions = [{ ...newAddition('kitchen', 'turnkey'), status: 'baseline', rate: '15000' }];
    const r = calculateEstimate(i, rb(), NOW);
    expect(r.construction!.mid).toBe(144000);
    expect(codes(r.issues)).toContain('BASELINE_INCLUSION_UNDOCUMENTED');
  });

  it('owner-direct scope items go to the owner budget, not construction', () => {
    const i = threeFloors();
    i.additions = [{ ...newAddition('kitchen', 'turnkey'), status: 'owner_direct', rate: '9000', source: 'Showroom' }];
    i.ownerDirect = [{ id: 'o', description: 'Curtains', amount: '1000' }];
    const r = calculateEstimate(i, rb(), NOW);
    expect(r.construction!.mid).toBe(144000);
    expect(line(r, 'owner_direct').amount.mid).toBe(10000);
    expect(r.ownerTotal!.mid).toBe(154000);
  });

  it('excluded items cost nothing; quote-required items make the estimate partial', () => {
    const i = threeFloors();
    i.additions = [{ ...newAddition('pool', 'turnkey'), status: 'excluded' }, { ...newAddition('elevator', 'turnkey'), status: 'quote_required' }];
    const r = calculateEstimate(i, rb(), NOW);
    expect(r.status).toBe('partial');
    expect(r.unpriced.map((u) => u.code)).toEqual(['QUOTE_REQUIRED']);
    expect(r.construction!.mid).toBe(144000);
  });

  it('missing rate source is warned', () => {
    const i = threeFloors();
    i.additions = [{ ...newAddition('elevator', 'turnkey'), rate: '12000' }];
    expect(codes(calculateEstimate(i, rb(), NOW).issues)).toContain('ADDITION_NO_SOURCE');
  });
});

describe('Rate freshness and provenance (Phase 4.3)', () => {
  const edit = (patch: Record<string, unknown>) => {
    const book = rb();
    Object.assign(book.rates.find((r) => r.rate_id === 'VR-02')!, patch);
    return calculateEstimate(threeFloors(), book, NOW);
  };
  it('expired quotation', () => expect(codes(edit({ valid_until: '2026-09-30' }).issues)).toContain('RATE_EXPIRED'));
  it('old quotation without validity', () => expect(codes(edit({ approval_status: 'supplier_quotation', source_date: '2026-05-01' }).issues)).toContain('QUOTE_OLD'));
  it('missing date', () => expect(codes(edit({ source_date: '' }).issues)).toContain('RATE_NO_DATE'));
  it('foreign rate', () => expect(codes(edit({ country: 'SA' }).issues)).toContain('RATE_FOREIGN'));
  it('excludes installation', () => expect(codes(edit({ price_basis: 'material_only' }).issues)).toContain('MATERIAL_ONLY_RATE'));
  it('unverified method', () => expect(codes(edit({}).issues)).toContain('RATE_UNVERIFIED_METHOD'));
  it('incompatible unit blocks the estimate', () => {
    const r = edit({ unit: 'KWD/item' });
    expect(r.status).toBe('blocked');
    expect(codes(r.issues)).toContain('RATE_UNIT_INCOMPATIBLE');
  });
  it('confidence is qualitative and Varnda rates rate low', () => {
    expect(confidenceLevel(rb().rates[0])).toBe('low');
    expect(calculateEstimate(threeFloors(), rb(), NOW).rate!.confidence).toBe('low');
  });
});

describe('Approval security (Phase 4.4)', () => {
  it('approval requires a named approver and is logged', () => {
    expect(() => approveRate(rb(), 'VR-02', '  ')).toThrow(/Approver/);
    const book = approveRate(rb(), 'VR-02', 'Eng. Fahad (QS)', NOW);
    const r = book.rates.find((x) => x.rate_id === 'VR-02')!;
    expect(r).toMatchObject({ approval_status: 'urban_approved', evidence_status: 'urban_approved', approver: 'Eng. Fahad (QS)' });
    expect(book.changelog.some((c) => c.action === 'approve' && c.by === 'Eng. Fahad (QS)')).toBe(true);
  });
  it('an approved rate without approver fails validation', () => {
    const book = rb();
    book.rates[0].approval_status = 'urban_approved';
    expect(validateRatebook(book)).toMatch(/approver/);
  });
  it('re-pricing an approved rate without re-approval downgrades it', () => {
    let book = approveRate(rb(), 'VR-02', 'QS', NOW);
    const r = book.rates.find((x) => x.rate_id === 'VR-02')!;
    book = upsertRate(book, { ...r, price_mid: 155 }, NOW);
    expect(book.rates.find((x) => x.rate_id === 'VR-02')!.approval_status).toBe('user_provisional');
  });
});

describe('Refined estimate (Level 2)', () => {
  it('special structure flags an engineering quotation; a priced allowance resolves it', () => {
    const i = threeFloors({ level: 2 });
    i.refined = { ...i.refined, cantilevers: 'yes', specialStructure: 'no' };
    expect(calculateEstimate(i, rb(), NOW).unpriced.map((u) => u.code)).toContain('STRUCTURAL_REVIEW_REQUIRED');
    i.additions = [{ ...newAddition('structural_features', 'turnkey'), status: 'provisional', rate: '8000', source: 'Engineer estimate' }];
    const r = calculateEstimate(i, rb(), NOW);
    expect(r.unpriced).toHaveLength(0);
    expect(line(r, 'allowances').amount.mid).toBe(8000);
  });
  it('site difficulties require quotations', () => {
    const i = threeFloors({ level: 2 });
    i.refined = { ...i.refined, cantilevers: 'no', specialStructure: 'no', siteDifficulties: ['narrow_access', 'poor_soil'] };
    expect(calculateEstimate(i, rb(), NOW).unpriced.map((u) => u.params?.item)).toEqual(['narrow_access', 'poor_soil']);
  });
  it('floor heights are validated but never priced; no quantities derived', () => {
    const i = threeFloors({ level: 2 });
    i.refined = { ...i.refined, cantilevers: 'no', specialStructure: 'no', floorHeights: { ground: '4.5', first: '3.6', second: '-1', roofAnnex: '' } };
    expect(codes(calculateEstimate(i, rb(), NOW).issues)).toContain('NEGATIVE_NUMBER');
    i.refined.floorHeights.second = '3.6';
    const r = calculateEstimate(i, rb(), NOW);
    expect(r.construction!.mid).toBe(144000);
    expect(codes(r.issues)).toEqual(expect.arrayContaining(['REFINED_HEIGHTS_NOT_PRICED', 'NO_STRUCTURAL_QUANTITIES']));
  });
  it('level 1 ignores refined answers', () => {
    const i = threeFloors({ level: 1 });
    i.refined = { ...i.refined, cantilevers: 'yes', siteDifficulties: ['demolition'] };
    expect(calculateEstimate(i, rb(), NOW).status).toBe('complete');
  });
});

describe('Different buildings', () => {
  it('different floor counts and areas, roof annex priced at the selected rate', () => {
    const i = threeFloors();
    i.floors.ground.area = '300';
    i.floors.first.area = '280';
    i.floors.second.enabled = false;
    i.floors.roofAnnex = { enabled: true, area: '80', rateOverride: '' };
    const r = calculateEstimate(i, rb(), NOW);
    expect(r.areas.aboveGround).toBe(660);
    expect(r.construction!.mid).toBe(660 * 150);
    expect(r.floors.map((f) => f.key)).toEqual(['ground', 'first', 'roofAnnex']);
  });
  it('zero area on an enabled floor is not an error by itself but no above-ground area is', () => {
    const i = threeFloors();
    i.floors.second.area = '0';
    expect(calculateEstimate(i, rb(), NOW).areas.aboveGround).toBe(640);
  });
  it('currency formatting', () => {
    expect(fmtNum(170600, 0)).toBe('170,600');
    expect(fmtNum(190.625)).toBe('190.625');
  });
});

describe('Traceability, reproducibility and migration', () => {
  it('every rate used is traceable', () => {
    const book = withRate(rb(), { rate_id: 'B-1', category: 'basement', scope: 'basement', grade: 'any', grade_system: 'none', price_low: 220, price_mid: 240, price_high: 260, source: 'Sub Q-7', source_date: '2026-10-01' });
    const i = threeFloors();
    i.basement = { ...i.basement, enabled: true, area: '300', pricingMode: 'library', rateId: 'B-1', shoring: 'no', groundwater: 'none' };
    const r = calculateEstimate(i, book, NOW);
    expect(ratesUsedBy(i, r, book).map((x) => x.rate_id).sort()).toEqual(['B-1', 'VR-02']);
    expect(line(r, 'basement').basisBy.low).toMatchObject({ rate: 220, result: 66000, source: 'B-1' });
  });

  it('a saved estimate is reproduced exactly after the ratebook changes', () => {
    const input = varndaExampleInput();
    const book = rb();
    const original = calculateEstimate(input, book, NOW);
    const saved = parseSavedEstimate(JSON.stringify(makeSaved(input, original, book)));
    const vr = book.rates.find((x) => x.rate_id === 'VR-02')!;
    const changed: Ratebook = upsertRate(book, { ...vr, price_mid: 160, price_high: 180 }, NOW);
    expect(calculateEstimate(saved.input, changed, NOW).ownerTotal).not.toEqual(original.ownerTotal);
    const reproduced = calculateEstimate(saved.input, ratebookWithSnapshot(changed, saved), NOW);
    expect(reproduced.ownerTotal).toEqual(original.ownerTotal);
    expect(reproduced.lines).toEqual(original.lines);
  });

  it('V1 inputs migrate without changing numbers', () => {
    const v1 = { ...threeFloors(), additions: [{ id: 'a', key: 'kitchen', description: 'Kitchen', unit: 'no.', quantity: '1', rate: '15000', includedInBaseline: true, standardAllowance: '6000', source: 'q', enabled: true }] } as unknown as Record<string, unknown>;
    delete v1.level;
    delete v1.refined;
    const m = migrateInput(v1);
    expect(m.level).toBe(1);
    expect(m.additions[0]).toMatchObject({ status: 'upgrade', standardAllowance: '6000', rate: '15000' });
    expect(calculateEstimate(m, rb(), NOW).construction!.mid).toBe(144000 + 9000);
  });

  it('V1 ratebooks migrate to V2 without changing prices', () => {
    const v1 = JSON.parse(JSON.stringify(rb()));
    v1.schema_version = 1;
    v1.ratebook_version = 1;
    v1.rates = v1.rates.map((r: Record<string, unknown>) => ({ rate_id: r.rate_id, category: r.category, scope: r.scope, grade: r.grade, grade_system: r.grade_system, label_en: r.label_en, label_ar: r.label_ar, unit: r.unit, price_low: r.price_low, price_mid: r.price_mid, price_high: r.price_high, currency: 'KWD', price_basis: r.price_basis, source: r.source, source_url: r.source_url, source_date: r.source_date, valid_until: '', quote_ref: '', approval_status: r.approval_status, inclusions: '', exclusions: '', notes: '', version: 1, active: true }));
    const m = migrateRatebook(v1);
    expect(validateRatebook(m)).toBeNull();
    expect(m.schema_version).toBe(2);
    expect(m.rates.map((r) => r.price_mid)).toEqual(rb().rates.map((r) => r.price_mid));
    expect(m.rates[0].evidence_status).toBe('verified_published_claim');
    expect(m.changelog[0].action).toBe('migrate');
  });

  it('Alhisba observations never enter the ratebook', () => {
    expect(rb().rates.some((r) => /alhisba/i.test(r.source) || r.price_mid === 190.625)).toBe(false);
  });
});

import { absolutePercentageError, calibrationCsv, calibrationStats, normalisedActual } from '../../src/calculators/calibration';
import type { CalibrationProject } from '../../src/types';

describe('Calibration (Phase 11)', () => {
  const p = (o: Partial<CalibrationProject>): CalibrationProject => ({
    id: 'P', name: 'P', location: '', date: '', builtUpArea: '', floors: '', basement: false, specification: '', contractorScope: 'turnkey',
    initialEstimate: '', awardedValue: '', finalCost: '', unrelatedVariations: '', scopeAdjustment: '', priceSources: '', notes: '', ...o,
  });
  it('removes unrelated variations before computing APE', () => {
    const x = p({ initialEstimate: '180000', finalCost: '210000', unrelatedVariations: '10000' });
    expect(normalisedActual(x)).toBe(200000);
    expect(absolutePercentageError(x)).toBe(10);
  });
  it('applies signed scope adjustments', () => {
    expect(normalisedActual(p({ finalCost: '200000', scopeAdjustment: '-5000' }))).toBe(195000);
  });
  it('no statistics without data', () => {
    expect(calibrationStats([])).toBeNull();
    expect(calibrationStats([p({ initialEstimate: '100000' })])).toBeNull();
  });
  it('mean / median over complete projects only, flagged insufficient below 10', () => {
    const s = calibrationStats([
      p({ initialEstimate: '110', finalCost: '100' }), p({ initialEstimate: '80', finalCost: '100' }), p({ initialEstimate: '100', finalCost: '100' }), p({ initialEstimate: '1' }),
    ])!;
    expect(s).toEqual({ n: 3, mean: 10, median: 10, sufficient: false });
  });
  it('CSV export includes computed columns', () => {
    expect(calibrationCsv([p({ initialEstimate: '110', finalCost: '100' })]).split('\n')[1]).toMatch(/"100","10"$/);
  });
});

describe('Building-ratio information (unverified press figure)', () => {
  it('informs above max(210% of plot, 960 m²) without changing the price', () => {
    // 400 m² plot: limit = max(840, 960) = 960 → the 960 m² example is not flagged
    expect(calculateEstimate(threeFloors({ plotArea: '400' }), rb(), NOW).issues.some((x) => x.code === 'BUILD_RATIO_CHECK')).toBe(false);
    const i = threeFloors({ plotArea: '400' });
    i.floors.ground.area = '350'; i.floors.first.area = '350'; i.floors.second.area = '300';
    const r = calculateEstimate(i, rb(), NOW);
    expect(r.issues.find((x) => x.code === 'BUILD_RATIO_CHECK')).toMatchObject({ severity: 'info', params: { pct: 250 } });
    expect(r.status).toBe('complete');
    expect(r.construction!.mid).toBe(1000 * 150);
    // 600 m² plot: limit = 1,260 m²
    const j = threeFloors({ plotArea: '600' });
    j.floors.ground.area = '420'; j.floors.first.area = '420'; j.floors.second.area = '420';
    expect(calculateEstimate(j, rb(), NOW).issues.some((x) => x.code === 'BUILD_RATIO_CHECK')).toBe(false);
  });
});
