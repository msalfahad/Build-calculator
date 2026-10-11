import { useMemo, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { ApprovalBadge, Icon, Modal, Note, NumberField, SelectField, Switch, TextField } from '../components/ui';
import {
  ADMIN_ENABLED, DEFAULT_RATEBOOK, approveRate, blankRate, cloneRatebook, migrateRatebook, setRateActive, upsertRate, validateRatebook,
} from '../lib/ratebookStore';
import { downloadJson } from '../lib/savedEstimates';
import { COMPONENT_CATALOG, newId } from '../lib/defaults';
import { confidenceLevel } from '../calculators/evidence';
import { rateQualityIssues } from '../calculators/rateSelection';
import { absolutePercentageError, calibrationCsv, calibrationStats, normalisedActual } from '../calculators/calibration';
import { IssueCollector, parseNonNegative } from '../validation/parse';
import { issueText } from '../reports/format';
import {
  APPROVAL_STATUSES, EVIDENCE_STATUSES, GRADES, type CalibrationProject, type ConfidenceFactors, type EvidenceCategory, type FactorLevel,
  type GradeSpec, type Rate, type Ratebook,
} from '../types';
import type { AppState } from '../hooks/useAppState';

const numStr = (v: number | null) => (v === null ? '' : String(v));
type Tab = 'rates' | 'compare' | 'grades' | 'log' | 'calibration';

function rateWarnings(r: Rate, today = new Date()) {
  const c = new IssueCollector();
  rateQualityIssues(r, c, today, r.category === 'addition' ? 'addition' : r.category);
  return c.issues;
}

export default function Admin({ s }: { s: AppState }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('rates');
  const [editing, setEditing] = useState<Rate | null>(null);
  const [approving, setApproving] = useState<Rate | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const rb = s.ratebook;

  if (!ADMIN_ENABLED) {
    return <div className="card" data-testid="admin-disabled"><Note kind="warn">{t('admin.publicGate')}</Note></div>;
  }

  const onImport = async (f: File) => {
    try {
      const parsed = migrateRatebook(JSON.parse(await f.text()) as Ratebook);
      const err = validateRatebook(parsed);
      if (err) throw new Error(err);
      const at = new Date().toISOString();
      const version = Math.max(parsed.ratebook_version, rb.ratebook_version) + 1;
      s.setRatebook({ ...parsed, ratebook_version: version, updated_at: at, changelog: [{ at, rate_id: '*', action: 'import', ratebook_version: version }, ...(parsed.changelog ?? [])] });
      s.setToast(t('admin.importOk'));
    } catch (e) {
      s.setToast(t('admin.importErr', { msg: (e as Error).message }));
    }
  };
  const reset = () => {
    if (!window.confirm(t('admin.resetConfirm'))) return;
    const d = cloneRatebook(DEFAULT_RATEBOOK);
    const at = new Date().toISOString();
    const version = rb.ratebook_version + 1;
    s.setRatebook({ ...d, ratebook_version: version, updated_at: at, changelog: [{ at, rate_id: '*', action: 'reset', ratebook_version: version }, ...rb.changelog] });
  };

  const tabs: [Tab, string][] = [['rates', 'tabRates'], ['compare', 'tabCompare'], ['grades', 'tabGrades'], ['log', 'tabLog'], ['calibration', 'tabCalibration']];
  return (
    <div className="fade-in">
      <div className="page-head">
        <h1>{t('admin.title')}</h1>
        <p>{t('admin.sub')} · {t('admin.rbVersion')} <b className="num" data-testid="rb-version">v{rb.ratebook_version}</b></p>
      </div>
      <Note kind="warn">{t('admin.localNote')}</Note>
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing(blankRate())} data-testid="add-rate">{Icon.plus()} {t('admin.addRate')}</button>
        <button className="btn btn-ghost btn-sm" onClick={() => downloadJson(`urban-ratebook-v${rb.ratebook_version}.json`, rb)}>{t('admin.exportRb')}</button>
        <button className="btn btn-ghost btn-sm" onClick={() => file.current?.click()}>{t('admin.importRb')}</button>
        <input ref={file} type="file" accept=".json,application/json" hidden data-testid="import-ratebook" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ''; }} />
        <button className="btn btn-danger btn-sm" onClick={reset}>{t('admin.resetRb')}</button>
      </div>
      <div className="tabs" role="tablist">
        {tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} data-testid={`atab-${k}`}>{t(`admin.${l}`)}</button>)}
      </div>

      {tab === 'rates' && <RatesTable rb={rb} s={s} onEdit={setEditing} onApprove={setApproving} />}
      {tab === 'compare' && <Compare rb={rb} />}
      {tab === 'grades' && <GradesEditor s={s} />}
      {tab === 'log' && <ChangeLog rb={rb} />}
      {tab === 'calibration' && <Calibration s={s} />}

      {editing && <RateEditor rate={editing} isNew={!rb.rates.some((r) => r.rate_id === editing.rate_id) || editing.rate_id === ''} onClose={() => setEditing(null)}
        onSave={(r) => { s.setRatebook(upsertRate(rb, r)); setEditing(null); }} existingIds={rb.rates.map((r) => r.rate_id)} />}
      {approving && <ApproveDialog rate={approving} onClose={() => setApproving(null)} onApprove={(name) => { s.setRatebook(approveRate(rb, approving.rate_id, name)); setApproving(null); }} />}
    </div>
  );
}

