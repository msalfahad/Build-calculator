import { useI18n } from '../i18n';
import { Icon, Kwd, NumberField, SelectField, Switch, TextField } from './ui';
import { catalogItem } from '../lib/defaults';
import { SCOPE_STATUSES, type AdditionLine, type AdditionResult, type ScopeStatus } from '../types';

interface Props {
  item: AdditionLine;
  result?: AdditionResult;
  onChange: (fn: (x: AdditionLine) => void) => void;
  onDelete?: () => void;
  errFor: (field: string) => string | undefined;
  compactHeader?: boolean;
}

const needsPrice = (s: ScopeStatus) => s === 'extra' || s === 'upgrade' || s === 'provisional' || s === 'owner_direct';

/** One scope item: ownership status + only the inputs that status actually uses. */
export function ScopeItemEditor({ item: a, result: r, onChange: set, onDelete, errFor, compactHeader }: Props) {
  const { t } = useI18n();
  const cat = catalogItem(a.key);
  return (
    <div className="add-item" data-testid={`addition-${a.key}`}>
      <div className="head">
        {compactHeader ? <b>{a.description || t('extras.custom')}</b> : (
          <Switch checked={a.enabled} onChange={(v) => set((x) => { x.enabled = v; })} label={<b>{a.description || t('extras.custom')}</b>} />
        )}
        {onDelete && <button className="icon-btn" aria-label={t('common.delete')} onClick={onDelete}>{Icon.trash()}</button>}
      </div>
      {a.enabled && (
        <>
          <SelectField label={t('extras.status')} value={a.status} onChange={(v) => set((x) => { x.status = v; })} testId={`status-${a.key}`}
            options={SCOPE_STATUSES.map((st) => ({ value: st, label: t(`scopeStatus.${st}`) }))} />
          {a.key === 'custom' && <TextField label={t('extras.description')} value={a.description} onChange={(v) => set((x) => { x.description = v; })} />}
          {needsPrice(a.status) && (
            <div className="add-grid">
              <NumberField label={t('extras.qty')} value={a.quantity} onChange={(v) => set((x) => { x.quantity = v; })} error={errFor(`additions.${a.id}.quantity`)} compact />
              <TextField label={t('extras.unit')} value={a.unit} onChange={(v) => set((x) => { x.unit = v; })} />
              <NumberField label={a.status === 'upgrade' ? `${t('extras.rate')} — ${t('scopeStatus.upgrade')}` : t('extras.rate')} value={a.rate} onChange={(v) => set((x) => { x.rate = v; })} error={errFor(`additions.${a.id}.rate`)} testId={`rate-${a.key}`} compact />
              <TextField label={t('extras.source')} value={a.source} onChange={(v) => set((x) => { x.source = v; })} />
            </div>
          )}
          {a.status === 'upgrade' && (
            <div className="grid2" style={{ marginTop: 8 }}>
              <NumberField label={t('extras.standardRate')} value={a.standardRate} unit={t('common.kwd')} onChange={(v) => set((x) => { x.standardRate = v; })} error={errFor(`additions.${a.id}.standardRate`)} testId={`std-rate-${a.key}`} />
              <NumberField label={t('extras.standardOr')} value={a.standardAllowance} unit={t('common.kwd')} onChange={(v) => set((x) => { x.standardAllowance = v; })} error={errFor(`additions.${a.id}.standardAllowance`)} testId={`std-total-${a.key}`} />
            </div>
          )}
          {r?.baselineDocumented && <p className="xs" style={{ color: 'var(--green-600)', margin: '4px 0 0' }}>✓ {t('extras.documented')}</p>}
          {cat?.hint && needsPrice(a.status) && <p className="xs muted" style={{ margin: '4px 0 0' }}>ⓘ {t('extras.hint')}: {cat.hint}</p>}
          <div className="add-net">
            <span>{t('extras.net')}</span>
            <b data-testid={`net-${a.key}`}>
              {a.status === 'baseline' || a.status === 'excluded' ? <span className="muted">{t(`scopeStatus.${a.status}`)}</span>
                : r?.priced ? <><Kwd v={r.net} />{r.net !== null && r.net < 0 ? ` (${t('common.credit')})` : ''}{a.status === 'owner_direct' ? ` · ${t('results.ownerShort')}` : ''}</>
                  : <span style={{ color: 'var(--amber-600)' }}>{t('common.unpriced')}</span>}
            </b>
          </div>
        </>
      )}
    </div>
  );
}
