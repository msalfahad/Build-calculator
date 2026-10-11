import { useI18n } from '../i18n';
import { ApprovalBadge, Icon, Kwd, Note, Num, Stepper, StatusBadge } from '../components/ui';
import { ResultActions } from '../components/ResultActions';
import { UnpricedPanel, WarningsPanel } from '../components/IssuePanels';
import { issueText } from '../reports/format';
import { stepForField } from './Wizard';
import type { AppState } from '../hooks/useAppState';

export default function Results({ s }: { s: AppState }) {
  const { t, lang } = useI18n();
  const r = s.result;
  const steps = ['property', 'floors', 'basement', 'specs', 'extras', 'results'].map((k) => t(`steps.${k}`));

  if (r.status === 'blocked') {
    const errors = r.issues.filter((i) => i.severity === 'error');
    return (
      <div className="wizard-wrap fade-in">
        <Stepper steps={steps} current={5} onGo={(i) => s.go('wizard', i)} />
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
  const owner = r.ownerTotal!;
  const cons = r.construction!;
  const rate = r.rate!;
  const ownerDirect = r.lines.find((l) => l.key === 'owner_direct')?.amount.mid ?? 0;

  return (
    <div className="fade-in">
      <div className="wizard-wrap"><Stepper steps={steps} current={5} onGo={(i) => s.go('wizard', i)} /></div>
      {s.reopened && s.reopened.ratebookVersion !== s.ratebook.ratebook_version && (
        <Note kind="warn">{t('saved.savedWith', { saved: s.reopened.ratebookVersion, current: s.ratebook.ratebook_version })} {t('saved.snapshot')}: <Kwd v={s.reopened.result.ownerTotal?.mid} /></Note>
      )}
      <div className="results-layout">
        <div>
          <section className="card" data-testid="results-card">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0 }}>{partial ? t('results.constructionPartial') : t('results.title')}</h2>
              <StatusBadge status={r.status} />
            </div>
            {partial && <Note kind="warn" testId="partial-banner"><b>{t('results.partialTitle')}.</b> {t('results.partialBody')}</Note>}
            <div className="est-cards">
              <div className="est"><div className="l">{t('results.low')}</div><div className="v num" data-testid="est-low"><Num v={cons.low} /></div><div className="u">{t('common.kwd')}</div></div>
              <div className="est typ"><div className="l">{t('results.typical')}</div><div className="v num" data-testid="est-mid"><Num v={cons.mid} /></div><div className="u">{t('common.kwd')}</div></div>
              <div className="est"><div className="l">{t('results.high')}</div><div className="v num" data-testid="est-high"><Num v={cons.high} /></div><div className="u">{t('common.kwd')}</div></div>
            </div>
            <div className="kpis">
              <div className="kpi">
                <div className="l">{t('results.area')}</div>
                <div className="v"><Num v={r.areas.total} unit={t('common.m2')} /></div>
                {r.areas.basement > 0 && <div className="xs muted"><Num v={r.areas.aboveGround} /> {t('results.aboveGround')} + <Num v={r.areas.basement} /> {t('results.basementArea')}</div>}
              </div>
              <div className="kpi">
                <div className="l">{t('results.typicalRate')}</div>
                <div className="v"><Num v={r.typicalRatePerM2} unit={t('common.kwdm2')} /></div>
              </div>
            </div>
            <div className="line-list" style={{ marginTop: 10 }}>
              <div className="line-item"><span className="lb">{partial ? t('results.constructionPartial') : t('results.construction')}</span><span className="am"><Kwd v={cons.mid} /></span></div>
              {ownerDirect > 0 && <div className="line-item"><span className="lb">{t('lines.owner_direct')}</span><span className="am"><Kwd v={ownerDirect} /></span></div>}
              <div className="line-item"><span className="lb">{t('results.feesCont')}</span><span className="am"><Kwd v={r.feesAndContingency!.mid} /></span></div>
            </div>
            <div className={`total-bar ${partial ? 'partial' : ''}`} data-testid="owner-total">
              <div>
                <div className="l">{partial ? t('results.ownerTotalPartial') : t('results.ownerTotal')}</div>
                <div className="xs muted"><Num v={owner.low} /> – <Num v={owner.high} /> {t('common.kwd')}</div>
              </div>
              <div className="v" data-testid="owner-total-mid"><Kwd v={owner.mid} /></div>
            </div>
            <p className="xs muted" style={{ marginBottom: 0 }}>{t('results.notQuote')}</p>
            <ResultActions s={s} />
          </section>
        </div>
        <div>
          <section className="card" data-testid="rate-used">
            <h2>{t('results.rateUsed')}</h2>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <b className="small">{lang === 'ar' ? rate.label_ar : rate.label_en}</b>
              <ApprovalBadge status={rate.approval_status} />
            </div>
            <div className="kpi" style={{ marginTop: 8 }}>
              <div className="v"><Num v={rate.mid} unit={t('common.kwdm2')} /></div>
              {rate.rangeAvailable && <div className="xs muted">{t('specs.range')}: <span className="num">{rate.low}–{rate.high}</span> {t('common.kwdm2')}</div>}
            </div>
            <p className="xs muted" style={{ margin: '8px 0 0' }}>{rate.source} · {rate.source_date} · {t(`scope.${rate.scope}`)} · {t(`basisType.${rate.price_basis}`)}</p>
          </section>
          <UnpricedPanel r={r} />
          <WarningsPanel r={r} />
        </div>
      </div>
    </div>
  );
}
