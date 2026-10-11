import { describe, expect, it } from 'vitest';
import { calculateEstimate } from '../../src/calculators';
import { blankRate, setRateActive, upsertRate, validateRatebook } from '../../src/lib/ratebookStore';
import { makeSaved, parseSavedEstimate } from '../../src/lib/savedEstimates';
import { NOW, rb, threeFloors } from './helpers';

describe('Ratebook administration', () => {
  it('default ratebook is valid and contains only research/demo rates (none Urban-approved)', () => {
    const book = rb();
    expect(validateRatebook(book)).toBeNull();
    expect(book.rates.every((r) => r.approval_status === 'published_benchmark')).toBe(true);
    expect(book.rates.filter((r) => r.category === 'basement')).toHaveLength(0);
    expect(book.rates.filter((r) => r.scope === 'structure' || r.scope === 'finishing')).toHaveLength(0);
  });

  it('published Varnda and MFatah values are stored exactly', () => {
    const m = Object.fromEntries(rb().rates.map((r) => [r.rate_id, [r.price_low, r.price_mid, r.price_high]]));
    expect(m['VR-01']).toEqual([115, 125, 140]);
    expect(m['VR-02']).toEqual([135, 150, 170]);
    expect(m['VR-03']).toEqual([160, 175, 195]);
    expect(m['VR-04']).toEqual([210, 240, 280]);
    expect(m['VR-05']).toEqual([300, 360, 430]);
    expect(m['MF-01']).toEqual([null, 120, null]);
    expect(m['MF-02']).toEqual([null, 150, null]);
    expect(m['MF-03']).toEqual([null, 190, null]);
  });

  it('adding a rate logs it and bumps the ratebook version', () => {
    const next = upsertRate(rb(), { ...blankRate(), rate_id: 'U-1', price_mid: 160, source: 'Urban QS', approval_status: 'urban_approved', approver: 'QS lead' }, NOW);
    expect(next.ratebook_version).toBe(3);
    expect(next.changelog[0]).toMatchObject({ rate_id: 'U-1', action: 'create' });
  });

  it('editing the price of an approved rate downgrades it to provisional', () => {
    let book = upsertRate(rb(), { ...blankRate(), rate_id: 'U-1', price_mid: 160, source: 'Urban QS', approval_status: 'urban_approved', approver: 'QS lead', approved_at: '2026-10-01T00:00:00Z' }, NOW);
    const r = book.rates.find((x) => x.rate_id === 'U-1')!;
    book = upsertRate(book, { ...r, price_mid: 170 }, NOW);
    const after = book.rates.find((x) => x.rate_id === 'U-1')!;
    expect(after.approval_status).toBe('user_provisional');
    expect(after.version).toBe(2);
    expect(book.changelog.some((c) => c.field === 'price_mid' && c.from === '160' && c.to === '170')).toBe(true);
  });

  it('deactivate is logged', () => {
    const book = setRateActive(rb(), 'VR-01', false, NOW);
    expect(book.rates.find((r) => r.rate_id === 'VR-01')!.active).toBe(false);
    expect(book.changelog[0].action).toBe('deactivate');
  });

  it('invalid rates are rejected', () => {
    expect(() => upsertRate(rb(), { ...blankRate(), rate_id: 'X', price_mid: -1, source: 's' })).toThrow();
    expect(() => upsertRate(rb(), { ...blankRate(), rate_id: 'X', price_low: 200, price_mid: 100, source: 's' })).toThrow();
    expect(() => upsertRate(rb(), { ...blankRate(), rate_id: 'X', price_mid: 100, source: '' })).toThrow();
  });

  it('ratebook JSON round-trip preserves prices; bad files rejected', () => {
    const book = rb();
    const copy = JSON.parse(JSON.stringify(book));
    expect(validateRatebook(copy)).toBeNull();
    expect(copy.rates).toEqual(book.rates);
    expect(validateRatebook({ foo: 1 })).not.toBeNull();
    expect(validateRatebook({ ...copy, rates: [...copy.rates, copy.rates[0]] })).toMatch(/duplicate/);
  });

  it('saved estimate JSON round-trip preserves inputs, result, ratebook version and rates used', () => {
    const input = threeFloors({ projectName: 'Test villa' });
    const result = calculateEstimate(input, rb(), NOW);
    const saved = makeSaved(input, result, rb());
    const back = parseSavedEstimate(JSON.stringify(saved));
    expect(back.input).toEqual(input);
    expect(back.result.ownerTotal).toEqual(result.ownerTotal);
    expect(back.ratebookVersion).toBe(2);
    expect(back.ratesUsed.map((r) => r.rate_id)).toEqual(['VR-02']);
    expect(calculateEstimate(back.input, rb(), NOW).ownerTotal).toEqual(result.ownerTotal);
    expect(() => parseSavedEstimate('{"kind":"other"}')).toThrow();
  });
});
