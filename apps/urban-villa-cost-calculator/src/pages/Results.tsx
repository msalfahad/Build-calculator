import { useI18n } from '../i18n';
import { ApprovalBadge, Icon, Kwd, Note, Num, Stepper, StatusBadge, Switch } from '../components/ui';
import { ResultActions } from '../components/ResultActions';
import { WarningsPanel } from '../components/IssuePanels';
import { ExcludedPanel, IncludedPanel } from '../components/ScopeMatrix';
import { issueText } from '../reports/format';
import { stepForField } from './Wizard';
import type { AppState } from '../hooks/useAppState';
import type { Triple } from '../types';

function TripleCards({ v, noRange, testPrefix }: { v: Triple; noRange: boolean; testPrefix: string }) {
  const { t } = useI18n();
  const side = (k: 'low' | 'high') => (
    <div className={`est ${noRange ? 'na' : ''}`}>
      <div className="l">{t(`results.${k}`)}</div>
      {noRange ? <div className="na-text">{t('results.noRange')}</div> : <><div className="v num" data-testid={`${testPrefix}-${k}`}><Num v={v[k]} /></div><div className="u">{t('common.kwd')}</div></>}
    </div>
  );
  return (
    <div className="est-cards">
      {side('low')}
      <div className="est typ"><div className="l">{t('results.typical')}</div><div className="v num" data-testid={`${testPrefix}-mid`}><Num v={v.mid} /></div><div className="u">{t('common.kwd')}</div></div>
      {side('high')}
    </div>
  );
}

