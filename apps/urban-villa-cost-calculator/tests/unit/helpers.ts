import { defaultInput } from '../../src/lib/defaults';
import { DEFAULT_RATEBOOK, cloneRatebook } from '../../src/lib/ratebookStore';
import type { EstimateInput, Rate, Ratebook } from '../../src/types';

export const NOW = new Date('2026-10-11T12:00:00Z');
export const rb = (): Ratebook => cloneRatebook(DEFAULT_RATEBOOK);

/** 3 × 320 m², turnkey medium, auto rate (VR-02 published benchmark). */
export function threeFloors(over: Partial<EstimateInput> = {}): EstimateInput {
  const d = defaultInput();
  return {
    ...d,
    floors: {
      ground: { enabled: true, area: '320', rateOverride: '' },
      first: { enabled: true, area: '320', rateOverride: '' },
      second: { enabled: true, area: '320', rateOverride: '' },
      roofAnnex: { enabled: false, area: '', rateOverride: '' },
    },
    ...over,
  };
}

export function withRate(book: Ratebook, r: Partial<Rate> & { rate_id: string }): Ratebook {
  const base = book.rates[0];
  // approved test rates need a named approver (validation rule)
  const approver = r.approval_status === 'urban_approved' ? { approver: 'Test QS' } : {};
  book.rates.push({ ...base, ...approver, ...r } as Rate);
  return book;
}

export const codes = (issues: { code: string }[]) => issues.map((i) => i.code);