function RatesTable({ rb, s, onEdit, onApprove }: { rb: Ratebook; s: AppState; onEdit: (r: Rate) => void; onApprove: (r: Rate) => void }) {
  const { t, lang } = useI18n();
  return (
    <section className="card">
      <div className="table-wrap">
        <table className="t" data-testid="rates-table">
          <thead>
            <tr>
              <th>{t('admin.id')}</th><th>{t('admin.labelEn')}</th><th>{t('admin.scope')}</th><th>{t('admin.grade')}</th>
              <th className="n">{t('admin.low')}</th><th className="n">{t('admin.mid')}</th><th className="n">{t('admin.high')}</th>
              <th>{t('admin.approval')}</th><th>{t('admin.evidence')}</th><th>{t('admin.sourceDate')}</th><th>{t('admin.warnings')}</th><th>{t('admin.version')}</th><th>{t('admin.active')}</th><th />
            </tr>
          </thead>
          <tbody>
            {rb.rates.map((r) => {
              const w = rateWarnings(r).filter((i) => i.code !== 'RATE_NOT_APPROVED');
              return (
                <tr key={r.rate_id} style={{ opacity: r.active ? 1 : 0.5 }}>
                  <td className="num"><b>{r.rate_id}</b></td>
                  <td>{lang === 'ar' ? r.label_ar || r.label_en : r.label_en}<div className="basis"><bdi>{r.source}</bdi></div></td>
                  <td>{t(`scope.${r.scope}`)}</td>
                  <td>{r.grade}{r.grade_system !== 'urban' && <div className="basis">{t(`admin.gs_${r.grade_system}`)}</div>}</td>
                  <td className="n">{r.price_low ?? '—'}</td><td className="n"><b>{r.price_mid ?? '—'}</b></td><td className="n">{r.price_high ?? '—'}</td>
                  <td><ApprovalBadge status={r.approval_status} />{r.approver && <div className="basis">{t('admin.approvedBy')}: <bdi>{r.approver}</bdi></div>}</td>
                  <td><span className="badge b-neutral">{t(`evidence.${r.evidence_status}`)}</span><div className="basis">{t(`confidence.${confidenceLevel(r)}`)}</div></td>
                  <td className="num">{r.source_date || '—'}</td>
                  <td className="xs" style={{ minWidth: 160 }}>{w.length ? <ul style={{ margin: 0, paddingInlineStart: 14, color: 'var(--amber-600)' }}>{w.map((i, k) => <li key={k}>{issueText(t, i)}</li>)}</ul> : <span className="muted">{t('admin.noWarnings')}</span>}</td>
                  <td className="num">{r.version}</td>
                  <td><Switch checked={r.active} onChange={(v) => s.setRatebook(setRateActive(rb, r.rate_id, v))} label={<span className="sr-only">{t('admin.active')}</span>} /></td>
                  <td>
                    <div className="row" style={{ flexWrap: 'nowrap', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => onEdit({ ...r })} data-testid={`edit-${r.rate_id}`}>{t('common.edit')}</button>
                      {r.approval_status !== 'urban_approved' && <button className="btn btn-ghost btn-sm" onClick={() => onApprove(r)} data-testid={`approve-${r.rate_id}`}>{t('admin.approve')}</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ApproveDialog({ rate, onClose, onApprove }: { rate: Rate; onClose: () => void; onApprove: (name: string) => void }) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  return (
    <Modal title={`${t('admin.approveTitle')} — ${rate.rate_id}`} onClose={onClose}>
      <Note kind="warn">{t('admin.approveNote')}</Note>
      {rate.evidence_status === 'verified_published_claim' && <Note kind="err">{t('issues.RATE_UNVERIFIED_METHOD', { rate: rate.rate_id, evidence: t('evidence.verified_published_claim') })}</Note>}
      <TextField label={t('admin.approver')} value={name} onChange={setName} testId="approver-name" />
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
        <button className="btn btn-primary" disabled={!name.trim()} onClick={() => onApprove(name)} data-testid="confirm-approve">{t('admin.approve')}</button>
      </div>
    </Modal>
  );
}

function Compare({ rb }: { rb: Ratebook }) {
  const { t } = useI18n();
  const groups = useMemo(() => {
    const m = new Map<string, Rate[]>();
    for (const r of rb.rates) {
      const k = r.category === 'building' ? `${t(`scope.${r.scope}`)} · ${r.grade_system === 'urban' ? t(`gradeNames.${r.grade}`) : `${r.grade} (${t(`admin.gs_${r.grade_system}`)})`}` : `${t(`admin.cat_${r.category}`)} · ${r.trade_category || r.grade}`;
      m.set(k, [...(m.get(k) ?? []), r]);
    }
    return [...m.entries()];
  }, [rb, t]);
  return (
    <section className="card" data-testid="compare">
      <Note>{t('admin.compareNote')}</Note>
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>{t('admin.group')}</th><th>{t('admin.id')}</th><th className="n">{t('admin.low')}</th><th className="n">{t('admin.mid')}</th><th className="n">{t('admin.high')}</th><th>{t('admin.basis')}</th><th>{t('admin.source')}</th><th>{t('admin.sourceDate')}</th><th>{t('admin.evidence')}</th><th>{t('confidence.label')}</th><th>{t('admin.approval')}</th></tr></thead>
          <tbody>
            {groups.map(([g, rates]) => rates.map((r, i) => (
              <tr key={r.rate_id} className={i < rates.length - 1 ? 'grp' : ''}>
                {i === 0 && <td rowSpan={rates.length}><b>{g}</b><div className="basis">{rates.length}</div></td>}
                <td className="num">{r.rate_id}{!r.active && ' ⊘'}</td>
                <td className="n">{r.price_low ?? '—'}</td><td className="n"><b>{r.price_mid ?? '—'}</b></td><td className="n">{r.price_high ?? '—'}</td>
                <td className="xs">{t(`basisType.${r.price_basis}`)}</td>
                <td className="xs"><bdi>{r.source}</bdi>{r.quote_ref && <div className="basis">{r.quote_ref}</div>}</td>
                <td className="num xs">{r.source_date || '—'}{r.valid_until && <div className="basis">→ {r.valid_until}</div>}</td>
                <td className="xs">{t(`evidence.${r.evidence_status}`)}<div className="basis">{r.evidence_category ? t(`evidenceCategory.${r.evidence_category}`) : t('evidenceCategory.none')}</div></td>
                <td className="xs">{t(`confidence.${confidenceLevel(r)}`)}</td>
                <td><ApprovalBadge status={r.approval_status} /></td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ChangeLog({ rb }: { rb: Ratebook }) {
  const { t } = useI18n();
  const [filter, setFilter] = useState('');
  const rows = rb.changelog.filter((c) => !filter || c.rate_id.toLowerCase().includes(filter.toLowerCase()));
  return (
    <section className="card">
      <TextField label={t('admin.historyFilter')} value={filter} onChange={setFilter} testId="log-filter" />
      {rows.length === 0 ? <p className="empty">{t('admin.logEmpty')}</p> : (
        <div className="table-wrap">
          <table className="t" data-testid="change-log">
            <thead><tr><th>{t('common.date')}</th><th>{t('admin.id')}</th><th>Action</th><th>Field</th><th>From</th><th>To</th><th>{t('admin.approvedBy')}</th><th>{t('admin.rbVersion')}</th></tr></thead>
            <tbody>
              {rows.map((c, i) => (
                <tr key={i}><td className="num">{c.at.replace('T', ' ').slice(0, 19)}</td><td>{c.rate_id}</td><td>{c.action}</td><td>{c.field ?? ''}</td><td className="xs">{c.from ?? ''}</td><td className="xs">{c.to ?? ''}</td><td>{c.by ?? ''}</td><td className="num">v{c.ratebook_version}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const LEVELS: FactorLevel[] = ['unknown', 'low', 'medium', 'high'];

function RateEditor({ rate, isNew, onClose, onSave, existingIds }: { rate: Rate; isNew: boolean; onClose: () => void; onSave: (r: Rate) => void; existingIds: string[] }) {
  const { t } = useI18n();
  const [r, setR] = useState<Rate>(rate);
  const [prices, setPrices] = useState({ low: numStr(rate.price_low), mid: numStr(rate.price_mid), high: numStr(rate.price_high) });
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof Rate>(k: K, v: Rate[K]) => setR((x) => ({ ...x, [k]: v }));
  const setConf = (k: keyof ConfidenceFactors, v: FactorLevel) => setR((x) => ({ ...x, confidence: { ...x.confidence, [k]: v } }));

  const save = () => {
    const parsed: Record<string, number | null> = {};
    for (const k of ['low', 'mid', 'high'] as const) {
      const p = parseNonNegative(prices[k], k);
      if (!p.ok) return setErr(`${t(`admin.${k}`)}: ${t('issues.INVALID_NUMBER', { field: k })}`);
      parsed[k] = p.value ? p.value.toNumber() : null;
    }
    if (!r.rate_id.trim()) return setErr(`${t('admin.id')}?`);
    if (isNew && existingIds.includes(r.rate_id.trim())) return setErr(`duplicate rate_id ${r.rate_id}`);
    const comps = r.included_components.filter((c) => c.key);
    const next: Rate = {
      ...r,
      rate_id: r.rate_id.trim(),
      scope: r.category === 'building' ? (['turnkey', 'structure', 'finishing'].includes(r.scope) ? r.scope : 'turnkey') : r.category,
      price_low: parsed.low, price_mid: parsed.mid, price_high: parsed.high,
      included_components: comps,
    };
    try {
      onSave(next);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <Modal title={isNew ? t('admin.addRate') : `${t('admin.editRate')} — ${rate.rate_id}`} onClose={onClose}>
      {rate.approval_status === 'urban_approved' && <Note kind="warn">{t('admin.approvedWarn')}</Note>}
      <div className="grid2">
        <TextField label={t('admin.id')} value={r.rate_id} onChange={(v) => isNew && set('rate_id', v)} testId="rate-id" />
        <SelectField label={t('admin.approval')} value={r.approval_status} onChange={(v) => set('approval_status', v)}
          options={APPROVAL_STATUSES.filter((a) => a !== 'urban_approved' || r.approval_status === 'urban_approved').map((a) => ({ value: a, label: t(`approval.${a}`) }))} testId="rate-approval" />
        <TextField label={t('admin.labelEn')} value={r.label_en} onChange={(v) => set('label_en', v)} testId="rate-label" />
        <TextField label={t('admin.labelAr')} value={r.label_ar} onChange={(v) => set('label_ar', v)} />
        <SelectField label={t('admin.category')} value={r.category} onChange={(v) => setR((x) => ({ ...x, category: v, scope: v === 'building' ? 'turnkey' : v, unit: v === 'addition' ? 'KWD/item' : 'KWD/m2' }))}
          options={(['building', 'basement', 'addition'] as const).map((c) => ({ value: c, label: t(`admin.cat_${c}`) }))} />
        {r.category === 'building' && (
          <SelectField label={t('admin.scope')} value={r.scope as 'turnkey'} onChange={(v) => set('scope', v)} options={(['turnkey', 'structure', 'finishing'] as const).map((c) => ({ value: c, label: t(`scope.${c}`) }))} testId="rate-scope" />
        )}
        <SelectField label={t('admin.gradeSystem')} value={r.grade_system} onChange={(v) => set('grade_system', v)} options={(['urban', 'mfatah', 'none'] as const).map((g) => ({ value: g, label: t(`admin.gs_${g}`) }))} />
        {r.grade_system === 'urban' ? (
          <SelectField label={t('admin.grade')} value={r.grade as 'medium'} onChange={(v) => set('grade', v)} options={GRADES.map((g) => ({ value: g, label: t(`gradeNames.${g}`) }))} testId="rate-grade" />
        ) : (
          <TextField label={t('admin.grade')} value={r.grade} onChange={(v) => set('grade', v)} />
        )}
        <TextField label={t('admin.tradeCategory')} value={r.trade_category} onChange={(v) => set('trade_category', v)} />
        <TextField label={t('admin.workDescription')} value={r.work_description} onChange={(v) => set('work_description', v)} />
      </div>
      <div className="grid3">
        <NumberField label={`${t('admin.low')} (KWD)`} value={prices.low} onChange={(v) => setPrices((p) => ({ ...p, low: v }))} />
        <NumberField label={`${t('admin.mid')} (KWD)`} value={prices.mid} onChange={(v) => setPrices((p) => ({ ...p, mid: v }))} testId="rate-mid" />
        <NumberField label={`${t('admin.high')} (KWD)`} value={prices.high} onChange={(v) => setPrices((p) => ({ ...p, high: v }))} />
      </div>
      <div className="grid2">
        <TextField label={t('admin.unit')} value={r.unit} onChange={(v) => set('unit', v)} />
        <SelectField label={t('admin.basis')} value={r.price_basis} onChange={(v) => set('price_basis', v)} options={(['supply_install', 'material_only', 'labour_only', 'unknown'] as const).map((b) => ({ value: b, label: t(`basisType.${b}`) }))} />
        <TextField label={t('admin.location')} value={r.location} onChange={(v) => set('location', v)} />
        <TextField label={t('admin.country')} value={r.country} onChange={(v) => set('country', v.toUpperCase())} />
        <TextField label={t('admin.source')} value={r.source} onChange={(v) => set('source', v)} testId="rate-source" />
        <TextField label={t('admin.sourceUrl')} value={r.source_url} onChange={(v) => set('source_url', v)} />
        <TextField label={t('admin.sourceDate')} value={r.source_date} onChange={(v) => set('source_date', v)} placeholder="YYYY-MM-DD" />
        <TextField label={t('admin.validUntil')} value={r.valid_until} onChange={(v) => set('valid_until', v)} placeholder="YYYY-MM-DD" />
        <TextField label={t('admin.quoteRef')} value={r.quote_ref} onChange={(v) => set('quote_ref', v)} />
        <TextField label={t('admin.lastReviewed')} value={r.last_reviewed} onChange={(v) => set('last_reviewed', v)} placeholder="YYYY-MM-DD" />
        <SelectField label={t('admin.evidence')} value={r.evidence_status} onChange={(v) => set('evidence_status', v)}
          options={EVIDENCE_STATUSES.filter((e) => e !== 'urban_approved' || r.evidence_status === 'urban_approved').map((e) => ({ value: e, label: t(`evidence.${e}`) }))} testId="rate-evidence" />
        <SelectField label={t('admin.evidenceCategory')} value={String(r.evidence_category ?? 'none')} onChange={(v) => set('evidence_category', v === 'none' ? null : (Number(v) as EvidenceCategory))}
          options={['none', '1', '2', '3', '4', '5', '6', '7'].map((c) => ({ value: c, label: t(`evidenceCategory.${c}`) }))} />
      </div>
      <h3>{t('admin.confidence')} — {t(`confidence.${confidenceLevel(r)}`)}</h3>
      <div className="grid3">
        {(Object.keys(r.confidence) as (keyof ConfidenceFactors)[]).map((k) => (
          <SelectField key={k} label={t(`confidence.${k}`)} value={r.confidence[k]} onChange={(v) => setConf(k, v)} options={LEVELS.map((l) => ({ value: l, label: t(`confidence.f_${l}`) }))} />
        ))}
      </div>
      <div className="grid2">
        <TextField label={t('admin.inclusions')} value={r.inclusions} onChange={(v) => set('inclusions', v)} multiline />
        <TextField label={t('admin.inclusionsAr')} value={r.inclusions_ar} onChange={(v) => set('inclusions_ar', v)} multiline />
        <TextField label={t('admin.exclusions')} value={r.exclusions} onChange={(v) => set('exclusions', v)} multiline />
        <TextField label={t('admin.exclusionsAr')} value={r.exclusions_ar} onChange={(v) => set('exclusions_ar', v)} multiline />
        <TextField label={t('admin.notes')} value={r.notes} onChange={(v) => set('notes', v)} multiline />
        <TextField label={t('admin.notesAr')} value={r.notes_ar} onChange={(v) => set('notes_ar', v)} multiline />
      </div>
      {r.category === 'building' && (
        <>
          <h3>{t('admin.includedComponents')}</h3>
          {r.included_components.map((c, i) => (
            <div className="row" key={i} style={{ alignItems: 'flex-end', marginBottom: 6 }}>
              <div style={{ flex: 2, minWidth: 180 }}>
                <SelectField label={t('admin.group')} value={c.key} onChange={(v) => setR((x) => ({ ...x, included_components: x.included_components.map((y, j) => (j === i ? { ...y, key: v, allowance_unit: COMPONENT_CATALOG.find((q) => q.key === v)?.unit ?? '' } : y)) }))}
                  options={[{ value: '', label: '—' }, ...COMPONENT_CATALOG.map((q) => ({ value: q.key, label: q.en }))]} />
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <NumberField label={`${t('admin.allowanceRate')} ${c.allowance_unit ? `/${c.allowance_unit}` : ''}`} value={numStr(c.allowance_rate)}
                  onChange={(v) => { const p = parseNonNegative(v, 'a'); setR((x) => ({ ...x, included_components: x.included_components.map((y, j) => (j === i ? { ...y, allowance_rate: p.ok && p.value ? p.value.toNumber() : null } : y)) })); }} />
              </div>
              <button className="icon-btn" style={{ marginBottom: 16 }} aria-label={t('common.delete')} onClick={() => setR((x) => ({ ...x, included_components: x.included_components.filter((_, j) => j !== i) }))}>{Icon.trash()}</button>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={() => setR((x) => ({ ...x, included_components: [...x.included_components, { key: '', allowance_rate: null, allowance_unit: '' }] }))}>{Icon.plus()} {t('admin.addComponent')}</button>
        </>
      )}
      <div style={{ marginTop: 10 }}><Switch checked={r.active} onChange={(v) => set('active', v)} label={t('admin.active')} /></div>
      {err && <Note kind="err">{err}</Note>}
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
        <button className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
        <button className="btn btn-primary" onClick={save} data-testid="save-rate">{t('common.save')}</button>
      </div>
    </Modal>
  );
}

function GradesEditor({ s }: { s: AppState }) {
  const { t } = useI18n();
  const [grades, setGrades] = useState<GradeSpec[]>(() => JSON.parse(JSON.stringify(s.ratebook.grades)));
  const upd = (gi: number, fn: (g: GradeSpec) => void) => setGrades((prev) => { const n = JSON.parse(JSON.stringify(prev)); fn(n[gi]); return n; });
  const save = () => {
    const rb = s.ratebook;
    const version = rb.ratebook_version + 1;
    const at = new Date().toISOString();
    s.setRatebook({ ...rb, grades, ratebook_version: version, updated_at: at, changelog: [{ at, rate_id: 'grades', action: 'update', field: 'grades', ratebook_version: version }, ...rb.changelog] });
    s.setToast(t('admin.gradesSaved'));
  };
  return (
    <>
      {grades.map((g, gi) => (
        <section className="card" key={g.grade}>
          <h2>{g.name_en} / {g.name_ar}</h2>
          <div className="grid2">
            <TextField label={`${t('admin.gradeName')} (EN)`} value={g.name_en} onChange={(v) => upd(gi, (x) => { x.name_en = v; })} />
            <TextField label={`${t('admin.gradeName')} (AR)`} value={g.name_ar} onChange={(v) => upd(gi, (x) => { x.name_ar = v; })} />
            <TextField label={`${t('admin.gradeSummary')} (EN)`} value={g.summary_en} onChange={(v) => upd(gi, (x) => { x.summary_en = v; })} />
            <TextField label={`${t('admin.gradeSummary')} (AR)`} value={g.summary_ar} onChange={(v) => upd(gi, (x) => { x.summary_ar = v; })} />
          </div>
          <h3>{t('admin.gradeItems')}</h3>
          {g.items.map((it, ii) => (
            <div className="grid2" key={it.key} style={{ gap: 6 }}>
              <input className="input" value={it.en} aria-label={`${it.key} EN`} onChange={(e) => upd(gi, (x) => { x.items[ii].en = e.target.value; })} />
              <input className="input" dir="rtl" value={it.ar} aria-label={`${it.key} AR`} onChange={(e) => upd(gi, (x) => { x.items[ii].ar = e.target.value; })} />
            </div>
          ))}
        </section>
      ))}
      <button className="btn btn-primary" onClick={save}>{t('admin.saveGrades')}</button>
    </>
  );
}

const CAL_KEY = 'urban-vcc.calibration.v1';
const loadCal = (): CalibrationProject[] => {
  try { return JSON.parse(localStorage.getItem(CAL_KEY) || '[]'); } catch { return []; }
};

function Calibration({ s }: { s: AppState }) {
  const { t, num } = useI18n();
  const [list, setListState] = useState<CalibrationProject[]>(loadCal);
  const setList = (l: CalibrationProject[]) => { setListState(l); try { localStorage.setItem(CAL_KEY, JSON.stringify(l)); } catch { /* ignore */ } };
  const stats = calibrationStats(list);
  const blank = (): CalibrationProject => ({
    id: newId('cal'), name: '', location: '', date: '', builtUpArea: '', floors: '', basement: false, specification: '', contractorScope: 'turnkey',
    initialEstimate: '', awardedValue: '', finalCost: '', unrelatedVariations: '', scopeAdjustment: '', priceSources: '', notes: '',
  });
  const upd = (i: number, k: keyof CalibrationProject, v: string | boolean) => setList(list.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
  return (
    <section className="card" data-testid="calibration">
      <h2>{t('admin.calTitle')}</h2>
      <Note>{t('admin.calNote')}</Note>
      <div data-testid="cal-stats">
        {stats ? <Note kind={stats.sufficient ? 'info' : 'warn'}>{t('admin.calStats', { n: stats.n, mean: stats.mean, median: stats.median })} {!stats.sufficient && t('admin.calFew')}</Note>
          : <Note kind="warn">{t('admin.calEmpty')}</Note>}
      </div>
      {list.map((p, i) => (
        <div className="add-item" key={p.id}>
          <div className="head"><b>{p.name || `#${i + 1}`}</b><button className="icon-btn" aria-label={t('common.delete')} onClick={() => setList(list.filter((_, j) => j !== i))}>{Icon.trash()}</button></div>
          <div className="grid3">
            <TextField label={t('admin.calName')} value={p.name} onChange={(v) => upd(i, 'name', v)} />
            <TextField label={t('report.location')} value={p.location} onChange={(v) => upd(i, 'location', v)} />
            <TextField label={t('common.date')} value={p.date} onChange={(v) => upd(i, 'date', v)} placeholder="YYYY-MM-DD" />
            <NumberField label={t('admin.calArea')} value={p.builtUpArea} onChange={(v) => upd(i, 'builtUpArea', v)} />
            <TextField label={t('admin.calFloors')} value={p.floors} onChange={(v) => upd(i, 'floors', v)} />
            <SelectField label={t('admin.calScope')} value={p.contractorScope} onChange={(v) => upd(i, 'contractorScope', v)} options={(['turnkey', 'structure', 'finishing'] as const).map((c) => ({ value: c, label: t(`scope.${c}`) }))} />
            <NumberField label={t('admin.calEstimate')} value={p.initialEstimate} onChange={(v) => upd(i, 'initialEstimate', v)} testId={`cal-est-${i}`} />
            <NumberField label={t('admin.calAwarded')} value={p.awardedValue} onChange={(v) => upd(i, 'awardedValue', v)} />
            <NumberField label={t('admin.calFinal')} value={p.finalCost} onChange={(v) => upd(i, 'finalCost', v)} testId={`cal-final-${i}`} />
            <NumberField label={t('admin.calVariations')} value={p.unrelatedVariations} onChange={(v) => upd(i, 'unrelatedVariations', v)} testId={`cal-var-${i}`} />
            <TextField label={t('admin.calAdjust')} value={p.scopeAdjustment} onChange={(v) => upd(i, 'scopeAdjustment', v)} />
            <TextField label={t('admin.calSpec')} value={p.specification} onChange={(v) => upd(i, 'specification', v)} />
          </div>
          <TextField label={t('admin.calSources')} value={p.priceSources} onChange={(v) => upd(i, 'priceSources', v)} />
          <Switch checked={p.basement} onChange={(v) => upd(i, 'basement', v)} label={t('admin.calBasement')} />
          <div className="add-net"><span>{t('admin.calNormalised')}: <b className="num">{num(normalisedActual(p))}</b></span><span>{t('admin.calApe')}: <b className="num" data-testid={`cal-ape-${i}`}>{absolutePercentageError(p) ?? '—'}{absolutePercentageError(p) !== null ? '%' : ''}</b></span></div>
        </div>
      ))}
      <div className="row">
        <button className="btn btn-primary btn-sm" onClick={() => setList([...list, blank()])} data-testid="cal-add">{Icon.plus()} {t('admin.calAdd')}</button>
        <button className="btn btn-ghost btn-sm" disabled={!list.length} onClick={() => {
          const blob = new Blob([calibrationCsv(list)], { type: 'text/csv' });
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'urban-calibration.csv'; a.click();
        }}>{t('admin.calExport')}</button>
      </div>
      <p className="xs muted">{t('admin.calTemplate')}</p>
      <span className="sr-only">{s.ratebook.ratebook_version}</span>
    </section>
  );
}
