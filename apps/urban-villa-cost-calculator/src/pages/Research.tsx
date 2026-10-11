import { useState } from 'react';
import { useI18n } from '../i18n';
import { Note, NumberField, Num } from '../components/ui';
import {
  ALHISBA_MATRIX, ALHISBA_RUNS, COMPETITORS, PUBLISHED_RATES, TAQEEM, alhisbaCategoryAmounts, alhisbaReconciliation,
  coverageArea, mfatahExample, taqeemDifference, varndaPublishedExample,
} from '../calculators/research';
import { mfatahExampleInput, varndaExampleInput } from '../lib/defaults';
import type { AppState } from '../hooks/useAppState';

type Tab = 'alhisba' | 'taqeem' | 'rates' | 'examples' | 'methods';

export default function Research({ s }: { s: AppState }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('alhisba');
  const tabs: [Tab, string][] = [['alhisba', 'tAlhisba'], ['examples', 'tExamples'], ['taqeem', 'tTaqeem'], ['rates', 'tRates'], ['methods', 'tMethods']];
  return (
    <div className="fade-in">
      <div className="page-head"><h1>{t('research.title')}</h1><p>{t('research.sub')}</p></div>
      <div className="tabs" role="tablist">
        {tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} data-testid={`rtab-${k}`}>{t(`research.${l}`)}</button>)}
      </div>
      {tab === 'alhisba' && <Alhisba />}
      {tab === 'examples' && <Examples s={s} />}
      {tab === 'taqeem' && <Taqeem />}
      {tab === 'rates' && <Rates />}
      {tab === 'methods' && <Methods />}
    </div>
  );
}

const v = (x: unknown) => (x === null || x === undefined || x === '' ? '—' : String(x));

