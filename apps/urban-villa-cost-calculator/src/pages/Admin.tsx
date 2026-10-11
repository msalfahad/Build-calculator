import { useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { ApprovalBadge, Icon, Modal, Note, NumberField, SelectField, Switch, TextField } from '../components/ui';
import { DEFAULT_RATEBOOK, blankRate, cloneRatebook, setRateActive, upsertRate, validateRatebook } from '../lib/ratebookStore';
import { downloadJson } from '../lib/savedEstimates';
import { parseNonNegative } from '../validation/parse';
import { APPROVAL_STATUSES, GRADES, type GradeSpec, type Rate, type Ratebook } from '../types';
import type { AppState } from '../hooks/useAppState';

const numStr = (v: number | null) => (v === null ? '' : String(v));

export default function Admin({ s }: { s: AppState }) {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<'rates' | 'grades' | 'log'>('rates');
  const [editing, setEditing] = useState<Rate | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const rb = s.ratebook;

  const onImport = async (f: File) => {
    try {
      const parsed = JSON.parse(await f.text()) as Ratebook;
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
        {(['rates', 'grades', 'log'] as const).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{t(`admin.tab${k[0].toUpperCase()}${k.slice(1)}`)}</button>
        ))}
      </div>

      {tab === 'rates' && (
        <section className="card">
          <div className="table-wrap">
            <table className="t" data-testid="rates-table">
              <thead>
                <tr>
                  <th>{t('admin.id')}</th><th>{t('admin.labelEn')}</th><th>{t('admin.scope')}</th><th>{t('admin.grade')}</th>
                  <th className="n">{t('admin.low')}</th><th className="n">{t('admin.mid')}</th><th className="n">{t('admin.high')}</th>
                  <th>{t('admin.approval')}</th><th>{t('admin.sourceDate')}</th><th>{t('admin.version')}</th><th>{t('admin.active')}</th><th />
                </tr>
              </thead>
              <tbody>
                {rb.rates.map((r) => (
                  <tr key={r.rate_id} style={{ opacity: r.active ? 1 : 0.5 }}>
                    <td className="num"><b>{r.rate_id}</b></td>
                    <td>{lang === 'ar' ? r.label_ar || r.label_en : r.label_en}<div className="basis">{r.source}</div></td>
                    <td>{t(`scope.${r.scope}`)}</td>
                    <td>{r.grade}{r.grade_system !== 'urban' && <div className="basis">{t(`admin.gs_${r.grade_system}`)}</div>}</td>
                    <td className="n">{r.price_low ?? '—'}</td><td className="n"><b>{r.price_mid ?? '—'}</b></td><td className="n">{r.price_high ?? '—'}</td>
                    <td><ApprovalBadge status={r.approval_status} /></td>
                    <td className="num">{r.source_date}</td>
                    <td className="num">{r.version}</td>
                    <td><Switch checked={r.active} onChange={(v) => s.setRatebook(setRateActive(rb, r.rate_id, v))} label={<span className="sr-only">{t('admin.active')}</span>} /></td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => setEditing({ ...r })} data-testid={`edit-${r.rate_id}`}>{t('common.edit')}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'grades' && <GradesEditor s={s} />}

      {tab === 'log' && (
        <section className="card">
          {rb.changelog.length === 0 ? <p className="empty">{t('admin.logEmpty')}</p> : (
            <div className="table-wrap">
              <table className="t">
                <thead><tr><th>{t('common.date')}</th><th>{t('admin.id')}</th><th>Action</th><th>Field</th><th>From</th><th>To</th><th>{t('admin.rbVersion')}</th></tr></thead>
                <tbody>
                  {rb.changelog.map((c, i) => (
                    <tr key={i}><td className="num">{c.at.replace('T', ' ').slice(0, 19)}</td><td>{c.rate_id}</td><td>{c.action}</td><td>{c.field ?? ''}</td><td>{c.from ?? ''}</td><td>{c.to ?? ''}</td><td className="num">v{c.ratebook_version}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {editing && <RateEditor rate={editing} isNew={!rb.rates.some((r) => r.rate_id === editing.rate_id) || editing.rate_id === ''} onClose={() => setEditing(null)}
        onSave={(r) => { s.setRatebook(upsertRate(rb, r)); setEditing(null); }} existingIds={rb.rates.map((r) => r.rate_id)} />}
    </div>
  );
}

function RateEditor({ rate, isNew, onClose, onSave, existingIds }: { rate: Rate; isNew: boolean; onClose: () => void; onSave: (r: Rate) => void; existingIds: string[] }) {
  const { t } = useI18n();
  const [r, setR] = useState<Rate>(rate);
  const [prices, setPrices] = useState({ low: numStr(rate.price_low), mid: numStr(rate.price_mid), high: numStr(rate.price_high) });
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof Rate>(k: K, v: Rate[K]) => setR((x) => ({ ...x, [k]: v }));

  const save = () => {
    const parsed: Record<string, number | null> = {};
    for (const k of ['low', 'mid', 'high'] as const) {
      const p = parseNonNegative(prices[k], k);
      if (!p.ok) return setErr(`${t(`admin.${k}`)}: ${t('issues.INVALID_NUMBER', { field: k })}`);
      parsed[k] = p.value ? p.value.toNumber() : null;
    }
    if (!r.rate_id.trim()) return setErr(`${t('admin.id')}?`);
    if (isNew && existingIds.includes(r.rate_id.trim())) return setErr(`duplicate rate_id ${r.rate_id}`);
    const next: Rate = {
      ...r,
      rate_id: r.rate_id.trim(),
      scope: r.category === 'building' ? (['turnkey', 'structure', 'finishing'].includes(r.scope) ? r.scope : 'turnkey') : r.category,
      price_low: parsed.low, price_mid: parsed.mid, price_high: parsed.high,
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
        <SelectField label={t('admin.approval')} value={r.approval_status} onChange={(v) => set('approval_status', v)} options={APPROVAL_STATUSES.map((a) => ({ value: a, label: t(`approval.${a}`) }))} testId="rate-approval" />
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
      </div>
      <div className="grid3">
        <NumberField label={`${t('admin.low')} (KWD)`} value={prices.low} onChange={(v) => setPrices((p) => ({ ...p, low: v }))} />
        <NumberField label={`${t('admin.mid')} (KWD)`} value={prices.mid} onChange={(v) => setPrices((p) => ({ ...p, mid: v }))} testId="rate-mid" />
        <NumberField label={`${t('admin.high')} (KWD)`} value={prices.high} onChange={(v) => setPrices((p) => ({ ...p, high: v }))} />
      </div>
      <div className="grid2">
        <TextField label={t('admin.unit')} value={r.unit} onChange={(v) => set('unit', v)} />
        <SelectField label={t('admin.basis')} value={r.price_basis} onChange={(v) => set('price_basis', v)} options={(['supply_install', 'material_only', 'labour_only', 'unknown'] as const).map((b) => ({ value: b, label: t(`basisType.${b}`) }))} />
        <TextField label={t('admin.source')} value={r.source} onChange={(v) => set('source', v)} testId="rate-source" />
        <TextField label={t('admin.sourceUrl')} value={r.source_url} onChange={(v) => set('source_url', v)} />
        <TextField label={t('admin.sourceDate')} value={r.source_date} onChange={(v) => set('source_date', v)} placeholder="YYYY-MM-DD" />
        <TextField label={t('admin.validUntil')} value={r.valid_until} onChange={(v) => set('valid_until', v)} placeholder="YYYY-MM-DD" />
        <TextField label={t('admin.quoteRef')} value={r.quote_ref} onChange={(v) => set('quote_ref', v)} />
      </div>
      <TextField label={t('admin.inclusions')} value={r.inclusions} onChange={(v) => set('inclusions', v)} multiline />
      <TextField label={t('admin.exclusions')} value={r.exclusions} onChange={(v) => set('exclusions', v)} multiline />
      <TextField label={t('admin.notes')} value={r.notes} onChange={(v) => set('notes', v)} multiline />
      <Switch checked={r.active} onChange={(v) => set('active', v)} label={t('admin.active')} />
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
