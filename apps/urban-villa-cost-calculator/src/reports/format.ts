import { fmtNum, type TFn } from '../i18n';
import type { BudgetLine, Issue, Scenario, UnpricedItem } from '../types';

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
  if (i.code.startsWith('SITE_DIFFICULTY') && typeof p.item === 'string') p.item = t(`refined.sd_${p.item}`);
  if (typeof p.evidence === 'string') p.evidence = t(`evidence.${p.evidence}`);
  if (typeof p.items === 'string') p.items = p.items.split(',').map((k) => t(`basement.c_${k}`)).join(t('common.sep'));
  return t(`issues.${i.code}`, p);
}

export function unpricedText(t: TFn, u: UnpricedItem): string {
  const p = { ...(u.params ?? {}) };
  if (u.code === 'SITE_DIFFICULTY_QUOTE' && typeof p.item === 'string') p.item = t(`refined.sd_${p.item}`);
  if (typeof p.area === 'number') p.area = fmtNum(p.area);
  return t(`unpriced.${u.code}`, p);
}

/** Formula for ONE scenario — always the numbers that produced that scenario's amount. */
export function basisText(t: TFn, l: BudgetLine, scenario: Scenario = 'mid'): string {
  const p: Record<string, string | number> = { ...(l.basisBy?.[scenario] ?? {}) };
  for (const k of ['area', 'rate', 'baseAmt', 'amount', 'result']) if (typeof p[k] === 'number') p[k] = fmtNum(p[k] as number);
  if (typeof p.base === 'string') p.base = t(`basis.pctBase_${p.base}`);
  if (l.basis === 'fixed') return p.label ? `${p.label} = ${p.result}` : t('basis.fixed', p);
  return t(`basis.${l.basis}`, p);
}
