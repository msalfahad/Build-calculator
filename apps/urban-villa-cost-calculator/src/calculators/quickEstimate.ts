import { D, roundKwd, type Dec } from '../lib/decimal';
import { IssueCollector } from '../validation/parse';
import type { EstimateInput, FloorAreaResult } from '../types';
import type { ParsedAreas } from './buildingArea';
import type { ResolvedRate } from './rateSelection';

export interface Tri {
  low: Dec;
  mid: Dec;
  high: Dec;
}

export const triZero = (): Tri => ({ low: D(0), mid: D(0), high: D(0) });
export const triAdd = (a: Tri, b: Tri): Tri => ({ low: a.low.plus(b.low), mid: a.mid.plus(b.mid), high: a.high.plus(b.high) });
export const triRound = (a: Tri): Tri => ({ low: roundKwd(a.low), mid: roundKwd(a.mid), high: roundKwd(a.high) });
export const triScalar = (v: Dec): Tri => ({ low: v, mid: v, high: v });
export const triNum = (a: Tri) => ({ low: a.low.toNumber(), mid: a.mid.toNumber(), high: a.high.toNumber() });

/**
 * Formula B — above-ground construction.
 *   Uniform rate:         Base = Above-ground GFA × rate (low / mid / high)
 *   Floor-specific rates: Base = Σ (floor area × that floor's rate)
 * A floor-specific rate is only used when the estimator enters one explicitly; no floor multipliers are invented.
 * The result is rounded once, to whole KWD.
 */
export function aboveGroundBase(
  input: EstimateInput,
  areas: ParsedAreas,
  rate: ResolvedRate,
  c: IssueCollector,
): { base: Tri; floors: FloorAreaResult[]; uniform: boolean } {
  let total = triZero();
  let uniform = true;
  const floors: FloorAreaResult[] = [];
  for (const f of areas.perFloor) {
    const override = c.num(input.floors[f.key].rateOverride, `floors.${f.key}.rateOverride`);
    let r: Tri = { low: rate.low, mid: rate.mid, high: rate.high };
    let rateSource: FloorAreaResult['rateSource'] = 'selected';
    if (override !== null && !override.isZero()) {
      r = triScalar(override);
      rateSource = 'override';
      uniform = false;
      c.add({ code: 'FLOOR_RATE_OVERRIDE', severity: 'warning', params: { floor: f.key } });
    }
    const cost = { low: f.area.times(r.low), mid: f.area.times(r.mid), high: f.area.times(r.high) };
    total = triAdd(total, cost);
    floors.push({ key: f.key, area: f.area.toNumber(), rate: triNum(r), cost: triNum(cost), rateSource });
  }
  return { base: triRound(total), floors, uniform };
}
