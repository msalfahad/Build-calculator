import { D, roundKwd, type Dec } from '../lib/decimal';
import { IssueCollector } from '../validation/parse';
import type { AdditionResult, EstimateInput, Rate, UnpricedItem } from '../types';

export interface AdditionsOutcome {
  items: AdditionResult[];
  /** extra + upgrade (net) → construction, kind "calculated" */
  netCalculated: Dec;
  /** provisional allowances → construction, kind "allowance" */
  provisional: Dec;
  /** owner-direct scope items → owner budget */
  ownerDirect: Dec;
  pricedKeys: Set<string>;
  counts: { calculated: number; provisional: number; owner: number };
  anyCalculated: boolean;
  anyProvisional: boolean;
}

/**
 * Formula D — scope items, applied through the scope-ownership matrix.
 *   extra        : cost = quantity × unit rate
 *   upgrade      : net  = quantity × upgrade rate − standard allowance
 *                  standard allowance = quantity × standard rate  (or a total entered, or the base rate's documented allowance)
 *   provisional  : allowance = quantity × rate, labelled provisional
 *   owner_direct : quantity × rate, added to the OWNER budget (never to construction)
 *   baseline     : no extra cost (covered by the base rate) — warned when the base rate does not document it
 *   excluded     : no cost, listed as an exclusion
 *   quote_required: unpriced
 * Missing quantity / rate / allowance → UNPRICED (never zero). Each amount is rounded once to whole KWD.
 */
export function estimateAdditions(input: EstimateInput, c: IssueCollector, unpriced: UnpricedItem[], baselineRate: Rate | null): AdditionsOutcome {
  const items: AdditionResult[] = [];
  let netCalculated = D(0);
  let provisional = D(0);
  let ownerDirect = D(0);
  const counts = { calculated: 0, provisional: 0, owner: 0 };
  const pricedKeys = new Set<string>();
  const documented = new Map((baselineRate?.included_components ?? []).map((ic) => [ic.key, ic]));

  input.additions.filter((a) => a.enabled).forEach((a) => {
    const name = a.description.trim() || a.key;
    const doc = documented.get(a.key);
    const res: AdditionResult = {
      id: a.id,
      description: name,
      unit: a.unit,
      quantity: null,
      rate: null,
      gross: null,
      allowance: null,
      net: null,
      status: a.status,
      baselineDocumented: !!doc,
      priced: false,
      source: a.source,
    };
    items.push(res);

    if (a.status === 'baseline') {
      if (!doc) c.add({ code: 'BASELINE_INCLUSION_UNDOCUMENTED', severity: 'warning', params: { item: name } });
      res.priced = true;
      pricedKeys.add(a.key);
      return;
    }
    if (a.status === 'excluded') {
      res.priced = true;
      return;
    }
    if (a.status === 'quote_required') {
      unpriced.push({ code: 'QUOTE_REQUIRED', params: { item: name } });
      return;
    }

    const qty = c.num(a.quantity, `additions.${a.id}.quantity`);
    const rate = c.num(a.rate, `additions.${a.id}.rate`);
    res.quantity = qty?.toNumber() ?? null;
    res.rate = rate?.toNumber() ?? null;
    if (qty === null || qty.isZero()) {
      unpriced.push({ code: 'ADDITION_QTY_MISSING', params: { item: name } });
      return;
    }
    if (rate === null) {
      unpriced.push({ code: 'ADDITION_UNPRICED', params: { item: name } });
      return;
    }
    const gross = roundKwd(qty.times(rate));
    res.gross = gross.toNumber();

    if (a.status === 'upgrade') {
      const stdRate = c.num(a.standardRate, `additions.${a.id}.standardRate`);
      const stdTotal = c.num(a.standardAllowance, `additions.${a.id}.standardAllowance`);
      let allowance: Dec | null = null;
      if (stdRate !== null) allowance = roundKwd(qty.times(stdRate));
      else if (stdTotal !== null) allowance = roundKwd(stdTotal);
      else if (doc && doc.allowance_rate !== null) allowance = roundKwd(qty.times(doc.allowance_rate));
      if (!doc) c.add({ code: 'UPGRADE_BASELINE_UNDOCUMENTED', severity: 'warning', params: { item: name } });
      if (allowance === null) {
        unpriced.push({ code: 'ADDITION_ALLOWANCE_MISSING', params: { item: name } });
        return;
      }
      const net = gross.minus(allowance);
      res.allowance = allowance.toNumber();
      res.net = net.toNumber();
      if (net.isNegative() && !net.isZero()) c.add({ code: 'ADDITION_CREDIT', severity: 'info', params: { item: name } });
      netCalculated = netCalculated.plus(net);
      counts.calculated++;
    } else if (a.status === 'provisional') {
      res.net = gross.toNumber();
      provisional = provisional.plus(gross);
      counts.provisional++;
      c.add({ code: 'PROVISIONAL_ALLOWANCE', severity: 'warning', params: { item: name } });
    } else if (a.status === 'owner_direct') {
      res.net = gross.toNumber();
      ownerDirect = ownerDirect.plus(gross);
      counts.owner++;
    } else {
      res.net = gross.toNumber();
      netCalculated = netCalculated.plus(gross);
      counts.calculated++;
    }
    res.priced = true;
    pricedKeys.add(a.key);
    if (!a.source.trim()) c.add({ code: 'ADDITION_NO_SOURCE', severity: 'warning', params: { item: name } });
  });

  return {
    items,
    netCalculated,
    provisional,
    ownerDirect,
    pricedKeys,
    counts,
    anyCalculated: input.additions.some((a) => a.enabled && (a.status === 'extra' || a.status === 'upgrade')),
    anyProvisional: input.additions.some((a) => a.enabled && a.status === 'provisional'),
  };
}
