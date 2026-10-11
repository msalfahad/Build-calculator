import type { ConfidenceFactors, ConfidenceLevel, FactorLevel, Rate } from '../types';

const SCORE: Record<FactorLevel, number> = { unknown: 0, low: 1, medium: 2, high: 3 };

/**
 * Qualitative confidence for a rate. Deliberately NOT a percentage: it is the weakest of the assessed
 * factors (relevance, scope match, recency, completeness, actually-incurred). Any unassessed factor → 'unrated'.
 * Inferred / unverified evidence can never rate above 'low'.
 */
export function confidenceLevel(rate: Pick<Rate, 'confidence' | 'evidence_status'>): ConfidenceLevel {
  const f: ConfidenceFactors = rate.confidence;
  const min = Math.min(...(Object.values(f) as FactorLevel[]).map((v) => SCORE[v] ?? 0));
  if (min === 0) return 'unrated';
  const level: ConfidenceLevel = min === 3 ? 'high' : min === 2 ? 'medium' : 'low';
  if (rate.evidence_status === 'inferred' || rate.evidence_status === 'unverified') return 'low';
  return level;
}

export const unknownConfidence = (): ConfidenceFactors => ({
  relevance: 'unknown', scope_match: 'unknown', recency: 'unknown', completeness: 'unknown', incurred: 'unknown',
});
