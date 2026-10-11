import defaultRatebookJson from '../data/ratebook.json';
import { unknownConfidence } from '../calculators/evidence';
import { APPROVAL_STATUSES, EVIDENCE_STATUSES, type Rate, type RateChange, type Ratebook } from '../types';

/**
 * Production gate. A public build (VITE_PUBLIC_BUILD=true) is read-only: no admin screen, no rate edits,
 * bundled ratebook only. localStorage is NOT a secure database; shared production approval requires a backend
 * with authentication and role-based authorisation (see URBAN_RATEBOOK_METHOD.md).
 */
export const ADMIN_ENABLED = (import.meta as { env?: Record<string, string> }).env?.VITE_PUBLIC_BUILD !== 'true';

export const DEFAULT_RATEBOOK = defaultRatebookJson as unknown as Ratebook;
const KEY = 'urban-vcc.ratebook.v1';

/** Fill schema-v2 provenance fields on a v1 rate without changing any price. */
export function migrateRate(r: Partial<Rate>): Rate {
  return {
    trade_category: '',
    work_description: '',
    location: 'Kuwait',
    country: 'KW',
    evidence_status: r.approval_status === 'urban_approved' ? 'urban_approved' : r.approval_status === 'published_benchmark' ? 'verified_published_claim' : r.approval_status === 'historical' ? 'historical' : 'unverified',
    evidence_category: null,
    confidence: unknownConfidence(),
    approver: '',
    approved_at: '',
    last_reviewed: '',
    inclusions_ar: '',
    exclusions_ar: '',
    notes_ar: '',
    included_components: [],
    ...r,
  } as Rate;
}

/** Upgrade a v1 ratebook to v2 (logged). Returns the input unchanged when already v2. */
export function migrateRatebook(rb: Ratebook | (Omit<Ratebook, 'schema_version'> & { schema_version: 1 })): Ratebook {
  if (rb.schema_version === 2) return rb as Ratebook;
  const version = rb.ratebook_version + 1;
  const at = new Date().toISOString();
  return {
    ...(rb as unknown as Ratebook),
    schema_version: 2,
    ratebook_version: version,
    rates: rb.rates.map(migrateRate),
    changelog: [{ at, rate_id: '*', action: 'migrate', field: 'schema_version', from: '1', to: '2', ratebook_version: version }, ...(rb.changelog ?? [])],
  };
}

export const cloneRatebook = (rb: Ratebook): Ratebook => JSON.parse(JSON.stringify(rb));

export function loadRatebook(): Ratebook {
  try {
    if (!ADMIN_ENABLED) return cloneRatebook(DEFAULT_RATEBOOK);
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = migrateRatebook(JSON.parse(raw));
      const err = validateRatebook(parsed);
      if (!err) return parsed;
    }
  } catch {
    /* storage unavailable or corrupt → defaults */
  }
  return cloneRatebook(DEFAULT_RATEBOOK);
}

export function saveRatebook(rb: Ratebook) {
  if (!ADMIN_ENABLED) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(rb));
  } catch {
    /* ignore */
  }
}

const isNumOrNull = (v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v) && v >= 0);

export function validateRate(r: Rate): string | null {
  if (!r || typeof r !== 'object') return 'rate is not an object';
  if (!r.rate_id || typeof r.rate_id !== 'string') return 'rate_id missing';
  if (!['building', 'basement', 'addition'].includes(r.category)) return `${r.rate_id}: bad category`;
  if (r.category === 'building' && !['turnkey', 'structure', 'finishing'].includes(r.scope)) return `${r.rate_id}: building rate needs a scope`;
  if (r.currency !== 'KWD') return `${r.rate_id}: currency must be KWD`;
  if (!isNumOrNull(r.price_low) || !isNumOrNull(r.price_mid) || !isNumOrNull(r.price_high)) return `${r.rate_id}: prices must be finite, non-negative numbers or null`;
  if (r.price_low !== null && r.price_mid !== null && r.price_low > r.price_mid) return `${r.rate_id}: low > typical`;
  if (r.price_high !== null && r.price_mid !== null && r.price_high < r.price_mid) return `${r.rate_id}: high < typical`;
  if (!APPROVAL_STATUSES.includes(r.approval_status)) return `${r.rate_id}: bad approval_status`;
  if (!EVIDENCE_STATUSES.includes(r.evidence_status)) return `${r.rate_id}: bad evidence_status`;
  if (r.approval_status === 'urban_approved' && !r.approver?.trim()) return `${r.rate_id}: an Urban-approved rate needs a named approver`;
  if (!Array.isArray(r.included_components)) return `${r.rate_id}: included_components must be a list`;
  if (!r.source || !r.source_date) return `${r.rate_id}: source and source_date are required`;
  return null;
}

