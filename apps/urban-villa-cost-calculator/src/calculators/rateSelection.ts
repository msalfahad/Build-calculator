import { D, type Dec } from '../lib/decimal';
import { IssueCollector } from '../validation/parse';
import { APPROVAL_STATUSES, type EstimateInput, type Rate, type Ratebook, type Scope, type SelectedRate } from '../types';

export const STALE_AFTER_DAYS = 365;

const priority = (r: Rate) => APPROVAL_STATUSES.indexOf(r.approval_status);

/** Active building rates for exactly this scope (a turnkey rate is never offered for another scope). */
export function buildingRatesForScope(rb: Ratebook, scope: Scope): Rate[] {
  return rb.rates.filter((r) => r.active && r.category === 'building' && r.scope === scope);
}

/** Rates that match both the scope and the customer's Urban grade, best approval status first. */
export function candidateRates(rb: Ratebook, scope: Scope, grade: string): Rate[] {
  return buildingRatesForScope(rb, scope)
    .filter((r) => r.grade_system === 'urban' && r.grade === grade && r.price_mid !== null)
    .sort((a, b) => priority(a) - priority(b) || b.source_date.localeCompare(a.source_date));
}

export function basementRates(rb: Ratebook): Rate[] {
  return rb.rates.filter((r) => r.active && r.category === 'basement' && r.price_mid !== null);
}

export function isStale(rate: Pick<Rate, 'source_date' | 'valid_until'>, today: Date): boolean {
  if (rate.valid_until && rate.valid_until < today.toISOString().slice(0, 10)) return true;
  const d = Date.parse(rate.source_date);
  if (Number.isNaN(d)) return true;
  return (today.getTime() - d) / 86_400_000 > STALE_AFTER_DAYS;
}

export interface ResolvedRate {
  selected: SelectedRate;
  low: Dec;
  mid: Dec;
  high: Dec;
  source: Rate | null;
}

/** Warnings that apply to any rate drawn from the library. */
export function rateQualityIssues(rate: Rate, c: IssueCollector, today: Date, context: string) {
  if (rate.approval_status !== 'urban_approved') {
    c.add({ code: 'RATE_NOT_APPROVED', severity: 'warning', params: { rate: rate.rate_id, status: rate.approval_status, context } });
  }
  if (isStale(rate, today)) {
    c.add({ code: 'RATE_STALE', severity: 'warning', params: { rate: rate.rate_id, date: rate.source_date, context } });
  }
  if (rate.price_basis === 'material_only') {
    c.add({ code: 'MATERIAL_ONLY_RATE', severity: 'warning', params: { rate: rate.rate_id, context } });
  } else if (rate.price_basis === 'labour_only') {
    c.add({ code: 'LABOUR_ONLY_RATE', severity: 'warning', params: { rate: rate.rate_id, context } });
  }
}

/**
 * Resolve the above-ground building rate. Returns null (and records why) when the selected scope has no usable rate:
 * the engine never borrows a rate from another scope and never invents one.
 */
