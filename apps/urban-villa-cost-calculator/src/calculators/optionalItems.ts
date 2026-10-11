import { D, roundKwd } from '../lib/decimal';
import { IssueCollector } from '../validation/parse';
import type { AdditionResult, EstimateInput, UnpricedItem } from '../types';

export interface AdditionsOutcome {
  items: AdditionResult[];
  netTotal: ReturnType<typeof D>;
  pricedKeys: Set<string>;
  anyEnabled: boolean;
}

/**
 * Formula D — optional additions.
 *   Item cost        = quantity × unit rate                     (rounded to whole KWD)
 *   Net upgrade cost = item cost − standard included allowance  (when the baseline already includes the item)
 * Missing quantity / rate / allowance → the item is UNPRICED (never treated as zero).
 * A negative net upgrade is a credit and is shown as such.
 */
export function estimateAdditions(input: EstimateInput, c: IssueCollector, unpriced: UnpricedItem[]): AdditionsOutcome {
  const items: AdditionResult[] = [];
  let net = D(0);
  const pricedKeys = new Set<string>();
  const enabled = input.additions.filter((a) => a.enabled);
  enabled.forEach((a) => {
    const name = a.description.trim() || a.key;
    const qty = c.num(a.quantity, `additions.${a.id}.quantity`);
    const rate = c.num(a.rate, `additions.${a.id}.rate`);
    const allowance = a.includedInBaseline ? c.num(a.standardAllowance, `additions.${a.id}.standardAllowance`) : D(0);

    const base: AdditionResult = {
      id: a.id,
      description: name,
      unit: a.unit,
      quantity: qty?.toNumber() ?? null,
      rate: rate?.toNumber() ?? null,
      gross: null,
      allowance: a.includedInBaseline ? allowance?.toNumber() ?? null : null,
      net: null,
      includedInBaseline: a.includedInBaseline,
      priced: false,
      source: a.source,
    };

    if (qty === null || qty.isZero()) {
      unpriced.push({ code: 'ADDITION_QTY_MISSING', params: { item: name } });
    } else if (rate === null) {
      unpriced.push({ code: 'ADDITION_UNPRICED', params: { item: name } });
    } else if (allowance === null) {
      unpriced.push({ code: 'ADDITION_ALLOWANCE_MISSING', params: { item: name } });
    } else {
      const gross = roundKwd(qty.times(rate));
      const n = gross.minus(roundKwd(allowance));
      base.gross = gross.toNumber();
      base.net = n.toNumber();
      base.priced = true;
      net = net.plus(n);
      pricedKeys.add(a.key);
      if (n.isNegative() && !n.isZero()) c.add({ code: 'ADDITION_CREDIT', severity: 'info', params: { item: name } });
      if (!a.source.trim()) c.add({ code: 'ADDITION_NO_SOURCE', severity: 'warning', params: { item: name } });
    }
    items.push(base);
  });
  return { items, netTotal: net, pricedKeys, anyEnabled: enabled.length > 0 };
}
