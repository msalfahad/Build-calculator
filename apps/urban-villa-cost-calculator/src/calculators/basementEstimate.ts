import { D } from '../lib/decimal';
import { IssueCollector } from '../validation/parse';
import { BASEMENT_COMPONENTS, type BasisParams, type EstimateInput, type Rate, type Ratebook, type Scenario, type UnpricedItem } from '../types';
import { triRound, triScalar, type Tri } from './quickEstimate';
import { rateQualityIssues } from './rateSelection';
import type { ParsedAreas } from './buildingArea';

export interface BasementOutcome {
  cost: Tri | null; // null = enabled but not priced
  rateUsed: Rate | null;
  basis: string;
  basisBy: Record<Scenario, BasisParams>;
  kind: 'area_rate' | 'allowance';
}

const same = (p: BasisParams): Record<Scenario, BasisParams> => ({ low: p, mid: p, high: p });

/**
 * Formula C — basement, priced separately from above-ground floors.
 *   Basement cost = basement area × approved/entered basement rate, OR an explicitly entered package allowance.
 * There is NO default basement rate and the above-ground rate is never reused for the basement.
 * Components the package does not include (excavation, shoring, dewatering, ...) are reported as exclusions;
 * shoring/dewatering that the user says are needed become unpriced items unless priced as optional additions.
 */
export function estimateBasement(
  input: EstimateInput,
  areas: ParsedAreas,
  rb: Ratebook,
  c: IssueCollector,
  unpriced: UnpricedItem[],
  pricedAdditionKeys: Set<string>,
  today: Date,
): BasementOutcome | null {
  const b = input.basement;
  if (!b.enabled) return null;

  c.num(b.depth, 'basement.depth');
  let outcome: BasementOutcome = { cost: null, rateUsed: null, basis: 'unpriced', basisBy: same({}), kind: 'area_rate' };
  const area = areas.basement;

  if (b.pricingMode === 'library') {
    const rate = rb.rates.find((r) => r.rate_id === b.rateId);
    if (!rate || !rate.active || rate.category !== 'basement' || rate.price_mid === null) {
      c.add({ code: 'BASEMENT_RATE_INVALID', severity: 'error', field: 'basement.rateId', params: { rate: b.rateId || '—' } });
    } else {
      if (!rateQualityIssues(rate, c, today, 'basement')) {
        const mid = D(rate.price_mid);
        const low = rate.price_low !== null ? D(rate.price_low) : mid;
        const high = rate.price_high !== null ? D(rate.price_high) : mid;
        const cost = triRound({ low: area.times(low), mid: area.times(mid), high: area.times(high) });
        const bp = (r: typeof mid, k: Scenario): BasisParams => ({ area: area.toNumber(), rate: r.toNumber(), result: cost[k].toNumber(), source: rate.rate_id });
        outcome = { cost, rateUsed: rate, basis: 'area_x_rate', basisBy: { low: bp(low, 'low'), mid: bp(mid, 'mid'), high: bp(high, 'high') }, kind: 'area_rate' };
      }
    }
  } else if (b.pricingMode === 'rate') {
    const r = c.num(b.rate, 'basement.rate');
    if (r === null || r.isZero()) {
      if (!c.issues.some((i) => i.field === 'basement.rate')) c.add({ code: 'BASEMENT_RATE_REQUIRED', severity: 'error', field: 'basement.rate' });
    } else {
      c.add({ code: 'BASEMENT_PROVISIONAL', severity: 'warning' });
      const cost = triRound(triScalar(area.times(r)));
      outcome = {
        cost,
        rateUsed: null,
        basis: 'area_x_rate',
        basisBy: same({ area: area.toNumber(), rate: r.toNumber(), result: cost.mid.toNumber(), source: b.priceSource.trim() || 'provisional' }),
        kind: 'area_rate',
      };
    }
  } else if (b.pricingMode === 'allowance') {
    const a = c.num(b.allowance, 'basement.allowance');
    if (a === null || a.isZero()) {
      if (!c.issues.some((i) => i.field === 'basement.allowance')) c.add({ code: 'BASEMENT_ALLOWANCE_REQUIRED', severity: 'error', field: 'basement.allowance' });
    } else {
      c.add({ code: 'BASEMENT_PROVISIONAL', severity: 'warning' });
      const cost = triRound(triScalar(a));
      outcome = {
        cost,
        rateUsed: null,
        basis: 'allowance',
        basisBy: same({ amount: cost.mid.toNumber(), result: cost.mid.toNumber(), source: b.priceSource.trim() || 'provisional' }),
        kind: 'allowance',
      };
    }
  }

  if (outcome.cost === null && b.pricingMode === 'none') {
    unpriced.push({ code: 'BASEMENT_UNPRICED', params: { area: area.toNumber() } });
  }

  if (outcome.cost !== null) {
    const excluded = BASEMENT_COMPONENTS.filter((k) => !b.includes.includes(k));
    if (excluded.length) c.add({ code: 'BASEMENT_EXCLUSIONS', severity: 'warning', params: { items: excluded.join(',') } });
  }

  const covers = (k: 'shoring' | 'dewatering') => (outcome.cost !== null && b.includes.includes(k)) || pricedAdditionKeys.has(k);
  if (b.shoring === 'yes' && !covers('shoring')) unpriced.push({ code: 'SHORING_UNPRICED' });
  if (b.shoring === 'unknown' && !covers('shoring')) c.add({ code: 'SHORING_UNKNOWN', severity: 'warning' });
  if (b.groundwater === 'concerns' && !covers('dewatering')) unpriced.push({ code: 'DEWATERING_UNPRICED' });
  if (b.groundwater === 'unknown' && !covers('dewatering')) c.add({ code: 'GROUNDWATER_UNKNOWN', severity: 'warning' });

  return outcome;
}
