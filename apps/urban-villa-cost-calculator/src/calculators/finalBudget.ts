import { D, roundKwd } from '../lib/decimal';
import { IssueCollector } from '../validation/parse';
import type { BasisParams, BudgetLine, EstimateInput, EstimateResult, Ratebook, Scenario, Triple, UnpricedItem } from '../types';
import { Dec } from '../lib/decimal';
import { evaluateRefined } from './refinedEstimate';
import { areasToSummary, parseAreas } from './buildingArea';
import { resolveBuildingRate } from './rateSelection';
import { aboveGroundBase, triAdd, triNum, triScalar, triZero, type Tri } from './quickEstimate';
import { estimateBasement } from './basementEstimate';
import { estimateAdditions } from './optionalItems';

export const ENGINE_VERSION = '2.0.0';
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
    // Press reports (unverified, see docs/research MUN-01/02) cite a 210% building ratio for private plots.
    // Information only: never blocks or changes the price.
    // Reported form: 210% of plot or 960 m², whichever is greater.
    if (areas.aboveGround.gt(Dec.max(plot.times('2.1'), 960))) c.add({ code: 'BUILD_RATIO_CHECK', severity: 'info', params: { pct: areas.aboveGround.dividedBy(plot).times(100).toDecimalPlaces(0).toNumber() } });
    const roof = areas.perFloor.find((f) => f.key === 'roofAnnex');
    if (roof && (roof.area.gte(plot) || (ground && roof.area.gte(ground.area)))) {
      c.add({ code: 'ROOF_ANNEX_LARGE', severity: 'warning', field: 'floors.roofAnnex.area' });
    }
  }

  const rate = resolveBuildingRate(input, rb, c, now);
  const additions = estimateAdditions(input, c, unpriced, rate?.source ?? null);
  const basement = estimateBasement(input, areas, rb, c, unpriced, additions.pricedKeys, now);
  evaluateRefined(input, c, unpriced, additions.pricedKeys);

  const f = input.fees;
  const designPct = c.num(f.designPct, 'fees.designPct') ?? D(0);
  const contPct = c.num(f.contingencyPct, 'fees.contingencyPct') ?? D(0);
  const fixedFees = roundKwd(c.num(f.fixedFees, 'fees.fixedFees') ?? D(0));
  if (designPct.gt(100)) c.add({ code: 'PCT_TOO_HIGH', severity: 'error', field: 'fees.designPct' });
  if (contPct.gt(100)) c.add({ code: 'PCT_TOO_HIGH', severity: 'error', field: 'fees.contingencyPct' });

  let ownerDirectList = D(0);
  input.ownerDirect.forEach((o) => {
    const v = c.num(o.amount, `ownerDirect.${o.id}.amount`);
    if (v !== null) ownerDirectList = ownerDirectList.plus(roundKwd(v));
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
    rangeAvailable: rate?.selected.rangeAvailable ?? false,
    basementCost: null,
    basementMode: input.basement.enabled ? input.basement.pricingMode : 'not_applicable',
    additions: additions.items,
    lines: [],
    construction: null,
    ownerAdditional: null,
    feesAndContingency: null,
    ownerTotal: null,
    typicalRatePerM2: null,
  };
  if (blocked) {
    return { ...empty, status: 'blocked', issues: c.issues, unpriced, meta };
  }

  const ag = aboveGroundBase(input, areas, rate, c);
  const lines: BudgetLine[] = [];
  const scalarBasis = (p: BasisParams): Record<Scenario, BasisParams> => ({ low: p, mid: p, high: p });

  // Each scenario's formula uses that scenario's own rate and result.
  const agBasis = (k: Scenario): BasisParams =>
    ag.uniform
      ? { area: areas.aboveGround.toNumber(), rate: rate[k].toNumber(), result: ag.base[k].toNumber() }
      : { result: ag.base[k].toNumber() };
  lines.push({
    key: 'above_ground',
    group: 'construction',
    kind: 'area_rate',
    amount: triNum(ag.base),
    basis: ag.uniform ? 'area_x_rate' : 'floor_rates',
    basisBy: { low: agBasis('low'), mid: agBasis('mid'), high: agBasis('high') },
  });

  let construction: Tri = ag.base;
  if (basement && basement.cost) {
    lines.push({ key: 'basement', group: 'construction', kind: basement.kind, amount: triNum(basement.cost), basis: basement.basis, basisBy: basement.basisBy });
    construction = triAdd(construction, basement.cost);
  }
  if (additions.anyCalculated) {
    const add = triScalar(additions.netCalculated);
    lines.push({
      key: 'additions', group: 'construction', kind: 'calculated', amount: triNum(add), basis: 'net_additions',
      basisBy: scalarBasis({ count: additions.counts.calculated, result: additions.netCalculated.toNumber() }),
    });
    construction = triAdd(construction, add);
  }
  if (additions.anyProvisional) {
    const pa = triScalar(additions.provisional);
    lines.push({
      key: 'allowances', group: 'construction', kind: 'allowance', amount: triNum(pa), basis: 'provisional',
      basisBy: scalarBasis({ count: additions.counts.provisional, result: additions.provisional.toNumber() }),
    });
    construction = triAdd(construction, pa);
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
  const ownerDirect = ownerDirectList.plus(additions.ownerDirect);
  const owner = triScalar(ownerDirect);
  const pctBasis = (pct: Dec, out: Tri): Record<Scenario, BasisParams> => {
    const b = (k: Scenario): BasisParams => ({ pct: pct.toNumber(), base: pctBaseLabel, baseAmt: pctBase[k].toNumber(), result: out[k].toNumber() });
    return { low: b('low'), mid: b('mid'), high: b('high') };
  };

  if (!ownerDirect.isZero()) {
    lines.push({
      key: 'owner_direct', group: 'owner', kind: 'owner', amount: triNum(owner), basis: 'owner_direct',
      basisBy: scalarBasis({ count: input.ownerDirect.length + additions.counts.owner, result: ownerDirect.toNumber() }),
    });
  }
  if (!designPct.isZero()) lines.push({ key: 'design', group: 'owner', kind: 'percentage', amount: triNum(design), basis: 'pct', basisBy: pctBasis(designPct, design) });
  if (!fixedFees.isZero()) {
    lines.push({
      key: 'fixed_fees', group: 'owner', kind: 'fixed', amount: triNum(fees), basis: 'fixed',
      basisBy: scalarBasis({ label: f.fixedFeesLabel, result: fixedFees.toNumber() }),
    });
  }
  if (!contPct.isZero()) lines.push({ key: 'contingency', group: 'owner', kind: 'percentage', amount: triNum(contingency), basis: 'pct', basisBy: pctBasis(contPct, contingency) });

  const feesAndCont = triAdd(triAdd(design, contingency), fees);
  const ownerAdditional = triAdd(feesAndCont, owner);
  const ownerTotal = triAdd(construction, ownerAdditional);

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
    ownerAdditional: triNum(ownerAdditional),
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
    const own = r.lines.filter((l) => l.group === 'owner').reduce((s, l) => s.plus(l.amount[k]), D(0));
    if (r.ownerAdditional && !own.eq(r.ownerAdditional[k])) throw new Error(`Reconciliation failure (${k}): owner lines ${own.toString()} vs ${r.ownerAdditional[k]}`);
    if (!cons.eq(r.construction[k]) || !all.eq(r.ownerTotal[k])) {
      throw new Error(`Reconciliation failure (${k}): lines ${all.toString()} vs total ${r.ownerTotal[k]}`);
    }
  }
}

export { triZero };
