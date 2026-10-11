import { describe, expect, it } from 'vitest';
import { calculateEstimate, suggestBuildingArea, suggestFloorArea } from '../../src/calculators';
import { NOW, codes, rb, threeFloors } from './helpers';

describe('Building area', () => {
  it('suggests 640 m² for 400 m² plot × 2 floors at 80%', () => {
    expect(suggestFloorArea('400', '80')).toBe(320);
    expect(suggestBuildingArea('400', '80', 2)).toBe(640);
  });

  it('rejects invalid coverage (0, >100, negative, text)', () => {
    expect(suggestFloorArea('400', '0')).toBeNull();
    expect(suggestFloorArea('400', '120')).toBeNull();
    expect(suggestFloorArea('400', '-5')).toBeNull();
    expect(suggestFloorArea('abc', '80')).toBeNull();
  });

  it('roof annex area is independent of plot area and suggestions', () => {
    const i = threeFloors();
    i.floors.roofAnnex = { enabled: true, area: '90', rateOverride: '' };
    const r = calculateEstimate(i, rb(), NOW);
    expect(r.areas.perFloor.find((f) => f.key === 'roofAnnex')!.area).toBe(90);
    expect(r.areas.aboveGround).toBe(1050);
  });

  it('warns when the roof annex is as large as the plot / ground floor', () => {
    const i = threeFloors();
    i.floors.roofAnnex = { enabled: true, area: '400', rateOverride: '' };
    expect(codes(calculateEstimate(i, rb(), NOW).issues)).toContain('ROOF_ANNEX_LARGE');
  });

  it('basement is separated from above-ground area', () => {
    const i = threeFloors();
    i.basement = { ...i.basement, enabled: true, area: '300' };
    const r = calculateEstimate(i, rb(), NOW);
    expect(r.areas.aboveGround).toBe(960);
    expect(r.areas.basement).toBe(300);
    expect(r.areas.total).toBe(1260);
    // base cost uses only above-ground area
    expect(r.lines.find((l) => l.key === 'above_ground')!.amount.mid).toBe(144000);
  });

  it('manual floor areas override suggestions (engine only uses entered areas)', () => {
    const i = threeFloors();
    i.plotArea = '400';
    i.coverage = '80';
    i.floors.ground.area = '250';
    const r = calculateEstimate(i, rb(), NOW);
    expect(r.areas.aboveGround).toBe(890);
  });

  it('plot area is never used as built-up area', () => {
    const i = threeFloors();
    i.plotArea = '1000';
    expect(calculateEstimate(i, rb(), NOW).areas.aboveGround).toBe(960);
  });

  it('warns when ground floor exceeds plot (likely plot/GFA confusion)', () => {
    const i = threeFloors();
    i.plotArea = '300';
    expect(codes(calculateEstimate(i, rb(), NOW).issues)).toContain('GROUND_EXCEEDS_PLOT');
  });

  it('disabled floors are ignored', () => {
    const i = threeFloors();
    i.floors.second.enabled = false;
    expect(calculateEstimate(i, rb(), NOW).areas.aboveGround).toBe(640);
  });
});
