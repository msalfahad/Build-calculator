import { describe, expect, it } from 'vitest';
import { calculateEstimate } from '../../src/calculators';
import {
  alhisbaReconciliation, alhisbaCategoryAmounts, coverageArea, mfatahExample, taqeemDifference,
  varndaPublishedExample, ALHISBA_MATRIX, ALHISBA_RUNS,
} from '../../src/calculators/research';
import { mfatahExampleInput, varndaExampleInput } from '../../src/lib/defaults';
import { NOW, rb } from './helpers';

describe('Mathematical verification of published / observed benchmarks', () => {
  it('960 × 150 = 144,000 KWD', () => {
    expect(mfatahExample().construction).toBe(144000);
  });

  it('Varnda published example = 170,600 KWD (research module)', () => {
    const v = varndaPublishedExample();
    expect(v).toEqual({ base: 144000, design: 11520, contingency: 10080, fees: 5000, total: 170600 });
  });

  it('Varnda example reproduced through the main engine = 170,600 KWD', () => {
    const r = calculateEstimate(varndaExampleInput(), rb(), NOW);
    expect(r.status).toBe('complete');
    expect(r.areas.aboveGround).toBe(960);
    expect(r.construction!.mid).toBe(144000);
    const line = (k: string) => r.lines.find((l) => l.key === k)!.amount.mid;
    expect(line('design')).toBe(11520);
    expect(line('contingency')).toBe(10080);
    expect(line('fixed_fees')).toBe(5000);
    expect(r.ownerTotal!.mid).toBe(170600);
    // labelled as a published benchmark, not an approved Urban rate
    expect(r.rate!.approval_status).toBe('published_benchmark');
    expect(r.issues.some((i) => i.code === 'RATE_NOT_APPROVED')).toBe(true);
  });

  it('MFatah Deluxe 150 × 960 = 144,000 through the engine, flagged as another grading system', () => {
    const r = calculateEstimate(mfatahExampleInput(), rb(), NOW);
    expect(r.construction).toEqual({ low: 144000, mid: 144000, high: 144000 });
    expect(r.ownerTotal!.mid).toBe(144000);
    expect(r.issues.some((i) => i.code === 'RATE_OTHER_GRADE_SYSTEM')).toBe(true);
    expect(r.issues.some((i) => i.code === 'RATE_RANGE_UNAVAILABLE')).toBe(true);
  });

  it('Alhisba C observed average = 190.625 KWD/m²', () => {
    expect(alhisbaReconciliation('AL-004').normalizedKwdPerM2).toBe(190.625);
  });

  it('Alhisba C visible categories total 119,000 KWD and differ by 3,000 KWD', () => {
    const r = alhisbaReconciliation('AL-004');
    expect(r.visibleSum).toBe(119000);
    expect(r.reportedTotal).toBe(122000);
    expect(r.difference).toBe(3000);
    expect(alhisbaCategoryAmounts('AL-004')).toHaveLength(8);
  });

  it('other Alhisba runs keep their observed gaps and have no normalised rate (area unknown)', () => {
    expect(alhisbaReconciliation('AL-001').difference).toBe(2000);
    expect(alhisbaReconciliation('AL-002').difference).toBe(1000);
    expect(alhisbaReconciliation('AL-003').difference).toBe(2000);
    for (const id of ['AL-001', 'AL-002', 'AL-003']) {
      expect(alhisbaReconciliation(id).normalizedKwdPerM2).toBeNull();
      expect(alhisbaReconciliation(id).fullyObserved).toBe(false);
    }
    expect(ALHISBA_RUNS.filter((r) => r.status === 'OBSERVED_FULL_INPUTS_AND_RESULT').map((r) => r.run_id)).toEqual(['AL-004']);
  });

  it('18-run matrix: only 400/2/no/C is observed; all others blank', () => {
    expect(ALHISBA_MATRIX).toHaveLength(18);
    const observed = ALHISBA_MATRIX.filter((m) => m.observed_total_kwd !== null);
    expect(observed).toHaveLength(1);
    expect(observed[0].test_id).toBe('AL-400-F2-NO-C');
    expect(observed[0].observed_total_kwd).toBe(122000);
  });

  it('Taqeem observed difference = 109,000 KWD', () => {
    expect(taqeemDifference()).toBe(109000);
  });

  it('400 m² plot, 2 floors, 80% experimental coverage = 640 m²', () => {
    expect(coverageArea(400, 80, 2)).toBe(640);
  });
});
