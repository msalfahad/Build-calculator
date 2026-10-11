import Decimal from 'decimal.js';

// Exact decimal arithmetic for money. Never use binary floating point for KWD maths.
export const Dec = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export type Dec = Decimal;

export const ZERO = new Dec(0);

export function D(v: number | string | Decimal): Decimal {
  return new Dec(v);
}

/** Round to whole KWD, half-up. Every budget line is rounded once; totals are sums of rounded lines. */
export function roundKwd(v: Decimal): Decimal {
  return v.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
}

export function toNum(v: Decimal): number {
  return v.toNumber();
}
