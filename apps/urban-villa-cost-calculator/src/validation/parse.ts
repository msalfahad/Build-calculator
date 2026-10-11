import { D, type Dec } from '../lib/decimal';
import type { Issue } from '../types';

export type ParseResult = { ok: true; value: Dec | null } | { ok: false; issue: Issue };

const NUMERIC = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;
const ARABIC_DIGITS = /[٠-٩۰-۹]/g;

/** Normalise user-typed numbers: Arabic-Indic digits, Arabic decimal separator, thousands separators, spaces. */
export function normaliseNumberText(raw: string): string {
  return raw
    .replace(ARABIC_DIGITS, (ch) => {
      const c = ch.charCodeAt(0);
      return String(c >= 0x06f0 ? c - 0x06f0 : c - 0x0660);
    })
    .replace(/٫/g, '.')
    .replace(/[٬,\s]/g, '')
    .trim();
}

/**
 * Parse a finite, non-negative number. Blank → null (caller decides whether blank is allowed).
 * Rejects NaN, Infinity, negatives and any non-numeric text.
 */
export function parseNonNegative(raw: string | number | null | undefined, field: string): ParseResult {
  if (raw === null || raw === undefined) return { ok: true, value: null };
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return { ok: false, issue: { code: 'INVALID_NUMBER', severity: 'error', field } };
    raw = String(raw);
  }
  const text = normaliseNumberText(raw);
  if (text === '') return { ok: true, value: null };
  if (!NUMERIC.test(text)) return { ok: false, issue: { code: 'INVALID_NUMBER', severity: 'error', field } };
  const value = D(text);
  if (!value.isFinite()) return { ok: false, issue: { code: 'INVALID_NUMBER', severity: 'error', field } };
  if (value.isNegative() && !value.isZero()) return { ok: false, issue: { code: 'NEGATIVE_NUMBER', severity: 'error', field } };
  return { ok: true, value: value.isZero() ? D(0) : value };
}

/** Collects issues while parsing so the engine can report every problem at once. */
export class IssueCollector {
  readonly issues: Issue[] = [];
  add(issue: Issue) {
    this.issues.push(issue);
  }
  num(raw: string | number | null | undefined, field: string): Dec | null {
    const r = parseNonNegative(raw, field);
    if (!r.ok) {
      this.add(r.issue);
      return null;
    }
    return r.value;
  }
  get hasErrors() {
    return this.issues.some((i) => i.severity === 'error');
  }
}