export function resolveBuildingRate(input: EstimateInput, rb: Ratebook, c: IssueCollector, today: Date): ResolvedRate | null {
  const sel = input.rateSelection;

  if (sel.mode === 'manual') {
    const mid = c.num(sel.manualMid, 'rateSelection.manualMid');
    const low = c.num(sel.manualLow, 'rateSelection.manualLow');
    const high = c.num(sel.manualHigh, 'rateSelection.manualHigh');
    if (mid === null || mid.isZero()) {
      if (!c.issues.some((i) => i.field === 'rateSelection.manualMid')) {
        c.add({ code: 'MANUAL_RATE_REQUIRED', severity: 'error', field: 'rateSelection.manualMid' });
      }
      return null;
    }
    const lo = low && !low.isZero() ? low : mid;
    const hi = high && !high.isZero() ? high : mid;
    if (lo.gt(mid) || hi.lt(mid)) {
      c.add({ code: 'RATE_RANGE_ORDER', severity: 'error', field: 'rateSelection.manualMid' });
      return null;
    }
    const rangeAvailable = !lo.eq(mid) || !hi.eq(mid);
    if (!rangeAvailable) c.add({ code: 'RATE_RANGE_UNAVAILABLE', severity: 'info' });
    c.add({ code: 'MANUAL_RATE_PROVISIONAL', severity: 'warning' });
    return {
      low: lo,
      mid,
      high: hi,
      source: null,
      selected: {
        rate_id: 'MANUAL',
        label_en: 'User-entered provisional rate',
        label_ar: 'سعر مؤقت مُدخل من المستخدم',
        low: lo.toNumber(),
        mid: mid.toNumber(),
        high: hi.toNumber(),
        approval_status: 'user_provisional',
        source: sel.manualSource.trim() || 'User-entered',
        source_date: today.toISOString().slice(0, 10),
        scope: input.scope,
        price_basis: 'unknown',
        inclusions: '',
        exclusions: '',
        rangeAvailable,
      },
    };
  }

  if (input.propertyType === 'investment') {
    c.add({ code: 'INVESTMENT_NOT_SUPPORTED', severity: 'error', field: 'propertyType' });
    return null;
  }

  let rate: Rate | undefined;
  if (sel.mode === 'library') {
    rate = rb.rates.find((r) => r.rate_id === sel.rateId);
    if (!rate) {
      c.add({ code: 'RATE_NOT_FOUND', severity: 'error', field: 'rateSelection.rateId', params: { rate: sel.rateId } });
      return null;
    }
    if (!rate.active) {
      c.add({ code: 'RATE_INACTIVE', severity: 'error', field: 'rateSelection.rateId', params: { rate: rate.rate_id } });
      return null;
    }
    if (rate.category !== 'building' || rate.scope !== input.scope) {
      c.add({ code: 'RATE_SCOPE_MISMATCH', severity: 'error', field: 'rateSelection.rateId', params: { rate: rate.rate_id, rateScope: rate.scope, scope: input.scope } });
      return null;
    }
    if (rate.grade_system === 'urban' && rate.grade !== input.grade) {
      c.add({ code: 'RATE_GRADE_MISMATCH', severity: 'warning', params: { rate: rate.rate_id, rateGrade: rate.grade, grade: input.grade } });
    }
    if (rate.grade_system !== 'urban') {
      c.add({ code: 'RATE_OTHER_GRADE_SYSTEM', severity: 'warning', params: { rate: rate.rate_id, system: rate.grade_system, rateGrade: rate.grade } });
    }
  } else {
    rate = candidateRates(rb, input.scope, input.grade)[0];
  }

  if (!rate || rate.price_mid === null) {
    c.add({ code: 'SCOPE_UNPRICED', severity: 'error', field: 'rateSelection', params: { scope: input.scope, grade: input.grade } });
    return null;
  }

  rateQualityIssues(rate, c, today, 'building');
  const mid = D(rate.price_mid);
  const low = rate.price_low !== null ? D(rate.price_low) : mid;
  const high = rate.price_high !== null ? D(rate.price_high) : mid;
  const rangeAvailable = rate.price_low !== null && rate.price_high !== null;
  if (!rangeAvailable) c.add({ code: 'RATE_RANGE_UNAVAILABLE', severity: 'info', params: { rate: rate.rate_id } });

  return {
    low,
    mid,
    high,
    source: rate,
    selected: {
      rate_id: rate.rate_id,
      label_en: rate.label_en,
      label_ar: rate.label_ar,
      low: low.toNumber(),
      mid: mid.toNumber(),
      high: high.toNumber(),
      approval_status: rate.approval_status,
      source: rate.source,
      source_date: rate.source_date,
      scope: input.scope,
      price_basis: rate.price_basis,
      inclusions: rate.inclusions,
      exclusions: rate.exclusions,
      rangeAvailable,
    },
  };
}