export function validateRatebook(rb: unknown): string | null {
  const r = rb as Ratebook;
  if (!r || r.schema !== 'urban-ratebook' || r.schema_version !== 2) return 'Not an Urban ratebook file (schema mismatch)';
  if (!Array.isArray(r.rates) || !Array.isArray(r.grades)) return 'rates/grades missing';
  const ids = new Set<string>();
  for (const rate of r.rates) {
    const e = validateRate(rate);
    if (e) return e;
    if (ids.has(rate.rate_id)) return `duplicate rate_id ${rate.rate_id}`;
    ids.add(rate.rate_id);
  }
  return null;
}

const PRICE_FIELDS: (keyof Rate)[] = ['price_low', 'price_mid', 'price_high', 'price_basis', 'scope', 'category', 'grade', 'grade_system', 'unit', 'inclusions', 'exclusions', 'country', 'currency'];
const fieldStr = (v: unknown) => (typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v));

/**
 * Apply an edit to a rate, logging every changed field. If an Urban-approved rate's price or scope changes and the
 * editor did not explicitly (re-)approve it in this same edit, it is downgraded to "user provisional" so an
 * unreviewed price can never silently remain "approved".
 */
export function upsertRate(rb: Ratebook, next: Rate, now = new Date()): Ratebook {
  const err = validateRate(next);
  if (err) throw new Error(err);
  const out = cloneRatebook(rb);
  const version = out.ratebook_version + 1;
  const at = now.toISOString();
  const idx = out.rates.findIndex((r) => r.rate_id === next.rate_id);
  const log: RateChange[] = [];
  let rate = { ...next };
  if (idx < 0) {
    rate.version = 1;
    log.push({ at, rate_id: rate.rate_id, action: 'create', ratebook_version: version });
    out.rates.push(rate);
  } else {
    const prev = out.rates[idx];
    const priceChanged = PRICE_FIELDS.some((f) => prev[f] !== rate[f]);
    const reapproved = rate.approved_at !== prev.approved_at; // explicit approval in this same edit
    if (priceChanged && prev.approval_status === 'urban_approved' && rate.approval_status === 'urban_approved' && !reapproved) {
      rate = { ...rate, approval_status: 'user_provisional', evidence_status: prev.evidence_status === 'urban_approved' ? 'unverified' : rate.evidence_status, approver: '', approved_at: '' };
    }
    (Object.keys(rate) as (keyof Rate)[]).forEach((f) => {
      if (f === 'version') return;
      if (fieldStr(prev[f]) !== fieldStr(rate[f])) {
        const action = f === 'active' ? (rate.active ? 'activate' : 'deactivate') : f === 'approved_at' && rate.approved_at ? 'approve' : 'update';
        log.push({ at, rate_id: rate.rate_id, action, field: f, from: fieldStr(prev[f]), to: fieldStr(rate[f]), ratebook_version: version, by: f === 'approved_at' ? rate.approver : undefined });
      }
    });
    if (!log.length) return rb;
    rate.version = prev.version + 1;
    out.rates[idx] = rate;
  }
  out.ratebook_version = version;
  out.updated_at = at;
  out.changelog = [...log, ...out.changelog].slice(0, 500);
  return out;
}

/**
 * Approve a rate as Urban-approved. Requires a named approver; records approval time and review date.
 * NOTE: in this local build anyone with the admin screen can call this — production needs backend auth.
 */
export function approveRate(rb: Ratebook, rateId: string, approver: string, now = new Date()): Ratebook {
  const r = rb.rates.find((x) => x.rate_id === rateId);
  if (!r) throw new Error(`Unknown rate ${rateId}`);
  if (!approver.trim()) throw new Error('Approver name is required');
  const at = now.toISOString();
  return upsertRate(rb, { ...r, approval_status: 'urban_approved', evidence_status: 'urban_approved', approver: approver.trim(), approved_at: at, last_reviewed: at.slice(0, 10) }, now);
}

export function setRateActive(rb: Ratebook, rateId: string, active: boolean, now = new Date()): Ratebook {
  const r = rb.rates.find((x) => x.rate_id === rateId);
  if (!r) return rb;
  return upsertRate(rb, { ...r, active }, now);
}

export function blankRate(): Rate {
  return {
    rate_id: '',
    category: 'building',
    scope: 'turnkey',
    grade: 'medium',
    grade_system: 'urban',
    label_en: '',
    label_ar: '',
    unit: 'KWD/m2',
    price_low: null,
    price_mid: null,
    price_high: null,
    currency: 'KWD',
    price_basis: 'supply_install',
    source: '',
    source_url: '',
    source_date: new Date().toISOString().slice(0, 10),
    valid_until: '',
    quote_ref: '',
    approval_status: 'user_provisional',
    inclusions: '',
    exclusions: '',
    notes: '',
    version: 1,
    active: true,
    trade_category: '',
    work_description: '',
    location: 'Kuwait',
    country: 'KW',
    evidence_status: 'unverified',
    evidence_category: null,
    confidence: unknownConfidence(),
    approver: '',
    approved_at: '',
    last_reviewed: '',
    inclusions_ar: '',
    exclusions_ar: '',
    notes_ar: '',
    included_components: [],
  };
}
