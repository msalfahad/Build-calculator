import { describe, expect, it } from 'vitest';
import { calculateEstimate } from '../../src/calculators';
import { normaliseNumberText, parseNonNegative } from '../../src/validation/parse';
import { NOW, codes, rb, threeFloors } from './helpers';

describe('Input validation and safeguards', () => {
  it.each(['-5', 'NaN', 'Infinity', '-Infinity', 'abc', '1e', '12kg', '--3'])('rejects "%s"', (v) => {
    expect(parseNonNegative(v, 'x').ok).toBe(false);
  });

  it('rejects non-finite numbers', () => {
    expect(parseNonNegative(Number.NaN, 'x').ok).toBe(false);
    expect(parseNonNegative(Number.POSITIVE_INFINITY, 'x').ok).toBe(false);
  });

  it('accepts Arabic-Indic digits and thousands separators', () => {
    expect(normaliseNumberText('٣٢٠')).toBe('320');
    expect(normaliseNumberText('1,250.5')).toBe('1250.5');
    const r = parseNonNegative('١٥٠٫٥', 'x');
    expect(r.ok && r.value!.toNumber()).toBe(150.5);
  });

  it('negative floor area blocks the estimate', () => {
    const i = threeFloors();
    i.floors.first.area = '-320';
    const r = calculateEstimate(i, rb(), NOW);
    expect(r.status).toBe('blocked');
    expect(r.ownerTotal).toBeNull();
    expect(r.issues.find((x) => x.code === 'NEGATIVE_NUMBER')!.field).toBe('floors.first.area');
  });

  it('NaN / Infinity in fees block the estimate', () => {
    const i = threeFloors();
    i.fees.designPct = 'NaN';
    i.fees.fixedFees = 'Infinity';
    const r = calculateEstimate(i, rb(), NOW);
    expect(r.status).toBe('blocked');
    expect(codes(r.issues).filter((c) => c === 'INVALID_NUMBER')).toHaveLength(2);
  });

  it('enabled floor without area is an error', () => {
    const i = threeFloors();
    i.floors.second.area = '';
    expect(codes(calculateEstimate(i, rb(), NOW).issues)).toContain('FLOOR_AREA_REQUIRED');
  });

  it('no above-ground area is an error', () => {
    const i = threeFloors();
    i.floors.ground.area = '0';
    i.floors.first.enabled = false;
    i.floors.second.enabled = false;
    expect(codes(calculateEstimate(i, rb(), NOW).issues)).toContain('ABOVE_GROUND_REQUIRED');
  });

  it('plot area is required', () => {
    expect(codes(calculateEstimate(threeFloors({ plotArea: '' }), rb(), NOW).issues)).toContain('PLOT_REQUIRED');
  });

  it('percentages over 100 are rejected', () => {
    const i = threeFloors();
    i.fees.contingencyPct = '150';
    expect(codes(calculateEstimate(i, rb(), NOW).issues)).toContain('PCT_TOO_HIGH');
  });

  it('manual low > typical is rejected', () => {
    const i = threeFloors();
    i.rateSelection = { ...i.rateSelection, mode: 'manual', manualLow: '200', manualMid: '150' };
    expect(codes(calculateEstimate(i, rb(), NOW).issues)).toContain('RATE_RANGE_ORDER');
  });

  it('location and floor height are recorded but do not change the price', () => {
    const a = calculateEstimate(threeFloors(), rb(), NOW);
    const b = calculateEstimate(threeFloors({ location: 'Hawalli', floorHeight: '4.5' }), rb(), NOW);
    expect(b.ownerTotal).toEqual(a.ownerTotal);
    expect(codes(b.issues)).toEqual(expect.arrayContaining(['LOCATION_NOT_PRICED', 'HEIGHT_NOT_PRICED']));
  });

  it('results carry engine and ratebook versions', () => {
    const r = calculateEstimate(threeFloors(), rb(), NOW);
    expect(r.meta.engineVersion).toBe('2.0.0');
    expect(r.meta.ratebookVersion).toBe(2);
  });
});
