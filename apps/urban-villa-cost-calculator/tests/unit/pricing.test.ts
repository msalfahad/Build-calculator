import { describe, expect, it } from 'vitest';
import { assertReconciles, calculateEstimate, candidateRates } from '../../src/calculators';
import { newAddition } from '../../src/lib/defaults';
import type { EstimateResult } from '../../src/types';
import { NOW, codes, rb, threeFloors, withRate } from './helpers';

const reconcile = (r: EstimateResult) => {
  for (const k of ['low', 'mid', 'high'] as const) {
    const sum = r.lines.reduce((s, l) => s + l.amount[k], 0);
    expect(sum).toBe(r.ownerTotal![k]);
  }
};

describe('Pricing', () => {
  it('finishing-grade selection updates the selected rate', () => {
    const mids = (['basic', 'medium', 'good', 'luxury', 'ultra'] as const).map(
      (grade) => calculateEstimate(threeFloors({ grade }), rb(), NOW).rate!.mid,
    );
    expect(mids).toEqual([125, 150, 175, 240, 360]);
  });

  it('low / mid / high estimates use low / mid / high rates', () => {
    const r = calculateEstimate(threeFloors({ grade: 'medium' }), rb(), NOW);
    expect(r.construction).toEqual({ low: 960 * 135, mid: 960 * 150, high: 960 * 170 });
  });

  it('grade does not change areas (no structural quantity inflation)', () => {
    const a = calculateEstimate(threeFloors({ grade: 'basic' }), rb(), NOW);
    const b = calculateEstimate(threeFloors({ grade: 'ultra' }), rb(), NOW);
    expect(a.areas).toEqual(b.areas);
  });

  it('structure-only uses structure-only rates', () => {
    const book = withRate(rb(), { rate_id: 'U-STR-MED', scope: 'structure', grade: 'medium', grade_system: 'urban', price_low: 60, price_mid: 65, price_high: 70, approval_status: 'urban_approved', source_date: '2026-10-01' });
    const r = calculateEstimate(threeFloors({ scope: 'structure' }), book, NOW);
    expect(r.rate!.rate_id).toBe('U-STR-MED');
    expect(r.construction!.mid).toBe(960 * 65);
    expect(codes(r.issues)).not.toContain('RATE_NOT_APPROVED');
  });

  it('turnkey rates are never silently reused for structure-only or finishing-only', () => {
    for (const scope of ['structure', 'finishing'] as const) {
      const r = calculateEstimate(threeFloors({ scope }), rb(), NOW);
      expect(r.status).toBe('blocked');
      expect(r.ownerTotal).toBeNull();
      expect(codes(r.issues)).toContain('SCOPE_UNPRICED');
      expect(candidateRates(rb(), scope, 'medium')).toHaveLength(0);
    }
  });

  it('explicitly selecting a turnkey rate for structure scope is blocked', () => {
    const i = threeFloors({ scope: 'structure' });
    i.rateSelection = { ...i.rateSelection, mode: 'library', rateId: 'VR-02' };
    const r = calculateEstimate(i, rb(), NOW);
    expect(r.status).toBe('blocked');
    expect(codes(r.issues)).toContain('RATE_SCOPE_MISMATCH');
  });

  it('a manual rate unblocks an unpriced scope and is labelled provisional', () => {
    const i = threeFloors({ scope: 'finishing' });
    i.rateSelection = { ...i.rateSelection, mode: 'manual', manualMid: '80' };
    const r = calculateEstimate(i, rb(), NOW);
    expect(r.status).toBe('complete');
    expect(r.construction).toEqual({ low: 76800, mid: 76800, high: 76800 });
    expect(r.rate!.approval_status).toBe('user_provisional');
    expect(codes(r.issues)).toContain('MANUAL_RATE_PROVISIONAL');
  });

  it('missing manual rate blocks the calculation', () => {
    const i = threeFloors();
    i.rateSelection = { ...i.rateSelection, mode: 'manual', manualMid: '' };
    const r = calculateEstimate(i, rb(), NOW);
    expect(r.status).toBe('blocked');
    expect(codes(r.issues)).toContain('MANUAL_RATE_REQUIRED');
  });

  it('inactive rates cannot be used', () => {
    const book = rb();
    book.rates.find((r) => r.rate_id === 'VR-02')!.active = false;
    const r = calculateEstimate(threeFloors(), book, NOW);
    expect(r.status).toBe('blocked');
    const i = threeFloors();
    i.rateSelection = { ...i.rateSelection, mode: 'library', rateId: 'VR-02' };
    expect(codes(calculateEstimate(i, book, NOW).issues)).toContain('RATE_INACTIVE');
  });

  it('auto selection prefers an Urban-approved rate over a published benchmark', () => {
    const book = withRate(rb(), { rate_id: 'U-TK-MED', scope: 'turnkey', grade: 'medium', grade_system: 'urban', price_low: 140, price_mid: 155, price_high: 165, approval_status: 'urban_approved', source_date: '2026-09-01' });
    expect(calculateEstimate(threeFloors(), book, NOW).rate!.rate_id).toBe('U-TK-MED');
  });

  it('stale rates produce a warning', () => {
    const book = rb();
    book.rates.find((r) => r.rate_id === 'VR-02')!.source_date = '2024-01-01';
    expect(codes(calculateEstimate(threeFloors(), book, NOW).issues)).toContain('RATE_STALE');
  });

  it('material-only rates are disclosed', () => {
    const book = rb();
    book.rates.find((r) => r.rate_id === 'VR-02')!.price_basis = 'material_only';
    expect(codes(calculateEstimate(threeFloors(), book, NOW).issues)).toContain('MATERIAL_ONLY_RATE');
  });

  it('floor-specific rate overrides apply only to that floor', () => {
    const i = threeFloors();
    i.floors.second.rateOverride = '200';
    const r = calculateEstimate(i, rb(), NOW);
    expect(r.construction!.mid).toBe(640 * 150 + 320 * 200);
    expect(codes(r.issues)).toContain('FLOOR_RATE_OVERRIDE');
  });

  it('investment property is not priced from villa rates', () => {
    const r = calculateEstimate(threeFloors({ propertyType: 'investment' }), rb(), NOW);
    expect(r.status).toBe('blocked');
    expect(codes(r.issues)).toContain('INVESTMENT_NOT_SUPPORTED');
  });
});

