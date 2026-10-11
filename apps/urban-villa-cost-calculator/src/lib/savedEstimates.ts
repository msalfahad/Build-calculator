import type { EstimateInput, EstimateResult, Rate, Ratebook, SavedEstimate } from '../types';
import { ENGINE_VERSION } from '../calculators/finalBudget';
import { migrateInput, newId } from './defaults';
import { migrateRate } from './ratebookStore';

const KEY = 'urban-vcc.saved.v1';

export function ratesUsedBy(input: EstimateInput, result: EstimateResult, rb: Ratebook): Rate[] {
  const ids = new Set<string>();
  if (result.rate && result.rate.rate_id !== 'MANUAL') ids.add(result.rate.rate_id);
  if (input.basement.enabled && input.basement.pricingMode === 'library') ids.add(input.basement.rateId);
  return rb.rates.filter((r) => ids.has(r.rate_id));
}

export function makeSaved(input: EstimateInput, result: EstimateResult, rb: Ratebook, name?: string): SavedEstimate {
  return {
    kind: 'urban-villa-estimate',
    id: newId('est'),
    name: name || input.projectName || `Estimate ${new Date().toLocaleString('en-GB')}`,
    savedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
    ratebookVersion: rb.ratebook_version,
    input: JSON.parse(JSON.stringify(input)),
    result: JSON.parse(JSON.stringify(result)),
    ratesUsed: ratesUsedBy(input, result, rb),
  };
}

export function parseSavedEstimate(text: string): SavedEstimate {
  const obj = JSON.parse(text);
  if (!obj || obj.kind !== 'urban-villa-estimate' || !obj.input || !obj.result) throw new Error('Not an Urban villa estimate file');
  if (!obj.input.floors || !obj.input.basement || !obj.input.fees) throw new Error('Estimate file is missing required inputs');
  return { ...obj, input: migrateInput(obj.input), ratesUsed: (obj.ratesUsed ?? []).map(migrateRate) } as SavedEstimate;
}

/**
 * Reproduce a saved estimate exactly: overlay the saved rate snapshot onto the current ratebook and report the
 * saved ratebook version, so later edits to the library cannot change the reproduced figures.
 */
export function ratebookWithSnapshot(rb: Ratebook, saved: Pick<SavedEstimate, 'ratesUsed' | 'ratebookVersion'>): Ratebook {
  const ids = new Set(saved.ratesUsed.map((r) => r.rate_id));
  return {
    ...rb,
    ratebook_version: saved.ratebookVersion,
    rates: [...rb.rates.filter((r) => !ids.has(r.rate_id)), ...saved.ratesUsed.map((r) => ({ ...r, active: true }))],
  };
}

export function listSaved(): SavedEstimate[] {
  try {
    return (JSON.parse(localStorage.getItem(KEY) || '[]') as SavedEstimate[]).map((e) => ({ ...e, input: migrateInput(e.input), ratesUsed: (e.ratesUsed ?? []).map(migrateRate) }));
  } catch {
    return [];
  }
}

export function storeSaved(list: SavedEstimate[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
