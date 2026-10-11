import { D, roundKwd } from '../lib/decimal';
import { IssueCollector } from '../validation/parse';
import type { BudgetLine, EstimateInput, EstimateResult, Ratebook, Triple, UnpricedItem } from '../types';
import { areasToSummary, parseAreas } from './buildingArea';
import { resolveBuildingRate } from './rateSelection';
import { aboveGroundBase, triAdd, triNum, triScalar, triZero, type Tri } from './quickEstimate';
import { estimateBasement } from './basementEstimate';
import { estimateAdditions } from './optionalItems';

export const ENGINE_VERSION = '1.0.0';
export const ROUNDING_RULE = 'Each budget line is rounded once to the nearest whole KWD (half-up); every total is the exact sum of its rounded lines.';

const pctOf = (base: Tri, pct: ReturnType<typeof D>): Tri => ({
  low: roundKwd(base.low.times(pct).dividedBy(100)),
  mid: roundKwd(base.mid.times(pct).dividedBy(100)),
  high: roundKwd(base.high.times(pct).dividedBy(100)),
});

/**
 * Main deterministic estimate.
 *
 *   E  Adjusted construction = above-ground base + basement + net additions/credits
 *   F  Owner total           = adjusted construction + owner-direct purchases + design/supervision
 *                              + fixed fees + contingency
 *
 * Design and contingency are percentages of an explicit base (`fees.percentBase`):
 *   'construction'      → adjusted construction (Urban default)
 *   'above_ground_base' → above-ground base only (the convention of Varnda's published example)
 * Fees/percentages default to zero; nothing is assumed to be a mandatory Kuwait charge.
 */
