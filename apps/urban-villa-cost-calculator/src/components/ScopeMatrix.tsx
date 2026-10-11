import { useI18n } from '../i18n';
import { unpricedText } from '../reports/format';
import type { EstimateResult, ScopeStatus } from '../types';

/** "What is included / not included" derived from the scope-ownership matrix and the base rate's published scope. */
export function useScopeLists(r: EstimateResult) {
  const { t, lang } = useI18n();
  const by = (st: ScopeStatus[]) => r.additions.filter((a) => st.includes(a.status));
  const rateInc = r.rate ? (lang === 'ar' && r.rate.inclusions_ar ? r.rate.inclusions_ar : r.rate.inclusions) : '';
  const rateExc = r.rate ? (lang === 'ar' && r.rate.exclusions_ar ? r.rate.exclusions_ar : r.rate.exclusions) : '';
  return {
    rateInc,
    rateExc,
    baseline: by(['baseline']),
    extras: by(['extra', 'upgrade', 'provisional']).filter((a) => a.priced),
    owner: by(['owner_direct']).filter((a) => a.priced),
    excluded: by(['excluded']),
    unpriced: r.unpriced.map((u) => unpricedText(t, u)),
  };
}

export function IncludedPanel({ r }: { r: EstimateResult }) {
  const { t, kwd } = useI18n();
  const L = useScopeLists(r);
  return (
    <section className="card" data-testid="included-panel">
      <h2>{t('results.included')}</h2>
      {L.rateInc && <p className="small" style={{ marginTop: 0 }}><b>{t('results.rateInclusions')}:</b> <bdi>{L.rateInc}</bdi></p>}
      <List title={t('results.matrixIncluded')} items={L.baseline.map((a) => `${a.description}${a.baselineDocumented ? '' : ' *'}`)} />
      <List title={t('results.matrixExtras')} items={L.extras.map((a) => `${a.description} — ${kwd(a.net)} (${t(`scopeStatus.${a.status}`)})`)} />
      <List title={t('results.matrixOwner')} items={L.owner.map((a) => `${a.description} — ${kwd(a.net)}`)} />
      {L.baseline.some((a) => !a.baselineDocumented) && <p className="xs muted">* {t('issues.BASELINE_INCLUSION_UNDOCUMENTED', { item: '' }).trim()}</p>}
    </section>
  );
}

export function ExcludedPanel({ r }: { r: EstimateResult }) {
  const { t } = useI18n();
  const L = useScopeLists(r);
  return (
    <section className="card" data-testid="excluded-panel">
      <h2>{t('results.excluded')}</h2>
      {L.unpriced.length > 0 && (
        <div className="note warn" style={{ display: 'block' }} data-testid="unpriced-panel">
          <b>{t('results.matrixUnpriced')}</b>
          <ul>{L.unpriced.map((u, i) => <li key={i}>{u}</li>)}</ul>
        </div>
      )}
      <List title={t('results.matrixExcluded')} items={L.excluded.map((a) => a.description)} />
      {L.rateExc && <p className="small"><b>{t('results.rateExclusions')}:</b> <bdi>{L.rateExc}</bdi></p>}
      <p className="xs muted">{t('report.a4')}</p>
    </section>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  const { t } = useI18n();
  return (
    <div style={{ marginBottom: 8 }}>
      <div className="small" style={{ fontWeight: 600 }}>{title}</div>
      {items.length ? <ul className="small" style={{ margin: '2px 0 0', paddingInlineStart: 18 }}>{items.map((x, i) => <li key={i}><bdi>{x}</bdi></li>)}</ul>
        : <div className="xs muted">{t('results.noneListed')}</div>}
    </div>
  );
}