export default function Results({ s }: { s: AppState }) {
  const { t, lang } = useI18n();
  const r = s.result;
  const input = s.input;
  const steps = ['property', 'floors', 'basement', 'specs', 'refined', 'extras', 'results'].map((k) => t(`steps.${k}`));

  if (r.status === 'blocked') {
    const errors = r.issues.filter((i) => i.severity === 'error');
    return (
      <div className="wizard-wrap fade-in">
        <Stepper steps={steps} current={6} onGo={(i) => s.go('wizard', i)} />
        <section className="card" data-testid="result-blocked">
          <h2>{t('results.blockedTitle')} <StatusBadge status="blocked" /></h2>
          <Note kind="err">
            {t('results.blockedBody')}
            <ul>{errors.map((e, i) => <li key={i}>{issueText(t, e)}</li>)}</ul>
          </Note>
          <div className="kpis">
            <div className="kpi"><div className="l">{t('floors.totalAbove')}</div><div className="v"><Num v={r.areas.aboveGround} unit={t('common.m2')} /></div></div>
            <div className="kpi"><div className="l">{t('floors.totalIncl')}</div><div className="v"><Num v={r.areas.total} unit={t('common.m2')} /></div></div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => s.go('wizard', stepForField(errors[0]?.field))} data-testid="fix-inputs">
            {Icon.back()} {t('results.editInputs')}
          </button>
        </section>
      </div>
    );
  }

  const partial = r.status === 'partial';
  const rate = r.rate!;
  const noRange = !r.rangeAvailable;
  const grade = s.ratebook.grades.find((g) => g.grade === input.grade);
  const hasBasement = r.lines.some((l) => l.key === 'basement');
  const hasExtras = r.lines.some((l) => l.key === 'additions' || l.key === 'allowances');

  return (
    <div className="fade-in">
      <div className="wizard-wrap"><Stepper steps={steps} current={6} onGo={(i) => s.go('wizard', i)} /></div>
      {s.reopened && (
        <div className="card" style={{ padding: 12 }}>
          <Switch checked={s.useSnapshot} onChange={s.setUseSnapshot} label={<span className="small">{t('results.useSavedRates')}</span>} testId="use-snapshot" />
          {s.useSnapshot ? <p className="xs muted" style={{ margin: '6px 0 0' }}>{t('results.savedRatesActive', { version: s.reopened.ratebookVersion })}</p>
            : s.reopened.ratebookVersion !== s.ratebook.ratebook_version && <Note kind="warn">{t('saved.savedWith', { saved: s.reopened.ratebookVersion, current: s.ratebook.ratebook_version })} {t('saved.snapshot')}: <Kwd v={s.reopened.result.ownerTotal?.mid} /></Note>}
        </div>
      )}
      <div className="results-layout">
        <div>
          <section className="card" data-testid="results-card">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0 }}>{t('results.constructionCostTitle')}</h2>
              <StatusBadge status={r.status} />
            </div>
            {partial && <Note kind="warn" testId="partial-banner"><b>{t('results.partialLabel')}.</b> {t('results.partialBody')}</Note>}
            <TripleCards v={r.construction!} noRange={noRange} testPrefix="est" />

            <div className="row" style={{ justifyContent: 'space-between', marginTop: 4 }}>
              <h2 style={{ margin: 0 }}>{partial ? t('results.ownerTotalPartial') : t('results.ownerBudgetTitle')}</h2>
            </div>
            <div className={partial ? 'owner-cards partial' : 'owner-cards'} data-testid="owner-total">
              <TripleCards v={r.ownerTotal!} noRange={noRange} testPrefix="owner" />
            </div>
            <div className="line-list">
              <div className="line-item"><span className="lb">{partial ? t('results.constructionPartial') : t('results.construction')}</span><span className="am"><Kwd v={r.construction!.mid} /></span></div>
              <div className="line-item"><span className="lb">{t('results.ownerAdditional')}</span><span className="am"><Kwd v={r.ownerAdditional!.mid} /></span>
                <span className="bs">{t('lines.owner_direct')} · {t('lines.design')} · {t('lines.fixed_fees')} · {t('lines.contingency')}</span></div>
              <div className="line-item total-line"><span className="lb">{partial ? t('results.ownerTotalPartial') : t('results.ownerTotal')}</span><span className="am" data-testid="owner-total-mid"><Kwd v={r.ownerTotal!.mid} /></span></div>
            </div>
            {noRange && <p className="xs" style={{ color: 'var(--amber-600)' }}>{t('results.noRangeNote')}</p>}

            <div className="kpis" style={{ marginTop: 12 }}>
              <div className="kpi">
                <div className="l">{t('results.area')}</div>
                <div className="v"><Num v={r.areas.total} unit={t('common.m2')} /></div>
                {r.areas.basement > 0 && <div className="xs muted"><Num v={r.areas.aboveGround} /> {t('results.aboveGround')} + <Num v={r.areas.basement} /> {t('results.basementArea')}</div>}
              </div>
              <div className="kpi">
                <div className="l">{t('results.typicalRate')}</div>
                <div className="v"><Num v={r.typicalRatePerM2} unit={t('common.kwdm2')} /></div>
              </div>
              <div className="kpi" data-testid="scope-used">
                <div className="l">{t('results.scopeUsed')}</div>
                <div className="small"><b>{t(`scope.${input.scope}`)}</b> · {grade ? (lang === 'ar' ? grade.name_ar : grade.name_en) : input.grade}</div>
                <div className="xs muted">{input.level === 2 ? t('results.levelRefined') : t('results.levelQuick')}</div>
              </div>
              <div className="kpi" data-testid="completeness">
                <div className="l">{t('results.completeness')}</div>
                <div className="small"><b>{partial ? t('results.partialLabel') : t('results.completeForScope')}</b></div>
              </div>
            </div>

            <div className="why" data-testid="why">
              <b>{t('results.why')}:</b>{' '}
              <bdi>{t('results.whyText', { area: r.areas.aboveGround.toLocaleString('en-US'), rate: rate.mid, source: rate.rate_id })}</bdi>
              {hasBasement && ` + ${t('results.whyBasement')}`}{hasExtras && ` + ${t('results.whyAdditions')}`}.
            </div>
            <p className="xs muted" style={{ marginBottom: 0 }}>{t('results.notQuote')}</p>
            <ResultActions s={s} />
          </section>
        </div>
        <div>
          <section className="card" data-testid="rate-used">
            <h2>{t('results.priceSource')}</h2>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <b className="small">{lang === 'ar' ? rate.label_ar : rate.label_en}</b>
              <ApprovalBadge status={rate.approval_status} />
            </div>
            <div className="kpi" style={{ marginTop: 8 }}>
              <div className="v"><Num v={rate.mid} unit={t('common.kwdm2')} /></div>
              {rate.rangeAvailable ? <div className="xs muted">{t('specs.range')}: <span className="num">{rate.low}–{rate.high}</span> {t('common.kwdm2')}</div>
                : <div className="xs muted">{t('results.noRange')}</div>}
            </div>
            <div className="row" style={{ marginTop: 8, gap: 6 }}>
              <span className="badge b-neutral" data-testid="evidence-badge">{t(`evidence.${rate.evidence_status}`)}</span>
              <span className={`badge conf-${rate.confidence}`}>{t(`confidence.${rate.confidence}`)}</span>
            </div>
            <p className="xs muted" style={{ margin: '8px 0 0' }}><bdi>{rate.source}</bdi> · <span className="num">{rate.source_date}</span> · {t(`scope.${rate.scope}`)} · {t(`basisType.${rate.price_basis}`)}</p>
          </section>
          <IncludedPanel r={r} />
          <ExcludedPanel r={r} />
          <WarningsPanel r={r} />
        </div>
      </div>
    </div>
  );
}
