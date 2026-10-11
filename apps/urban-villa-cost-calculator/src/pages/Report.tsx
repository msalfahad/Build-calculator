import { useI18n } from '../i18n';
import { Icon, LogoMark, Note, Num } from '../components/ui';
import { AdditionsTable, BreakdownTable } from './Breakdown';
import { basisText, issueText, unpricedText } from '../reports/format';
import { BASEMENT_COMPONENTS } from '../types';
import { normaliseNumberText } from '../validation/parse';
import type { AppState } from '../hooks/useAppState';

export default function Report({ s }: { s: AppState }) {
  const { t, lang, setLang, kwd } = useI18n();
  const r = s.result;
  const input = s.input;
  if (r.status === 'blocked') {
    return <div className="card"><Note kind="err">{t('results.blockedTitle')}</Note><button className="btn btn-primary" onClick={() => s.go('results')}>{Icon.back()} {t('common.back')}</button></div>;
  }
  const rate = r.rate!;
  const gs = s.ratebook.grades.find((g) => g.grade === input.grade);
  const partial = r.status === 'partial';
  const ownerLines = r.lines.filter((l) => l.key === 'design' || l.key === 'fixed_fees' || l.key === 'contingency');
  const ownerDirectRows = input.ownerDirect.filter((o) => o.amount.trim());
  const exclusions: string[] = [
    ...r.unpriced.map((u) => unpricedText(t, u)),
    ...r.issues.filter((i) => i.code === 'BASEMENT_EXCLUSIONS' || i.code === 'SHORING_UNKNOWN' || i.code === 'GROUNDWATER_UNKNOWN').map((i) => issueText(t, i)),
    
    t('report.a4'),
  ];
  const assumptions: string[] = [
    t('report.a1'),
    t('report.a2'),
    t('report.a3'),
    t('report.a5', { base: t(`basis.pctBase_${input.fees.percentBase === 'above_ground_base' ? 'above_ground' : 'construction'}`) }),
    ...r.issues.filter((i) => i.severity !== 'error' && !['BASEMENT_EXCLUSIONS', 'SHORING_UNKNOWN', 'GROUNDWATER_UNKNOWN', 'PARTIAL_ESTIMATE', 'LOCATION_NOT_PRICED', 'HEIGHT_NOT_PRICED'].includes(i.code)).map((i) => issueText(t, i)),
  ];
  const generated = new Date(r.meta.calculatedAt);
  const pad = (x: number) => String(x).padStart(2, '0');
  // ISO-style date: unambiguous and bidi-safe in both Arabic and English reports.
  const dateStr = `${generated.getFullYear()}-${pad(generated.getMonth() + 1)}-${pad(generated.getDate())} ${pad(generated.getHours())}:${pad(generated.getMinutes())}`;
  let n = 0;
  const H = ({ k }: { k: string }) => <h2><span className="sn">{++n}.</span> {t(`report.${k}`)}</h2>;

  return (
    <div className="fade-in">
      <div className="report-toolbar no-print">
        <button className="btn btn-ghost btn-sm" onClick={() => s.go('results')}>{Icon.back()} {t('report.back')}</button>
        <button className="btn btn-primary btn-sm" onClick={() => window.print()} data-testid="print-report">{Icon.print()} {t('report.print')}</button>
        <div className="chips" role="radiogroup" aria-label="Report language">
          <button className="chip" role="radio" aria-checked={lang === 'en'} onClick={() => setLang('en')}>English</button>
          <button className="chip" role="radio" aria-checked={lang === 'ar'} onClick={() => setLang('ar')}>العربية</button>
        </div>
        <span className="xs muted">{t('report.printHint')}</span>
      </div>

      <article className="report" data-testid="report">
        {/* 1 — branding */}
        <header className="rh">
          <div className="logo"><LogoMark size={44} /><span className="wordmark"><b>{t('app.brand')}</b><span>{t('app.brandSub')}</span></span></div>
          <div>
            <h1>{t('report.title')}</h1>
            <div className="meta"><bdi>{input.projectName || t('app.title')}</bdi> · <span className="num">{dateStr}</span></div>
          </div>
        </header>
        <div className={`status-banner ${partial ? 'partial' : 'complete'}`}>
          {partial ? `${t('results.partialTitle')} — ${t('results.partialBody')}` : t('results.notQuote')}
        </div>

        <section>
          <H k="s_project" />
          <dl className="kv">
            <dt>{t('property.projectName')}</dt><dd><bdi>{input.projectName || '—'}</bdi></dd>
            <dt>{t('report.propertyType')}</dt><dd>{t(`property.${input.propertyType}`)}</dd>
            <dt>{t('report.location')}</dt><dd>{input.location || '—'}</dd>
            {input.siteNotes && <><dt>{t('report.siteNotes')}</dt><dd>{input.siteNotes}</dd></>}
          </dl>
        </section>

        <section>
          <H k="s_areas" />
          <table className="t">
            <tbody>
              <tr><td>{t('report.plot')}</td><td className="n"><Num v={Number(normaliseNumberText(input.plotArea)) || null} unit={t('common.m2')} /></td></tr>
              {r.areas.perFloor.map((f) => <tr key={f.key}><td>{t(`floors.${f.key}`)}</td><td className="n"><Num v={f.area} unit={t('common.m2')} /></td></tr>)}
              <tr className="sub"><td>{t('floors.totalAbove')}</td><td className="n"><Num v={r.areas.aboveGround} unit={t('common.m2')} /></td></tr>
              {input.basement.enabled && <tr><td>{t('floors.basement')} ({t(`basement.f_${input.basement.finish}`)})</td><td className="n"><Num v={r.areas.basement} unit={t('common.m2')} /></td></tr>}
              <tr className="sub"><td>{t('floors.totalIncl')}</td><td className="n"><Num v={r.areas.total} unit={t('common.m2')} /></td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <H k="s_scope" />
          <dl className="kv">
            <dt>{t('specs.scope')}</dt><dd>{t(`scope.${input.scope}`)}</dd>
            <dt>{t('specs.grade')}</dt><dd>{gs ? (lang === 'ar' ? gs.name_ar : gs.name_en) : input.grade} — {gs ? (lang === 'ar' ? gs.summary_ar : gs.summary_en) : ''}</dd>
            {input.floorHeight && <><dt>{t('specs.floorHeight')}</dt><dd><span className="num">{input.floorHeight}</span> m</dd></>}
          </dl>
          {gs && <ul className="xs" style={{ marginTop: 6 }}>{gs.items.map((i) => <li key={i.key}>{lang === 'ar' ? i.ar : i.en}</li>)}</ul>}
        </section>

        <section>
          <H k="s_rate" />
          <dl className="kv">
            <dt>{t('results.rateUsed')}</dt><dd>{lang === 'ar' ? rate.label_ar : rate.label_en} ({rate.rate_id})</dd>
            <dt>{t('specs.selectedRate')}</dt><dd><span className="num">{rate.low} / {rate.mid} / {rate.high}</span> {t('common.kwdm2')}</dd>
            <dt>{t('common.source')}</dt><dd><bdi>{rate.source}</bdi></dd>
            <dt>{t('report.rateDate')}</dt><dd><span className="num">{rate.source_date}</span></dd>
            <dt>{t('report.approval')}</dt><dd>{t(`approval.${rate.approval_status}`)}</dd>
            {rate.inclusions && <><dt>{t('report.inclusions')}</dt><dd style={{ fontWeight: 400 }}><bdi>{rate.inclusions}</bdi></dd></>}
          </dl>
        </section>

        <section>
          <H k="s_budgets" />
          <div className="budgets">
            <div><span className="xs">{t('results.low')}</span><b className="num">{kwd(r.ownerTotal!.low)}</b></div>
            <div className="typ"><span className="xs">{t('results.typical')}</span><b className="num">{kwd(r.ownerTotal!.mid)}</b></div>
            <div><span className="xs">{t('results.high')}</span><b className="num">{kwd(r.ownerTotal!.high)}</b></div>
          </div>
          <p className="xs" style={{ margin: '6px 0 0' }}>{partial ? t('results.ownerTotalPartial') : t('results.ownerTotal')} · {t('results.typicalRate')}: <Num v={r.typicalRatePerM2} unit={t('common.kwdm2')} /></p>
        </section>

        <section>
          <H k="s_breakdown" />
          <BreakdownTable r={r} compact />
        </section>

        <section>
          <H k="s_additions" />
          <AdditionsTable r={r} />
        </section>

        <section>
          <H k="s_owner" />
          {ownerDirectRows.length ? (
            <table className="t"><tbody>{ownerDirectRows.map((o) => <tr key={o.id}><td>{o.description || '—'}</td><td className="n"><Num v={Number(normaliseNumberText(o.amount))} /></td></tr>)}</tbody></table>
          ) : <p className="small">{t('report.noneItems')}</p>}
        </section>

        <section>
          <H k="s_fees" />
          {ownerLines.length ? (
            <table className="t"><tbody>{ownerLines.map((l) => <tr key={l.key}><td>{t(`lines.${l.key}`)}<div className="basis">{basisText(t, l)}</div></td><td className="n"><Num v={l.amount.mid} /></td></tr>)}</tbody></table>
          ) : <p className="small">{t('report.noneItems')}</p>}
        </section>

        <section>
          <H k="s_assumptions" />
          <ul className="small">{assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </section>

        <section>
          <H k="s_exclusions" />
          <ul className="small" data-testid="report-exclusions">{exclusions.map((a, i) => <li key={i}>{a}</li>)}{rate.exclusions && <li>{t('report.exclusions')} (<bdi>{rate.rate_id}</bdi>): <bdi>{rate.exclusions}</bdi></li>}</ul>
          {input.basement.enabled && input.basement.pricingMode !== 'none' && (
            <p className="xs">{t('basement.includes')} {BASEMENT_COMPONENTS.filter((c) => input.basement.includes.includes(c)).map((c) => t(`basement.c_${c}`)).join(t('common.sep')) || t('report.noneItems')}</p>
          )}
        </section>

        <section>
          <H k="s_disclaimer" />
          <p className="disclaimer">{t('report.disclaimer')}</p>
        </section>

        <footer className="foot">
          <span>{t('report.generated')}: <span className="num">{dateStr}</span></span>
          <span>{t('report.version')}: <span className="num">{r.meta.engineVersion}</span> · {t('report.ratebook')}: <span className="num">v{r.meta.ratebookVersion}</span></span>
          <span>{t('app.brand')} — {t('app.title')}</span>
        </footer>
      </article>
    </div>
  );
}
