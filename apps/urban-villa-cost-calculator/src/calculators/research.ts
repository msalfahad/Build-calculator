// Research / benchmark arithmetic. Deliberately isolated from the Urban pricing engine:
// nothing here feeds calculateEstimate().
import { D } from '../lib/decimal';
import alhisba from '../data/alhisbaObservations.json';
import bench from '../data/benchmarkSources.json';

export interface AlhisbaRun {
  run_id: string;
  name: string;
  land_area_m2: number | null;
  above_ground_floors: number | null;
  basement: string;
  grade: string;
  reported_building_area_m2: number | null;
  reported_total_kwd: number;
  status: string;
  notes: string;
}

export const ALHISBA_RUNS = alhisba.runs as AlhisbaRun[];
export const ALHISBA_CATEGORIES = alhisba.categories as Record<string, string | number>[];
export const ALHISBA_MATRIX = alhisba.test_matrix as Record<string, string | number | null>[];
/** Source screenshot filenames per observation (stored in docs/research/evidence/alhisba/). */
export const ALHISBA_SCREENSHOTS = alhisba.screenshots as Record<string, string[]>;

const catKey = (runId: string) => `${runId.replace('-', '_')}_kwd`;

export function alhisbaCategoryAmounts(runId: string): { category: string; amount: number }[] {
  return ALHISBA_CATEGORIES.map((c) => ({ category: String(c.category), amount: Number(c[catKey(runId)]) }));
}

/** Sum of the 8 visible categories, the unexplained difference vs the reported total, and KWD/m² only when area is known. */
export function alhisbaReconciliation(runId: string) {
  const run = ALHISBA_RUNS.find((r) => r.run_id === runId);
  if (!run) throw new Error(`Unknown Alhisba run ${runId}`);
  const visible = alhisbaCategoryAmounts(runId).reduce((s, c) => s.plus(c.amount), D(0));
  const total = D(run.reported_total_kwd);
  return {
    run,
    visibleSum: visible.toNumber(),
    reportedTotal: total.toNumber(),
    difference: total.minus(visible).toNumber(),
    normalizedKwdPerM2: run.reported_building_area_m2 ? total.dividedBy(run.reported_building_area_m2).toNumber() : null,
    fullyObserved: run.status === 'OBSERVED_FULL_INPUTS_AND_RESULT',
  };
}

/** Experimental coverage hypothesis: plot × coverage × floors (80% fits ONE observed case). */
export function coverageArea(plot: number, coveragePct: number, floors: number): number {
  return D(plot).times(coveragePct).dividedBy(100).times(floors).toNumber();
}

export const TAQEEM = bench.taqeem as { id: string; total_kwd: number; basement: string; notes: string; [k: string]: string | number }[];

/** Difference between the two Taqeem observations — confounded by ~9 simultaneous changes, NOT a basement premium. */
export function taqeemDifference(): number {
  const [a, b] = TAQEEM;
  return D(a.total_kwd).minus(b.total_kwd).toNumber();
}

/** Varnda's published illustrative example: 960 m² × 150 + 8% + 7% (both on the 144,000 base) + 5,000 fees. */
export function varndaPublishedExample() {
  const base = D(960).times(150);
  const design = base.times('0.08');
  const contingency = base.times('0.07');
  const fees = D(5000);
  return {
    base: base.toNumber(),
    design: design.toNumber(),
    contingency: contingency.toNumber(),
    fees: fees.toNumber(),
    total: base.plus(design).plus(contingency).plus(fees).toNumber(),
  };
}

/** MFatah advertised Deluxe rate applied to 960 m² — construction only, no fees or additions. */
export function mfatahExample() {
  return { area: 960, rate: 150, construction: D(960).times(150).toNumber() };
}

export const PUBLISHED_RATES = bench.published_rates as Record<string, string | number | null>[];
export const COMPETITORS = bench.competitors as Record<string, string>[];