function Alhisba() {
  const { t } = useI18n();
  const [plot, setPlot] = useState('400');
  const [cov, setCov] = useState('80');
  const [floors, setFloors] = useState('2');
  const recs = ALHISBA_RUNS.map((r) => alhisbaReconciliation(r.run_id));
  const p = Number(plot), c = Number(cov), f = Number(floors);
  const hyp = Number.isFinite(p) && Number.isFinite(c) && Number.isInteger(f) && p > 0 && c > 0 && c <= 100 && f > 0 ? coverageArea(p, c, f) : null;
  return (
    <>
      <section className="card">
        <h2>{t('research.alObs')}</h2>
        <Note kind="warn">{t('research.alObsNote')}</Note>
        <div className="table-wrap">
          <table className="t" data-testid="alhisba-runs">
            <thead><tr><th>{t('research.run')}</th><th>{t('research.scenario')}</th><th className="n">{t('research.plot')}</th><th className="n">{t('research.floors')}</th><th>{t('research.basement')}</th><th>{t('research.grade')}</th><th className="n">{t('research.area')}</th><th className="n">{t('research.total')}</th><th className="n">{t('research.catSum')}</th><th className="n">{t('research.gap')}</th><th className="n">{t('research.perM2')}</th><th>{t('research.status')}</th></tr></thead>
            <tbody>
              {recs.map(({ run, visibleSum, difference, normalizedKwdPerM2, fullyObserved }) => (
                <tr key={run.run_id} className={fullyObserved ? 'observed' : ''}>
                  <td className="num"><b>{run.run_id}</b></td><td>{run.name}</td>
                  <td className="n">{v(run.land_area_m2)}</td><td className="n">{v(run.above_ground_floors)}</td><td>{run.basement}</td><td>{run.grade}</td>
                  <td className="n">{v(run.reported_building_area_m2)}</td>
                  <td className="n"><b><Num v={run.reported_total_kwd} /></b></td><td className="n"><Num v={visibleSum} /></td>
                  <td className="n" style={{ color: 'var(--red-600)' }}><Num v={difference} /></td>
                  <td className="n">{normalizedKwdPerM2 !== null ? <Num v={normalizedKwdPerM2} /> : '—'}</td>
                  <td className="xs">{run.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>{t('research.categories')}</h2>
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>{t('research.category')}</th>{ALHISBA_RUNS.map((r) => <th className="n" key={r.run_id}>{r.run_id}</th>)}</tr></thead>
            <tbody>
              {alhisbaCategoryAmounts('AL-004').map((c, i) => (
                <tr key={c.category}><td>{c.category}</td>{ALHISBA_RUNS.map((r) => <td className="n" key={r.run_id}><Num v={alhisbaCategoryAmounts(r.run_id)[i].amount} /></td>)}</tr>
              ))}
              <tr className="sub"><td>{t('research.catSum')}</td>{recs.map((r) => <td className="n" key={r.run.run_id}><Num v={r.visibleSum} /></td>)}</tr>
              <tr><td>{t('research.total')}</td>{recs.map((r) => <td className="n" key={r.run.run_id}><Num v={r.reportedTotal} /></td>)}</tr>
              <tr><td>{t('research.gap')}</td>{recs.map((r) => <td className="n" key={r.run.run_id} style={{ color: 'var(--red-600)' }}><Num v={r.difference} /></td>)}</tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>{t('research.coverageTool')}</h2>
        <Note kind="gold">{t('research.coverageNote')}</Note>
        <div className="grid3">
          <NumberField label={t('research.plot')} value={plot} onChange={setPlot} unit="m²" />
          <NumberField label={t('floors.coverage')} value={cov} onChange={setCov} unit="%" />
          <NumberField label={t('research.floors')} value={floors} onChange={setFloors} />
        </div>
        <div className="kpi"><div className="l">{t('research.predicted')}</div><div className="v" data-testid="coverage-result"><Num v={hyp} unit="m²" /></div></div>
      </section>

      <section className="card">
        <h2>{t('research.matrix')}</h2>
        <p className="small muted">{t('research.matrixNote')}</p>
        <div className="table-wrap">
          <table className="t" data-testid="alhisba-matrix">
            <thead><tr><th>ID</th><th className="n">{t('research.floors')}</th><th>{t('research.basement')}</th><th>{t('research.grade')}</th><th className="n">{t('research.predicted')}</th><th className="n">{t('research.area')}</th><th className="n">{t('research.observedTotal')}</th><th>{t('research.status')}</th></tr></thead>
            <tbody>
              {ALHISBA_MATRIX.map((m) => (
                <tr key={String(m.test_id)} className={m.observed_total_kwd ? 'observed' : ''}>
                  <td className="num xs">{m.test_id}</td><td className="n">{m.floors_above_ground}</td><td>{m.basement}</td><td>{m.grade}</td>
                  <td className="n">{v(m.predicted_area_m2)}</td><td className="n">{v(m.observed_building_area_m2)}</td>
                  <td className="n">{m.observed_total_kwd ? <b><Num v={Number(m.observed_total_kwd)} /></b> : ''}</td>
                  <td className="xs">{m.result_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Examples({ s }: { s: AppState }) {
  const { t } = useI18n();
  const vr = varndaPublishedExample();
  const mf = mfatahExample();
  const al = alhisbaReconciliation('AL-004');
  const load = (which: 'v' | 'm') => { s.setInput(which === 'v' ? varndaExampleInput() : mfatahExampleInput()); s.setReopened(null); s.go('results'); };
  return (
    <div className="grid3" style={{ alignItems: 'start' }}>
      <section className="card" data-testid="ex-varnda">
        <h2>{t('research.exVarnda')}</h2>
        <table className="t"><tbody>
          <tr><td className="num">960 × 150</td><td className="n"><Num v={vr.base} /></td></tr>
          <tr><td className="num">8% × 144,000</td><td className="n"><Num v={vr.design} /></td></tr>
          <tr><td className="num">7% × 144,000</td><td className="n"><Num v={vr.contingency} /></td></tr>
          <tr><td>{t('lines.fixed_fees')}</td><td className="n"><Num v={vr.fees} /></td></tr>
          <tr className="grand"><td>{t('research.total')}</td><td className="n"><Num v={vr.total} /> KWD</td></tr>
        </tbody></table>
        <p className="xs muted">Published illustrative example — not an Urban quotation.</p>
        <button className="btn btn-ghost btn-sm" onClick={() => load('v')}>{t('research.loadInCalc')}</button>
      </section>
      <section className="card" data-testid="ex-mfatah">
        <h2>{t('research.exMfatah')}</h2>
        <table className="t"><tbody>
          <tr><td className="num">{mf.area} m² × {mf.rate} KWD/m²</td><td className="n"><Num v={mf.construction} /></td></tr>
          <tr className="grand"><td>{t('results.construction')}</td><td className="n"><Num v={mf.construction} /> KWD</td></tr>
        </tbody></table>
        <p className="xs muted">Advertised rate × area; excludes fees and additions.</p>
        <button className="btn btn-ghost btn-sm" onClick={() => load('m')}>{t('research.loadInCalc')}</button>
      </section>
      <section className="card" data-testid="ex-alhisba">
        <h2>{t('research.exAlhisba')}</h2>
        <table className="t"><tbody>
          <tr><td>{t('research.plot')}</td><td className="n">400 m²</td></tr>
          <tr><td>{t('research.floors')}</td><td className="n">2</td></tr>
          <tr><td>{t('research.area')}</td><td className="n">640 m²</td></tr>
          <tr><td>{t('research.basement')}</td><td className="n">No</td></tr>
          <tr><td>{t('research.grade')}</td><td className="n">C</td></tr>
          <tr className="grand"><td>{t('research.observedTotal')}</td><td className="n"><Num v={al.reportedTotal} /> KWD</td></tr>
          <tr><td>{t('research.perM2')}</td><td className="n"><Num v={al.normalizedKwdPerM2} /></td></tr>
        </tbody></table>
        <Note kind="warn">{t('research.observedOnly')}</Note>
      </section>
    </div>
  );
}

function Taqeem() {
  const { t } = useI18n();
  const cols = Object.keys(TAQEEM[0]);
  return (
    <section className="card">
      <h2>{t('research.tTaqeem')}</h2>
      <Note kind="warn">{t('research.tqNote')}</Note>
      <div className="table-wrap">
        <table className="t" data-testid="taqeem-table">
          <thead><tr><th>Field</th>{TAQEEM.map((r) => <th key={r.id}>{r.id}</th>)}</tr></thead>
          <tbody>
            {cols.filter((c) => c !== 'id').map((c) => (
              <tr key={c}><td className="xs"><b>{c}</b></td>{TAQEEM.map((r) => <td key={r.id} className={c === 'total_kwd' ? 'n' : 'xs'}>{c === 'total_kwd' ? <b><Num v={Number(r[c])} /></b> : String(r[c])}</td>)}</tr>
            ))}
            <tr className="sub"><td>{t('research.tqDiff')}</td><td className="n" colSpan={TAQEEM.length}><Num v={taqeemDifference()} /> KWD</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Rates() {
  const { t } = useI18n();
  return (
    <section className="card">
      <h2>{t('research.tRates')}</h2>
      <Note kind="warn">{t('research.rtNote')}</Note>
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>ID</th><th>Category</th><th>Scope</th><th>Grade</th><th>Unit</th><th className="n">Low</th><th className="n">Mid</th><th className="n">High</th><th>Date</th><th>Authority</th><th>Notes</th></tr></thead>
          <tbody>
            {PUBLISHED_RATES.map((r) => (
              <tr key={String(r.rate_id)}>
                <td className="num"><b>{r.rate_id}</b></td><td className="xs">{r.category}</td><td className="xs">{r.scope}</td><td className="xs">{r.grade}</td><td className="xs">{r.unit}</td>
                <td className="n">{v(r.low_kwd)}</td><td className="n">{v(r.mid_kwd)}</td><td className="n">{v(r.high_kwd)}</td>
                <td className="num xs">{r.source_date}</td><td className="xs">{r.authority}</td><td className="xs">{r.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Methods() {
  const { t } = useI18n();
  return (
    <section className="card">
      <h2>{t('research.tMethods')}</h2>
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>Company</th><th>{t('research.market')}</th><th>{t('research.method')}</th><th>{t('research.evidence')}</th><th>{t('research.case')}</th></tr></thead>
          <tbody>
            {COMPETITORS.map((c) => (
              <tr key={c.company}><td><b>{c.company}</b></td><td className="xs">{c.market}</td><td className="xs">{c.method}</td><td className="xs">{c.formula_evidence}</td><td className="xs">{c.reproducible_case}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
