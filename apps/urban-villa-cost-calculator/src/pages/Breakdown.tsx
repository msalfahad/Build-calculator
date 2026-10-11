import { useI18n } from '../i18n';
import { Icon, Kwd, Note, Num } from '../components/ui';
import { ResultActions } from '../components/ResultActions';
import { UnpricedPanel } from '../components/IssuePanels';
import { basisText } from '../reports/format';
import type { AppState } from '../hooks/useAppState';
import { SCENARIOS, type BudgetLine, type EstimateResult } from '../types';

/** Per-scenario formulas for a line; collapses to one row when all three scenarios use identical maths. */
export function ScenarioFormulas({ l }: { l: BudgetLine }) {
  const { t } = useI18n();
  const texts = SCENARIOS.map((k) => basisText(t, l, k));
  if (texts[0] === texts[1] && texts[1] === texts[2]) return <div className="basis"><bdi>{texts[1]}</bdi></div>;
  return (
    <div className="basis scen" data-testid={`formulas-${l.key}`}>
      {SCENARIOS.map((k, i) => (
        <div key={k}><span className="scen-k">{t(`results.${k === 'mid' ? 'typical' : k}`)}:</span> <bdi>{texts[i]}</bdi></div>
      ))}
    </div>
  );
}

export function KindBadge({ kind }: { kind: BudgetLine['kind'] }) {
  const { t } = useI18n();
  return <span className={`badge kind-${kind}`} title={t(`kind.${kind}D`) === `kind.${kind}D` ? undefined : t(`kind.${kind}D`)}>{t(`kind.${kind}`)}</span>;
}

export function BreakdownTable({ r, compact }: { r: EstimateResult; compact?: boolean }) {
  const { t } = useI18n();
  const partial = r.status === 'partial';
  const cons = r.lines.filter((l) => l.group === 'construction');
  const owner = r.lines.filter((l) => l.group === 'owner');
  const noRange = !r.rangeAvailable;
  const row = (l: BudgetLine) => (
    <tr key={l.key} data-testid={`line-${l.key}`}>
      <td><b>{t(`lines.${l.key}`)}</b> <KindBadge kind={l.kind} /><ScenarioFormulas l={l} /></td>
      <td className="n"><Num v={l.amount.low} /></td>
      <td className="n"><b><Num v={l.amount.mid} /></b></td>
      <td className="n"><Num v={l.amount.high} /></td>
    </tr>
  );
  const tri = (v: { low: number; mid: number; high: number }, testId?: string) => (
    <><td className="n"><Num v={v.low} /></td><td className="n" data-testid={testId}><Num v={v.mid} /></td><td className="n"><Num v={v.high} /></td></>
  );
  return (
    <div className="table-wrap">
      <table className="t" data-testid="breakdown-table">
        <thead>
          <tr><th>{t('breakdown.item')}</th><th className="n">{t('results.low')}</th><th className="n">{t('results.typical')}</th><th className="n">{t('results.high')}</th></tr>
        </thead>
        <tbody>
          <tr className="sect"><td colSpan={4}>{t('breakdown.constructionSection')}</td></tr>
          {cons.map(row)}
          <tr className="sub">
            <td>{partial ? t('results.constructionPartial') : t('breakdown.constructionSubtotal')}</td>
            {tri(r.construction!, 'breakdown-construction')}
          </tr>
          {owner.length > 0 && <tr className="sect"><td colSpan={4}>{t('breakdown.ownerAdditionalSection')}</td></tr>}
          {owner.map(row)}
          {owner.length > 0 && <tr className="sub"><td>{t('results.ownerAdditional')}</td>{tri(r.ownerAdditional!)}</tr>}
          <tr className={`grand ${partial ? 'partial' : ''}`}>
            <td>{partial ? t('results.ownerTotalPartial') : t('breakdown.total')} ({t('common.kwd')})</td>
            {tri(r.ownerTotal!, 'breakdown-total')}
          </tr>
        </tbody>
      </table>
      {noRange && <p className="xs" style={{ color: 'var(--amber-600)' }}>{t('results.noRangeNote')}</p>}
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
        <thead><tr><th>{t('breakdown.item')}</th><th>{t('breakdown.statusCol')}</th><th className="n">{t('extras.qty')}</th><th className="n">{t('extras.rate')}</th><th className="n">{t('extras.gross')}</th><th className="n">{t('breakdown.allowance')}</th><th className="n">{t('extras.net')}</th></tr></thead>
        <tbody>
          {r.additions.map((a) => (
            <tr key={a.id}>
              <td>{a.description}<div className="basis"><bdi>{a.source || '—'}</bdi></div></td>
              <td className="xs">{t(`scopeStatus.${a.status}`)}</td>
              <td className="n"><Num v={a.quantity} /> {a.unit}</td>
              <td className="n"><Num v={a.rate} /></td>
              <td className="n"><Num v={a.gross} /></td>
              <td className="n">{a.status === 'upgrade' ? <Num v={a.allowance} /> : '—'}</td>
              <td className="n">{a.status === 'baseline' || a.status === 'excluded' ? '—' : a.priced ? <b><Num v={a.net} /></b> : <span style={{ color: 'var(--amber-600)' }}>{t('common.unpriced')}</span>}</td>
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
        <Note>{t('breakdown.allocNote')}</Note>
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
