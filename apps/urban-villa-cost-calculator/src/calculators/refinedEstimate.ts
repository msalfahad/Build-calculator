import { IssueCollector } from '../validation/parse';
import { FLOOR_KEYS, type EstimateInput, type UnpricedItem } from '../types';

/**
 * Level 2 (refined) structural and site questions.
 * They NEVER derive concrete / steel quantities from floor area. Each answer either
 *  - flags an item that requires a quotation (unpriced → partial estimate), or
 *  - records a disclosed assumption (warning / info).
 * A priced 'structural_features' or 'site_works' scope item is treated as covering the related flag.
 */
export function evaluateRefined(input: EstimateInput, c: IssueCollector, unpriced: UnpricedItem[], pricedKeys: Set<string>) {
  if (input.level !== 2) return;
  const r = input.refined;
  let anyHeight = false;
  for (const k of FLOOR_KEYS) {
    if (!input.floors[k].enabled) continue;
    const h = c.num(r.floorHeights[k], `refined.floorHeights.${k}`);
    if (h !== null) anyHeight = true;
  }
  if (anyHeight) c.add({ code: 'REFINED_HEIGHTS_NOT_PRICED', severity: 'info' });

  const structural = r.cantilevers === 'yes' || r.specialStructure === 'yes';
  if (structural && !pricedKeys.has('structural_features')) unpriced.push({ code: 'STRUCTURAL_REVIEW_REQUIRED' });
  if (r.cantilevers === 'unknown' || r.specialStructure === 'unknown') c.add({ code: 'STRUCTURE_UNKNOWN', severity: 'warning' });

  for (const d of r.siteDifficulties) {
    if (!pricedKeys.has('site_works')) unpriced.push({ code: 'SITE_DIFFICULTY_QUOTE', params: { item: d } });
    else c.add({ code: 'SITE_DIFFICULTY_ALLOWANCE', severity: 'warning', params: { item: d } });
  }
  if (r.structuralDrawings !== 'yes') c.add({ code: 'NO_STRUCTURAL_QUANTITIES', severity: 'info' });
}
