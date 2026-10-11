import { useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { IS_ARTIFACT } from '../platform/env';
import { reportToPdf } from '../platform/pdf';
import { saveFile } from '../platform/saveFile';
import { Icon, LogoMark, Note, Num } from '../components/ui';
import { AdditionsTable, KindBadge } from './Breakdown';
import { useScopeLists } from '../components/ScopeMatrix';
import { basisText, issueText } from '../reports/format';
import { BASEMENT_COMPONENTS, SCENARIOS, type BudgetLine, type Triple } from '../types';
import { normaliseNumberText } from '../validation/parse';
import type { AppState } from '../hooks/useAppState';

export default function Report({ s }: { s: AppState }) {
  const { t, lang, setLang, kwd } = useI18n();
  const r = s.result;
  const input = s.input;
  const L = useScopeLists(r);
  const reportRef = useRef<HTMLElement>(null);
  const [busy, setBusy] = useState(false);
  const downloadPdf = async () => {
    if (!reportRef.current || busy) return;
    setBusy(true);
    try {
      const blob = await reportToPdf(reportRef.current);
      // ASCII file name: some browsers reject non-Latin download names.
      const out = await saveFile(`urban-villa-estimate-${lang}-${new Date().toISOString().slice(0, 10)}.pdf`, blob, 'application/pdf');
      if (out === 'saved') s.setToast(t('report.pdfSaved'));
      else if (out === 'failed') s.setToast(t('report.pdfFailed'));
    } catch {
      s.setToast(t('report.pdfFailed'));
    } finally {
      setBusy(false);
    }
  };
  if (r.status === 'blocked') {
    return <div className="card"><Note kind="err">{t('results.blockedTitle')}</Note><button className="btn btn-primary" onClick={() => s.go('results')}>{Icon.back()} {t('common.back')}</button></div>;
  }
  const rate = r.rate!;
  const gs = s.ratebook.grades.find((g) => g.grade === input.grade);
  const partial = r.status === 'partial';
  const noRange = !r.rangeAvailable;
  const scen = (k: string) => t(`results.${k === 'mid' ? 'typical' : k}`);
  const generated = new Date(r.meta.calculatedAt);
  const pad = (x: number) => String(x).padStart(2, '0');
  // ISO-style date: unambiguous and bidi-safe in both Arabic and English reports.
  const dateStr = `${generated.getFullYear()}-${pad(generated.getMonth() + 1)}-${pad(generated.getDate())} ${pad(generated.getHours())}:${pad(generated.getMinutes())}`;
  const plot = Number(normaliseNumberText(input.plotArea)) || null;
  const keyAssumptions = [
    t('report.a1'),
    t('report.a5', { base: t(`basis.pctBase_${input.fees.percentBase === 'above_ground_base' ? 'above_ground' : 'construction'}`) }),
    t('report.a2'),
    t('report.a4'),
    ...(noRange ? [t('results.noRangeNote')] : []),
  ];
  const otherWarnings = r.issues.filter((i) => i.severity !== 'error' && !['PARTIAL_ESTIMATE', 'LOCATION_NOT_PRICED', 'HEIGHT_NOT_PRICED'].includes(i.code)).map((i) => issueText(t, i));

  const Triple3 = ({ v, label, cls }: { v: Triple; label: string; cls?: string }) => (
    <div className={`rbox ${cls ?? ''}`}>
      <div className="rbox-title">{label}</div>
      <div className="budgets">
        {SCENARIOS.map((k) => (
          <div key={k} className={k === 'mid' ? 'typ' : ''}>
            <span className="xs">{scen(k)}</span>
            {k !== 'mid' && noRange ? <b className="na">{t('results.noRange')}</b> : <b className="num">{kwd(v[k])}</b>}
          </div>
        ))}
      </div>
    </div>
  );

  const calcRows = (l: BudgetLine) => {
    const texts = SCENARIOS.map((k) => basisText(t, l, k));
    const same = texts[0] === texts[1] && texts[1] === texts[2];
    const label = <><b>{t(`lines.${l.key}`)}</b> <KindBadge kind={l.kind} /></>;
    if (same) {
      return (
        <tr key={l.key}><td>{label}</td><td className="xs">{scen('low')} = {scen('mid')} = {scen('high')}</td><td><bdi className="formula">{texts[1]}</bdi></td><td className="n"><Num v={l.amount.mid} /></td></tr>
      );
    }
    return SCENARIOS.map((k, i) => (
      <tr key={`${l.key}-${k}`} className={i < 2 ? 'grp' : ''}>
        {i === 0 && <td rowSpan={3}>{label}</td>}
        <td className="xs">{scen(k)}</td>
        <td><bdi className="formula">{texts[i]}</bdi></td>
        <td className="n"><Num v={l.amount[k]} /></td>
      </tr>
    ));
  };

  const Header = () => (
    <header className="rh">
      <div className="logo"><LogoMark size={40} /><span className="wordmark"><b>{t('app.brand')}</b><span>{t('app.brandSub')}</span></span></div>
      <div>
        <h1>{t('report.title')}</h1>
        <div className="meta"><bdi>{input.projectName || t('app.title')}</bdi> · <span className="num">{dateStr}</span></div>
      </div>
    </header>
  );
  const Footer = ({ page }: { page: number }) => (
    <footer className="foot">
      <span>{t('report.generated')}: <span className="num">{dateStr}</span></span>
      <span>{t('report.version')}: <span className="num">{r.meta.engineVersion}</span> · {t('report.ratebook')}: <span className="num">v{r.meta.ratebookVersion}</span></span>
      <span>{t(`report.p${page}`)}</span>
    </footer>
  );

  return (
    <div className="fade-in">
      <div className="report-toolbar no-print">
        <button className="btn btn-ghost btn-sm" onClick={() => s.go('results')}>{Icon.back()} {t('report.back')}</button>
        <button className="btn btn-primary btn-sm" onClick={downloadPdf} disabled={busy} data-testid="download-pdf">{Icon.download()} {busy ? t('report.pdfBusy') : t('report.downloadPdf')}</button>
        {!IS_ARTIFACT && <button className="btn btn-ghost btn-sm" onClick={() => window.print()} data-testid="print-report">{Icon.print()} {t('report.print')}</button>}
        <div className="chips" role="radiogroup" aria-label="Report language">
          <button className="chip" role="radio" aria-checked={lang === 'en'} onClick={() => setLang('en')}>English</button>
          <button className="chip" role="radio" aria-checked={lang === 'ar'} onClick={() => setLang('ar')}>العربية</button>
        </div>
        {!IS_ARTIFACT && <span className="xs muted">{t('report.printHint')}</span>}
      </div>

      <article className="report" data-testid="report" ref={reportRef}>
        {/* ---------------- Page 1: executive summary ---------------- */}
        <div className="rpage">
          <Header />
          <h2 className="ptitle">1. {t('report.p1')}</h2>
          <div className={`status-banner ${partial ? 'partial' : 'complete'}`} data-testid="report-status">
            {partial ? `${t('results.partialLabel')} — ${t('results.partialBody')}` : `${t('results.completeForScope')} — ${t('results.notQuote')}`}
          </div>
          <div className="two-col">
            <dl className="kv">
              <dt>{t('property.projectName')}</dt><dd><bdi>{input.projectName || '—'}</bdi></dd>
              <dt>{t('report.propertyType')}</dt><dd>{t(`property.${input.propertyType}`)}</dd>
              <dt>{t('report.location')}</dt><dd><bdi>{input.location || '—'}</bdi></dd>
              <dt>{t('report.plot')}</dt><dd><Num v={plot} unit={t('common.m2')} /></dd>
            </dl>
            <dl className="kv">
              <dt>{t('floors.totalAbove')}</dt><dd><Num v={r.areas.aboveGround} unit={t('common.m2')} /></dd>
              {input.basement.enabled && <><dt>{t('floors.basement')}</dt><dd><Num v={r.areas.basement} unit={t('common.m2')} /></dd></>}
              <dt>{t('specs.scope')}</dt><dd>{t(`scope.${input.scope}`)}</dd>
              <dt>{t('specs.grade')}</dt><dd>{gs ? (lang === 'ar' ? gs.name_ar : gs.name_en) : input.grade}</dd>
              <dt>{t('report.level')}</dt><dd>{input.level === 2 ? t('results.levelRefined') : t('results.levelQuick')}</dd>
            </dl>
          </div>
          <Triple3 v={r.construction!} label={partial ? t('results.constructionPartial') : t('results.constructionCostTitle')} />
          <Triple3 v={r.ownerTotal!} label={partial ? t('results.ownerTotalPartial') : t('results.ownerBudgetTitle')} cls="owner" />
          <p className="small"><b>{t('results.priceSource')}:</b> <bdi>{lang === 'ar' ? rate.label_ar : rate.label_en} ({rate.rate_id})</bdi> — {t(`approval.${rate.approval_status}`)} · {t(`evidence.${rate.evidence_status}`)} · {t(`confidence.${rate.confidence}`)}</p>
          <h3>{t('report.keyAssumptions')}</h3>
          <ul className="small">{keyAssumptions.map((a, i) => <li key={i}>{a}</li>)}</ul>
          {r.unpriced.length > 0 && <><h3>{t('results.matrixUnpriced')}</h3><ul className="small">{L.unpriced.map((u, i) => <li key={i}>{u}</li>)}</ul></>}
          <Footer page={1} />
        </div>

        {/* ---------------- Page 2: detailed calculations ---------------- */}
        <div className="rpage break">
          <Header />
          <h2 className="ptitle">2. {t('report.p2')}</h2>
          <h3>{t('report.areasByFloor')}</h3>
          <table className="t">
            <thead><tr><th>{t('breakdown.floor')}</th><th className="n">{t('floors.area')}</th><th className="n">{t('breakdown.rate')} ({t('common.kwdm2')})</th></tr></thead>
            <tbody>
              {r.floors.map((f) => (
                <tr key={f.key}><td>{t(`floors.${f.key}`)}{f.rateSource === 'override' ? ' *' : ''}</td><td className="n"><Num v={f.area} /></td>
                  <td className="n"><span className="num">{f.rate ? (f.rate.low === f.rate.high ? f.rate.mid : `${f.rate.low} / ${f.rate.mid} / ${f.rate.high}`) : '—'}</span></td></tr>
              ))}
              {input.basement.enabled && <tr><td>{t('floors.basement')}</td><td className="n"><Num v={r.areas.basement} /></td><td className="n">{r.basementCost ? '' : t('common.unpriced')}</td></tr>}
              <tr className="sub"><td>{t('floors.totalIncl')}</td><td className="n"><Num v={r.areas.total} /></td><td /></tr>
            </tbody>
          </table>

          <h3>{t('report.scenarioTable')}</h3>
          <table className="t calc" data-testid="report-calc">
            <thead><tr><th>{t('breakdown.item')}</th><th>{t('breakdown.scenario')}</th><th>{t('breakdown.formula')}</th><th className="n">{t('breakdown.amount')} ({t('common.kwd')})</th></tr></thead>
            <tbody>
              <tr className="sect"><td colSpan={4}>{t('breakdown.constructionSection')}</td></tr>
              {r.lines.filter((l) => l.group === 'construction').map(calcRows)}
              {r.lines.some((l) => l.group === 'owner') && <tr className="sect"><td colSpan={4}>{t('breakdown.ownerAdditionalSection')}</td></tr>}
              {r.lines.filter((l) => l.group === 'owner').map(calcRows)}
            </tbody>
          </table>

          <h3>{t('report.reconciliation')}</h3>
          <table className="t" data-testid="report-recon">
            <thead><tr><th /><th className="n">{scen('low')}</th><th className="n">{scen('mid')}</th><th className="n">{scen('high')}</th></tr></thead>
            <tbody>
              <tr><td>{partial ? t('results.constructionPartial') : t('results.construction')}</td>{SCENARIOS.map((k) => <td key={k} className="n"><Num v={r.construction![k]} /></td>)}</tr>
              <tr><td>{t('results.ownerAdditional')}</td>{SCENARIOS.map((k) => <td key={k} className="n"><Num v={r.ownerAdditional![k]} /></td>)}</tr>
              <tr className={`grand ${partial ? 'partial' : ''}`}><td>{partial ? t('results.ownerTotalPartial') : t('results.ownerTotal')}</td>{SCENARIOS.map((k) => <td key={k} className="n"><Num v={r.ownerTotal![k]} /></td>)}</tr>
            </tbody>
          </table>
          <p className="xs">{t('report.reconText')} {r.meta.rounding && t('report.a3')}</p>
          {r.additions.length > 0 && <><h3>{t('report.s_additions')}</h3><AdditionsTable r={r} /></>}
          <Footer page={2} />
        </div>

        {/* ---------------- Page 3: specifications and limitations ---------------- */}
        <div className="rpage break">
          <Header />
          <h2 className="ptitle">3. {t('report.p3')}</h2>
          <div className="two-col">
            <div>
              <h3>{t('results.included')}</h3>
              {L.rateInc && <p className="small"><b>{t('results.rateInclusions')}:</b> <bdi>{L.rateInc}</bdi></p>}
              {gs && <><div className="small"><b>{lang === 'ar' ? gs.name_ar : gs.name_en}</b> — {lang === 'ar' ? gs.summary_ar : gs.summary_en}</div>
                <ul className="xs">{gs.items.map((i) => <li key={i.key}>{lang === 'ar' ? i.ar : i.en}</li>)}</ul></>}
              {L.baseline.length > 0 && <><div className="small"><b>{t('results.matrixIncluded')}</b></div><ul className="xs">{L.baseline.map((a) => <li key={a.id}><bdi>{a.description}</bdi></li>)}</ul></>}
              {L.extras.length > 0 && <><div className="small"><b>{t('results.matrixExtras')}</b></div><ul className="xs">{L.extras.map((a) => <li key={a.id}><bdi>{a.description}</bdi> — {kwd(a.net)}</li>)}</ul></>}
              {L.owner.length > 0 && <><div className="small"><b>{t('results.matrixOwner')}</b></div><ul className="xs">{L.owner.map((a) => <li key={a.id}><bdi>{a.description}</bdi> — {kwd(a.net)}</li>)}</ul></>}
            </div>
            <div>
              <h3>{t('results.excluded')}</h3>
              <ul className="xs" data-testid="report-exclusions">
                {L.unpriced.map((u, i) => <li key={`u${i}`}>{u}</li>)}
                {L.excluded.map((a) => <li key={a.id}><bdi>{a.description}</bdi> — {t('scopeStatus.excluded')}</li>)}
                {L.rateExc && <li>{t('results.rateExclusions')}: <bdi>{L.rateExc}</bdi></li>}
                <li>{t('report.a4')}</li>
              </ul>
              {input.basement.enabled && input.basement.pricingMode !== 'none' && (
                <p className="xs">{t('basement.includes')} {BASEMENT_COMPONENTS.filter((c) => input.basement.includes.includes(c)).map((c) => t(`basement.c_${c}`)).join(t('common.sep')) || t('report.noneItems')}</p>
              )}
            </div>
          </div>

          <h3>{t('report.s_rate')}</h3>
          <dl className="kv">
            <dt>{t('results.rateUsed')}</dt><dd><bdi>{lang === 'ar' ? rate.label_ar : rate.label_en} ({rate.rate_id})</bdi></dd>
            <dt>{t('specs.selectedRate')}</dt><dd><span className="num">{rate.rangeAvailable ? `${rate.low} / ${rate.mid} / ${rate.high}` : rate.mid}</span> {t('common.kwdm2')}</dd>
            <dt>{t('common.source')}</dt><dd><bdi>{rate.source}</bdi></dd>
            <dt>{t('report.rateDate')}</dt><dd><span className="num">{rate.source_date}</span></dd>
            <dt>{t('report.approval')}</dt><dd>{t(`approval.${rate.approval_status}`)}</dd>
            <dt>{t('report.evidence')}</dt><dd>{t(`evidence.${rate.evidence_status}`)}</dd>
            <dt>{t('report.confidence')}</dt><dd>{t(`confidence.${rate.confidence}`)}</dd>
          </dl>

          {input.level === 2 && (
            <>
              <h3>{t('report.refinedAnswers')}</h3>
              <ul className="xs">
                <li>{t('refined.cantilevers')} {t(`common.${input.refined.cantilevers}`)}</li>
                <li>{t('refined.specialStructure')} {t(`common.${input.refined.specialStructure}`)}</li>
                <li>{t('refined.structuralDrawings')} {t(`common.${input.refined.structuralDrawings}`)}</li>
                <li>{t('refined.siteDifficulties')}: {input.refined.siteDifficulties.map((d) => t(`refined.sd_${d}`)).join(t('common.sep')) || t('report.noneItems')}</li>
              </ul>
            </>
          )}

          {otherWarnings.length > 0 && <><h3>{t('report.s_assumptions')}</h3><ul className="xs">{otherWarnings.map((w, i) => <li key={i}>{w}</li>)}</ul></>}
          <h3>{t('report.s_disclaimer')}</h3>
          <p className="disclaimer">{t('report.disclaimer')}</p>
          <Footer page={3} />
        </div>
      </article>
    </div>
  );
}