export function calculateEstimate(input: EstimateInput, rb: Ratebook, now: Date = new Date()): EstimateResult {
  const c = new IssueCollector();
  const unpriced: UnpricedItem[] = [];

  // Recorded but never used to change the price (no calibrated coefficients exist).
  const plot = c.num(input.plotArea, 'plotArea');
  if (plot === null || plot.isZero()) {
    if (!c.issues.some((i) => i.field === 'plotArea')) c.add({ code: 'PLOT_REQUIRED', severity: 'error', field: 'plotArea' });
  }
  c.num(input.floorHeight, 'floorHeight');
  if (input.location.trim()) c.add({ code: 'LOCATION_NOT_PRICED', severity: 'info' });
  if (input.floorHeight.trim()) c.add({ code: 'HEIGHT_NOT_PRICED', severity: 'info' });

  const areas = parseAreas(input, c);
  if (plot && !plot.isZero()) {
    const ground = areas.perFloor.find((f) => f.key === 'ground');
    if (ground && ground.area.gt(plot)) c.add({ code: 'GROUND_EXCEEDS_PLOT', severity: 'warning', field: 'floors.ground.area' });
    const roof = areas.perFloor.find((f) => f.key === 'roofAnnex');
    if (roof && (roof.area.gte(plot) || (ground && roof.area.gte(ground.area)))) {
      c.add({ code: 'ROOF_ANNEX_LARGE', severity: 'warning', field: 'floors.roofAnnex.area' });
    }
  }

  const rate = resolveBuildingRate(input, rb, c, now);
  const additions = estimateAdditions(input, c, unpriced);
  const basement = estimateBasement(input, areas, rb, c, unpriced, additions.pricedKeys, now);

  const f = input.fees;
  const designPct = c.num(f.designPct, 'fees.designPct') ?? D(0);
  const contPct = c.num(f.contingencyPct, 'fees.contingencyPct') ?? D(0);
  const fixedFees = roundKwd(c.num(f.fixedFees, 'fees.fixedFees') ?? D(0));
  if (designPct.gt(100)) c.add({ code: 'PCT_TOO_HIGH', severity: 'error', field: 'fees.designPct' });
  if (contPct.gt(100)) c.add({ code: 'PCT_TOO_HIGH', severity: 'error', field: 'fees.contingencyPct' });

  let ownerDirect = D(0);
  input.ownerDirect.forEach((o) => {
    const v = c.num(o.amount, `ownerDirect.${o.id}.amount`);
    if (v !== null) ownerDirect = ownerDirect.plus(roundKwd(v));
  });

  const blocked = c.hasErrors || rate === null;
  const meta = {
    engineVersion: ENGINE_VERSION,
    ratebookVersion: rb.ratebook_version,
    calculatedAt: now.toISOString(),
    rounding: ROUNDING_RULE,
  };
  const empty: Omit<EstimateResult, 'status' | 'issues' | 'unpriced' | 'meta'> = {
    areas: areasToSummary(areas),
    floors: [],
    rate: rate?.selected ?? null,
    basementCost: null,
    basementMode: input.basement.enabled ? input.basement.pricingMode : 'not_applicable',
    additions: additions.items,
    lines: [],
    construction: null,
    feesAndContingency: null,
    ownerTotal: null,
    typicalRatePerM2: null,
  };
  if (blocked) {
    return { ...empty, status: 'blocked', issues: c.issues, unpriced, meta };
  }

  const ag = aboveGroundBase(input, areas, rate, c);
  const lines: BudgetLine[] = [];
  lines.push({
    key: 'above_ground',
    group: 'construction',
    amount: triNum(ag.base),
    basis: ag.uniform ? 'area_x_rate' : 'floor_rates',
    basisParams: { area: areas.aboveGround.toNumber(), rate: rate.mid.toNumber(), low: rate.low.toNumber(), high: rate.high.toNumber() },
  });

  let construction: Tri = ag.base;
  if (basement && basement.cost) {
    lines.push({ key: 'basement', group: 'construction', amount: triNum(basement.cost), basis: basement.basis, basisParams: basement.basisParams });
    construction = triAdd(construction, basement.cost);
  }
  if (additions.anyEnabled) {
    const add = triScalar(additions.netTotal);
    lines.push({
      key: 'additions',
      group: 'construction',
      amount: triNum(add),
      basis: 'net_additions',
      basisParams: { count: additions.items.filter((i) => i.priced).length },
    });
    construction = triAdd(construction, add);
  }

  if (construction.low.isNegative() || construction.mid.isNegative()) {
    c.add({ code: 'NEGATIVE_CONSTRUCTION', severity: 'error' });
    return { ...empty, status: 'blocked', issues: c.issues, unpriced, meta };
  }

  const pctBase = f.percentBase === 'above_ground_base' ? ag.base : construction;
  const pctBaseLabel = f.percentBase === 'above_ground_base' ? 'above_ground' : 'construction';
  const design = pctOf(pctBase, designPct);
  const contingency = pctOf(pctBase, contPct);
  const fees = triScalar(fixedFees);
  const owner = triScalar(ownerDirect);

  if (!ownerDirect.isZero()) lines.push({ key: 'owner_direct', group: 'owner', amount: triNum(owner), basis: 'owner_direct', basisParams: { count: input.ownerDirect.length } });
  if (!designPct.isZero()) lines.push({ key: 'design', group: 'owner', amount: triNum(design), basis: 'pct', basisParams: { pct: designPct.toNumber(), base: pctBaseLabel, baseMid: pctBase.mid.toNumber() } });
  if (!fixedFees.isZero()) lines.push({ key: 'fixed_fees', group: 'owner', amount: triNum(fees), basis: 'fixed', basisParams: { label: f.fixedFeesLabel } });
  if (!contPct.isZero()) lines.push({ key: 'contingency', group: 'owner', amount: triNum(contingency), basis: 'pct', basisParams: { pct: contPct.toNumber(), base: pctBaseLabel, baseMid: pctBase.mid.toNumber() } });

  const feesAndCont = triAdd(triAdd(design, contingency), fees);
  const ownerTotal = triAdd(triAdd(construction, owner), feesAndCont);

  const status = unpriced.length > 0 ? 'partial' : 'complete';
  if (status === 'partial') c.add({ code: 'PARTIAL_ESTIMATE', severity: 'warning', params: { count: unpriced.length } });

  const result: EstimateResult = {
    ...empty,
    status,
    issues: c.issues,
    unpriced,
    floors: ag.floors,
    basementCost: basement?.cost ? triNum(basement.cost) : null,
    lines,
    construction: triNum(construction),
    feesAndContingency: triNum(feesAndCont),
    ownerTotal: triNum(ownerTotal),
    // Divide only by the area that is actually priced: an unpriced basement must not dilute the rate.
    typicalRatePerM2: (() => {
      const pricedArea = basement && !basement.cost ? areas.aboveGround : areas.total;
      return pricedArea.isZero() ? null : construction.mid.dividedBy(pricedArea).toDecimalPlaces(2).toNumber();
    })(),
    meta,
  };
  assertReconciles(result);
  return result;
}

/** Every completed budget must reconcile exactly: lines → construction, lines → owner total. Throws otherwise. */
export function assertReconciles(r: EstimateResult): void {
  if (!r.ownerTotal || !r.construction) return;
  for (const k of ['low', 'mid', 'high'] as (keyof Triple)[]) {
    const cons = r.lines.filter((l) => l.group === 'construction').reduce((s, l) => s.plus(l.amount[k]), D(0));
    const all = r.lines.reduce((s, l) => s.plus(l.amount[k]), D(0));
    if (!cons.eq(r.construction[k]) || !all.eq(r.ownerTotal[k])) {
      throw new Error(`Reconciliation failure (${k}): lines ${all.toString()} vs total ${r.ownerTotal[k]}`);
    }
  }
}

export { triZero };
