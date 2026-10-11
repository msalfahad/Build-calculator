import { D, type Dec } from '../lib/decimal';
import { parseNonNegative } from '../validation/parse';
import type { CalibrationProject } from '../types';

const num = (v: string): Dec | null => {
  const r = parseNonNegative(v, 'x');
  return r.ok ? r.value : null;
};
const signed = (v: string): Dec | null => {
  const s = v.trim();
  if (!s) return D(0);
  const neg = s.startsWith('-');
  const r = num(neg ? s.slice(1) : s);
  return r === null ? null : neg ? r.neg() : r;
};

/**
 * Scope-normalised actual cost = final cost − unrelated variations + scope adjustment.
 * Unrelated variations (owner change orders outside the estimated scope) must be removed before comparison.
 */
export function normalisedActual(p: CalibrationProject): number | null {
  const final = num(p.finalCost);
  const vars = num(p.unrelatedVariations) ?? D(0);
  const adj = signed(p.scopeAdjustment);
  if (final === null || final.isZero() || adj === null) return null;
  const n = final.minus(vars).plus(adj);
  return n.gt(0) ? n.toNumber() : null;
}

/** Absolute percentage error = |estimate − actual| / actual × 100, against the scope-normalised actual. */
export function absolutePercentageError(p: CalibrationProject): number | null {
  const est = num(p.initialEstimate);
  const act = normalisedActual(p);
  if (est === null || est.isZero() || act === null) return null;
  return est.minus(act).abs().dividedBy(act).times(100).toDecimalPlaces(2).toNumber();
}

/** Summary only over projects with both an estimate and a final cost. Returns null when there is no data. */
export function calibrationStats(projects: CalibrationProject[]) {
  const apes = projects.map(absolutePercentageError).filter((x): x is number => x !== null).sort((a, b) => a - b);
  if (!apes.length) return null;
  const mean = apes.reduce((s, x) => s.plus(x), D(0)).dividedBy(apes.length).toDecimalPlaces(2).toNumber();
  const mid = Math.floor(apes.length / 2);
  const median = apes.length % 2 ? apes[mid] : D(apes[mid - 1]).plus(apes[mid]).dividedBy(2).toDecimalPlaces(2).toNumber();
  return { n: apes.length, mean, median, sufficient: apes.length >= 10 };
}

export const CALIBRATION_COLUMNS: (keyof CalibrationProject)[] = [
  'id', 'name', 'location', 'date', 'builtUpArea', 'floors', 'basement', 'specification', 'contractorScope',
  'initialEstimate', 'awardedValue', 'finalCost', 'unrelatedVariations', 'scopeAdjustment', 'priceSources', 'notes',
];

export function calibrationCsv(projects: CalibrationProject[]): string {
  const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = [...CALIBRATION_COLUMNS, 'normalised_actual', 'absolute_pct_error'].join(',');
  const rows = projects.map((p) => [...CALIBRATION_COLUMNS.map((c) => q(p[c])), q(normalisedActual(p) ?? ''), q(absolutePercentageError(p) ?? '')].join(','));
  return [head, ...rows].join('\n');
}
