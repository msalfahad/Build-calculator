import { useI18n } from '../i18n';
import { Icon, Kwd, Note, Num } from '../components/ui';
import { ResultActions } from '../components/ResultActions';
import { UnpricedPanel } from '../components/IssuePanels';
import { basisText } from '../reports/format';
import type { AppState } from '../hooks/useAppState';
import type { BudgetLine, EstimateResult } from '../types';

export function BreakdownTable({ r, compact }: { r: EstimateResult; compact?: boolean }) {
  const { t } = useI18n();
  const partial = r.status === 'partial';
  const cons = r.lines.filter((l) => l.group === 'construction');
  const owner = r.lines.filter((l) => l.group === 'owner');
  const row = (l: BudgetLine) => (
    <tr key={l.key} data-testid={`line-${l.key}`}>
      <td><b>{t(`lines.${l.key}`)}</b><div className="basis">{basisText(t, l)}</div></td>
      <td className="n"><Num v={l.amount.low} /></td>
      <td className="n"><b><Num v={l.amount.mid} /></b></td>
      <td className="n"><Num v={l.amount.high} /></td>
    </tr>
  );
  return (
    <div className="table-wrap">
      <table className="t" data-testid="breakdown-table">
        <thead>
          <tr><th>{t('breakdown.item')}</th><th className="n">{t('results.low')}</th><th className="n">{t('results.typical')}</th><th className="n">{t('results.high')}</th></tr>
        </thead>
        <tbody>
          {cons.map(row)}
          <tr className="sub">
            <td>{partial ? t('results.constructionPartial') : t('breakdown.constructionSubtotal')}</td>
            <td className="n"><Num v={r.construction!.low} /></td><td className="n"><Num v={r.construction!.mid} /></td><td className="n"><Num v={r.construction!.high} /></td>
          </tr>
          {owner.map(row)}
          <tr className={`grand ${partial ? 'partial' : ''}`}>
            <td>{partial ? t('results.ownerTotalPartial') : t('breakdown.total')} ({t('common.kwd')})</td>
            <td className="n"><Num v={r.ownerTotal!.low} /></td><td className="n" data-testid="breakdown-total"><Num v={r.ownerTotal!.mid} /></td><td className="n"><Num v={r.ownerTotal!.high} /></td>
          </tr>
        </tbody>
      </table>
      {!compact && <p className="xs muted">{t('breakdown.rounding')}: {r.meta.rounding}</p>}
    </div>
  );
}

export function FloorsTable({ r }: { r: EstimateResult }) {
  const { t } = useI18n();
  return (
    <div className="table-wrap">
      <table className="t">
        <thead><tr><th>{t('breakdown.floor')}</th><th className="n">{t('floors.area')}</th><th className="n">{t('breakdown.rate')} ({t('common.kwdm2')})</th><th className="n">{t('breakdown.cost')}</th></tr></thead>
        <tbody>
          {r.floors.map((f) => (
            <tr key={f.key}>
              <td>{t(`floors.${f.key}`)}{f.rateSource === 'override' ? ' *' : ''}</td>
              <td className="n"><Num v={f.area} /></td>
              <td className="n"><Num v={f.rate?.mid} /></td>
              <td className="n"><Num v={f.cost?.mid} /></td>
            </tr>
          ))}
          {r.areas.basement > 0 && (
            <tr><td>{t('floors.basement')}</td><td className="n"><Num v={r.areas.basement} /></td><td className="n">—</td><td className="n">{r.basementCost ? <Num v={r.basementCost.mid} /> : t('common.unpriced')}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function AdditionsTable({ r }: { r: EstimateResult }) {
  const { t } = useI18n();
  if (!r.additions.length) return <p className="small muted">{t('report.noneItems')}</p>;
  return (
    <div className="table-wrap">
      <table className="t">
        <thead><tr><th>{t('breakdown.item')}</th><th className="n">{t('extras.qty')}</th><th className="n">{t('extras.rate')}</th><th className="n">{t('extras.gross')}</th><th className="n">{t('breakdown.allowance')}</th><th className="n">{t('extras.net')}</th></tr></thead>
        <tbody>
          {r.additions.map((a) => (
            <tr key={a.id}>
              <td>{a.description}<div className="basis">{a.source || '—'}</div></td>
              <td className="n"><Num v={a.quantity} /> {a.unit}</td>
              <td className="n"><Num v={a.rate} /></td>
              <td className="n"><Num v={a.gross} /></td>
              <td className="n">{a.includedInBaseline ? <Num v={a.allowance} /> : '—'}</td>
              <td className="n">{a.priced ? <b><Num v={a.net} /></b> : <span style={{ color: 'var(--amber-600)' }}>{t('common.unpriced')}</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Breakdown({ s }: { s: AppState }) {
  const { t } = useI18n();
  const r = s.result;
  if (r.status === 'blocked') {
    return <div className="card"><Note kind="err">{t('results.blockedTitle')}</Note><button className="btn btn-primary" onClick={() => s.go('results')}>{Icon.back()} {t('common.back')}</button></div>;
  }
  return (
    <div className="fade-in">
      <div className="page-head row">
        <button className="btn btn-ghost btn-sm" onClick={() => s.go('results')}>{Icon.back()} {t('common.back')}</button>
        <h1>{t('breakdown.title')}</h1>
      </div>
      <section className="card">
        <BreakdownTable r={r} />
        <Note>{t('breakdown.tradeNote')}</Note>
      </section>
      <div className="grid2">
        <section className="card"><h2>{t('breakdown.floors')}</h2><FloorsTable r={r} /></section>
        <section className="card"><h2>{t('breakdown.additions')}</h2><AdditionsTable r={r} /></section>
      </div>
      <UnpricedPanel r={r} />
      <section className="card"><ResultActions s={s} showBreakdown={false} /></section>
      <span className="sr-only"><Kwd v={r.ownerTotal?.mid} /></span>
    </div>
  );
}