describe('Basement', () => {
  const withBasement = () => {
    const i = threeFloors();
    i.basement = { ...i.basement, enabled: true, area: '300', shoring: 'no', groundwater: 'none' };
    return i;
  };

  it('does not receive an invented rate: shown as unpriced, estimate partial', () => {
    const r = calculateEstimate(withBasement(), rb(), NOW);
    expect(r.status).toBe('partial');
    expect(r.basementCost).toBeNull();
    expect(r.unpriced.map((u) => u.code)).toContain('BASEMENT_UNPRICED');
    expect(r.lines.find((l) => l.key === 'basement')).toBeUndefined();
    // above-ground rate was NOT applied to the basement
    expect(r.construction!.mid).toBe(144000);
    // the unpriced basement area does not dilute the typical rate
    expect(r.typicalRatePerM2).toBe(150);
  });

  it('manual basement rate priced separately and labelled provisional', () => {
    const i = withBasement();
    i.basement = { ...i.basement, pricingMode: 'rate', rate: '230', includes: ['excavation', 'structure', 'waterproofing'] };
    const r = calculateEstimate(i, rb(), NOW);
    expect(r.status).toBe('complete');
    expect(r.basementCost).toEqual({ low: 69000, mid: 69000, high: 69000 });
    expect(r.construction!.mid).toBe(144000 + 69000);
    expect(r.typicalRatePerM2).toBe(169.05); // 213,000 / 1,260
    expect(codes(r.issues)).toContain('BASEMENT_PROVISIONAL');
    expect(codes(r.issues)).toContain('BASEMENT_EXCLUSIONS');
  });

  it('basement package allowance', () => {
    const i = withBasement();
    i.basement = { ...i.basement, pricingMode: 'allowance', allowance: '55000' };
    expect(calculateEstimate(i, rb(), NOW).basementCost!.mid).toBe(55000);
  });

  it('rate mode with blank rate blocks', () => {
    const i = withBasement();
    i.basement = { ...i.basement, pricingMode: 'rate', rate: '' };
    expect(codes(calculateEstimate(i, rb(), NOW).issues)).toContain('BASEMENT_RATE_REQUIRED');
  });

  it('required shoring / dewatering not in the package become unpriced items', () => {
    const i = withBasement();
    i.basement = { ...i.basement, pricingMode: 'rate', rate: '230', shoring: 'yes', groundwater: 'concerns', includes: [] };
    const r = calculateEstimate(i, rb(), NOW);
    expect(r.status).toBe('partial');
    expect(r.unpriced.map((u) => u.code)).toEqual(['SHORING_UNPRICED', 'DEWATERING_UNPRICED']);
  });

  it('shoring included in the package is not added again', () => {
    const i = withBasement();
    i.basement = { ...i.basement, pricingMode: 'rate', rate: '230', shoring: 'yes', groundwater: 'none', includes: ['shoring'] };
    const r = calculateEstimate(i, rb(), NOW);
    expect(r.status).toBe('complete');
    expect(r.unpriced).toHaveLength(0);
  });

  it('shoring priced as an optional addition satisfies the requirement', () => {
    const i = withBasement();
    const s = { ...newAddition('shoring', 'turnkey'), quantity: '200', rate: '50', source: 'Quote Q-1' };
    i.additions = [s];
    i.basement = { ...i.basement, pricingMode: 'rate', rate: '230', shoring: 'yes' };
    const r = calculateEstimate(i, rb(), NOW);
    expect(r.status).toBe('complete');
    expect(r.construction!.mid).toBe(144000 + 69000 + 10000);
  });

  it('missing basement area is an error', () => {
    const i = threeFloors();
    i.basement = { ...i.basement, enabled: true, area: '' };
    expect(codes(calculateEstimate(i, rb(), NOW).issues)).toContain('BASEMENT_AREA_REQUIRED');
  });
});

