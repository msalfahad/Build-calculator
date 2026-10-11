import { fmtNum, type TFn } from '../i18n';
import type { BudgetLine, Issue, UnpricedItem } from '../types';

const FLOOR_NAME = (t: TFn, k: string) => t(`floors.${k}`);

/** Translate an engine issue into a user-facing message. */
export function issueText(t: TFn, i: Issue): string {
  const p: Record<string, string | number> = { ...(i.params ?? {}) };
  if (i.field) p.field = t(`fields.${i.field}`) === `fields.${i.field}` ? i.field : t(`fields.${i.field}`);
  if (typeof p.floor === 'string') p.floor = FLOOR_NAME(t, p.floor);
  if (typeof p.status === 'string') p.status = t(`approval.${p.status}`);
  if (typeof p.scope === 'string') p.scope = t(`scope.${p.scope}`);
  if (typeof p.rateScope === 'string') p.rateScope = t(`scope.${p.rateScope}`);
  if (typeof p.grade === 'string') p.grade = t(`gradeNames.${p.grade}`);
  if (typeof p.items === 'string') p.items = p.items.split(',').map((k) => t(`basement.c_${k}`)).join(t('common.sep'));
  return t(`issues.${i.code}`, p);
}

export function unpricedText(t: TFn, u: UnpricedItem): string {
  const p = { ...(u.params ?? {}) };
  if (typeof p.area === 'number') p.area = fmtNum(p.area);
  return t(`unpriced.${u.code}`, p);
}

export function basisText(t: TFn, l: BudgetLine): string {
  const p: Record<string, string | number> = { ...(l.basisParams ?? {}) };
  for (const k of ['area', 'rate', 'baseMid', 'amount']) if (typeof p[k] === 'number') p[k] = fmtNum(p[k] as number);
  if (typeof p.base === 'string') p.base = t(`basis.pctBase_${p.base}`);
  if (l.basis === 'fixed' && p.label) return String(p.label);
  return t(`basis.${l.basis}`, p);
}
