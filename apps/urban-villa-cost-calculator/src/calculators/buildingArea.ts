import { D, type Dec } from '../lib/decimal';
import { IssueCollector } from '../validation/parse';
import { FLOOR_KEYS, type AreaSummary, type EstimateInput, type FloorKey } from '../types';

export interface ParsedAreas {
  perFloor: { key: FloorKey; area: Dec }[];
  aboveGround: Dec;
  basement: Dec;
  total: Dec;
}

/**
 * Formula A — built-up area.
 *   Above-ground GFA = Σ selected above-ground floor areas (ground, first, second, roof annex)
 *   Total GFA        = Above-ground GFA + basement area
 * Plot area is NEVER used as built-up area.
 */
export function parseAreas(input: EstimateInput, c: IssueCollector): ParsedAreas {
  const perFloor: { key: FloorKey; area: Dec }[] = [];
  for (const key of FLOOR_KEYS) {
    const f = input.floors[key];
    if (!f.enabled) continue;
    const a = c.num(f.area, `floors.${key}.area`);
    if (a === null) {
      if (!c.issues.some((i) => i.field === `floors.${key}.area`)) {
        c.add({ code: 'FLOOR_AREA_REQUIRED', severity: 'error', field: `floors.${key}.area`, params: { floor: key } });
      }
      continue;
    }
    perFloor.push({ key, area: a });
  }
  const aboveGround = perFloor.reduce((s, f) => s.plus(f.area), D(0));
  let basement = D(0);
  if (input.basement.enabled) {
    const b = c.num(input.basement.area, 'basement.area');
    if (b === null || b.isZero()) {
      if (!c.issues.some((i) => i.field === 'basement.area')) {
        c.add({ code: 'BASEMENT_AREA_REQUIRED', severity: 'error', field: 'basement.area' });
      }
    } else basement = b;
  }
  if (!c.hasErrors && aboveGround.isZero()) {
    c.add({ code: 'ABOVE_GROUND_REQUIRED', severity: 'error', field: 'floors.ground.area' });
  }
  return { perFloor, aboveGround, basement, total: aboveGround.plus(basement) };
}

export function areasToSummary(a: ParsedAreas): AreaSummary {
  return {
    perFloor: a.perFloor.map((f) => ({ key: f.key, area: f.area.toNumber() })),
    aboveGround: a.aboveGround.toNumber(),
    basement: a.basement.toNumber(),
    total: a.total.toNumber(),
  };
}

/**
 * Optional area suggestion: suggested area per typical floor = plot × coverage%.
 * The 80% default is an EXPERIMENTAL assumption inferred from ONE Alhisba observation
 * (400 m² plot, 2 floors → 640 m²). It is not a Kuwait Municipality regulation.
 * The roof annex is never given a suggested area (it must be entered by the user).
 */
export function suggestFloorArea(plotArea: string | number, coveragePct: string | number): number | null {
  const c = new IssueCollector();
  const plot = c.num(plotArea, 'plotArea');
  const cov = c.num(coveragePct, 'coverage');
  if (c.hasErrors || plot === null || cov === null || plot.isZero()) return null;
  if (cov.gt(100) || cov.isZero()) return null;
  return plot.times(cov).dividedBy(100).toNumber();
}

/** Suggested above-ground total for N typical floors (ground, first, second). */
export function suggestBuildingArea(plotArea: string | number, coveragePct: string | number, floors: number): number | null {
  const perFloor = suggestFloorArea(plotArea, coveragePct);
  if (perFloor === null || !Number.isInteger(floors) || floors < 1) return null;
  return D(perFloor).times(floors).toNumber();
}