describe('Optional additions, owner-direct and final budget', () => {
  it('item cost = quantity × rate', () => {
    const i = threeFloors();
    i.additions = [{ ...newAddition('elevator', 'turnkey'), rate: '12000', source: 'Supplier quote' }];
    const r = calculateEstimate(i, rb(), NOW);
    expect(r.additions[0].net).toBe(12000);
    expect(r.construction!.mid).toBe(156000);
  });

  it('upgrade charges subtract the included standard allowance (no double counting)', () => {
    const i = threeFloors();
    const k = newAddition('kitchen', 'turnkey');
    expect(k.status).toBe('extra'); // V2: no assumed inclusion without documented scope data
    i.additions = [{ ...k, status: 'upgrade', rate: '15000', standardAllowance: '6000', source: 'Showroom quote' }];
    const r = calculateEstimate(i, rb(), NOW);
    expect(r.additions[0]).toMatchObject({ gross: 15000, allowance: 6000, net: 9000 });
    expect(r.construction!.mid).toBe(144000 + 9000);
  });

  it('included item without a known allowance is unpriced (not full cost, not zero)', () => {
    const i = threeFloors();
    i.additions = [{ ...newAddition('kitchen', 'turnkey'), status: 'upgrade', rate: '15000' }];
    const r = calculateEstimate(i, rb(), NOW);
    expect(r.status).toBe('partial');
    expect(r.unpriced[0].code).toBe('ADDITION_ALLOWANCE_MISSING');
    expect(r.construction!.mid).toBe(144000);
  });

  it('unknown addition rates are unpriced, not zero', () => {
    const i = threeFloors();
    i.additions = [newAddition('pool', 'turnkey')];
    const r = calculateEstimate(i, rb(), NOW);
    expect(r.status).toBe('partial');
    expect(r.unpriced[0].code).toBe('ADDITION_UNPRICED');
    expect(r.additions[0].priced).toBe(false);
  });

  it('downgrade below allowance yields a credit', () => {
    const i = threeFloors();
    i.additions = [{ ...newAddition('kitchen', 'turnkey'), status: 'upgrade', rate: '4000', standardAllowance: '6000', source: 'q' }];
    const r = calculateEstimate(i, rb(), NOW);
    expect(r.additions[0].net).toBe(-2000);
    expect(r.construction!.mid).toBe(142000);
  });

  it('owner-direct purchases are counted once, outside construction and outside % bases', () => {
    const i = threeFloors();
    i.ownerDirect = [{ id: 'o1', description: 'Furniture', amount: '20000' }];
    i.fees = { ...i.fees, designPct: '10', contingencyPct: '5' };
    const r = calculateEstimate(i, rb(), NOW);
    expect(r.construction!.mid).toBe(144000);
    expect(r.lines.filter((l) => l.key === 'owner_direct')).toHaveLength(1);
    expect(r.ownerTotal!.mid).toBe(144000 + 20000 + 14400 + 7200);
    reconcile(r);
  });

  it('percentage base is explicit: construction vs above-ground base', () => {
    const i = threeFloors();
    i.additions = [{ ...newAddition('elevator', 'turnkey'), rate: '10000', source: 'q' }];
    i.fees = { ...i.fees, designPct: '10', percentBase: 'construction' };
    expect(calculateEstimate(i, rb(), NOW).lines.find((l) => l.key === 'design')!.amount.mid).toBe(15400);
    i.fees.percentBase = 'above_ground_base';
    expect(calculateEstimate(i, rb(), NOW).lines.find((l) => l.key === 'design')!.amount.mid).toBe(14400);
  });

  it('fees default to zero — nothing assumed mandatory', () => {
    const r = calculateEstimate(threeFloors(), rb(), NOW);
    expect(r.ownerTotal!.mid).toBe(144000);
    expect(r.lines.map((l) => l.key)).toEqual(['above_ground']);
  });

  it('rounding never breaks reconciliation', () => {
    const i = threeFloors();
    i.floors.ground.area = '321.37';
    i.floors.first.area = '287.15';
    i.rateSelection = { ...i.rateSelection, mode: 'manual', manualLow: '133.33', manualMid: '151.17', manualHigh: '169.99' };
    i.ownerDirect = [{ id: 'o', description: 'x', amount: '1234.567' }];
    i.fees = { designPct: '7.77', contingencyPct: '6.66', fixedFees: '4999.5', fixedFeesLabel: '', percentBase: 'construction' };
    i.additions = [{ ...newAddition('landscaping', 'turnkey'), quantity: '33.3', rate: '17.77', source: 'q' }];
    const r = calculateEstimate(i, rb(), NOW);
    expect(r.status).toBe('complete');
    reconcile(r);
    expect(() => assertReconciles(r)).not.toThrow();
    for (const l of r.lines) for (const v of Object.values(l.amount)) expect(Number.isInteger(v)).toBe(true);
  });

  it('every completed budget reconciles (sweep)', () => {
    for (const grade of ['basic', 'medium', 'good', 'luxury', 'ultra'] as const) {
      for (const pct of ['0', '3.3', '8', '12.5']) {
        const i = threeFloors({ grade });
        i.fees = { designPct: pct, contingencyPct: pct, fixedFees: '777', fixedFeesLabel: '', percentBase: 'construction' };
        reconcile(calculateEstimate(i, rb(), NOW));
      }
    }
  });

  it('assertReconciles detects a tampered total', () => {
    const r = calculateEstimate(threeFloors(), rb(), NOW);
    r.ownerTotal!.mid += 1;
    expect(() => assertReconciles(r)).toThrow(/Reconciliation/);
  });
});
