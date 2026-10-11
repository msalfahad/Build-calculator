import defaultRatebookJson from '../data/ratebook.json';
import { APPROVAL_STATUSES, type Rate, type RateChange, type Ratebook } from '../types';

export const DEFAULT_RATEBOOK = defaultRatebookJson as Ratebook;
const KEY = 'urban-vcc.ratebook.v1';

export const cloneRatebook = (rb: Ratebook): Ratebook => JSON.parse(JSON.stringify(rb));

export function loadRatebook(): Ratebook {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const err = validateRatebook(parsed);
      if (!err) return parsed;
    }
  } catch {
    /* storage unavailable or corrupt → defaults */
  }
  return cloneRatebook(DEFAULT_RATEBOOK);
}

export function saveRatebook(rb: Ratebook) {
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
  if (!r.source || !r.source_date) return `${r.rate_id}: source and source_date are required`;
  return null;
}

export function validateRatebook(rb: unknown): string | null {
  const r = rb as Ratebook;
  if (!r || r.schema !== 'urban-ratebook' || r.schema_version !== 1) return 'Not an Urban ratebook file (schema mismatch)';
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

const PRICE_FIELDS: (keyof Rate)[] = ['price_low', 'price_mid', 'price_high', 'price_basis', 'scope', 'category', 'grade', 'grade_system', 'unit', 'inclusions', 'exclusions'];

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
    if (priceChanged && prev.approval_status === 'urban_approved' && rate.approval_status === 'urban_approved') {
      rate = { ...rate, approval_status: 'user_provisional' };
    }
    (Object.keys(rate) as (keyof Rate)[]).forEach((f) => {
      if (f === 'version') return;
      if (prev[f] !== rate[f]) {
        const action = f === 'active' ? (rate.active ? 'activate' : 'deactivate') : 'update';
        log.push({ at, rate_id: rate.rate_id, action, field: f, from: String(prev[f]), to: String(rate[f]), ratebook_version: version });
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
  };
}
