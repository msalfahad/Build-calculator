import { useState } from 'react';
import { useI18n } from '../i18n';
import { Chips, Choices, Icon, Kwd, NumberField, Note, Num, SelectField, Stepper, Switch, TextField, ApprovalBadge } from '../components/ui';
import { buildingRatesForScope, basementRates, candidateRates, suggestFloorArea } from '../calculators';
import { ADDITION_CATALOG, newAddition, newId } from '../lib/defaults';
import { issueText } from '../reports/format';
import { BASEMENT_COMPONENTS, FLOOR_KEYS, GRADES, SCOPES, type EstimateInput, type Issue } from '../types';
import type { AppState } from '../hooks/useAppState';

const STEP_KEYS = ['property', 'floors', 'basement', 'specs', 'extras'] as const;
const STEP_FIELDS: ((f: string) => boolean)[] = [
  (f) => f === 'plotArea',
  (f) => f.startsWith('floors.'),
  (f) => f.startsWith('basement.'),
  (f) => f.startsWith('rateSelection.') || f === 'floorHeight',
  (f) => f.startsWith('additions.') || f.startsWith('ownerDirect.') || f.startsWith('fees.'),
];
// Errors that should not stop navigation: the result page explains them (e.g. an unpriced scope).
const NON_BLOCKING = new Set(['SCOPE_UNPRICED', 'INVESTMENT_NOT_SUPPORTED', 'RATE_SCOPE_MISMATCH']);

export const LOCATIONS = [
  'Capital — العاصمة', 'Hawalli — حولي', 'Farwaniya — الفروانية', 'Mubarak Al-Kabeer — مبارك الكبير', 'Ahmadi — الأحمدي', 'Jahra — الجهراء',
  'Salmiya — السالمية', 'Jabriya — الجابرية', 'Mishref — مشرف', 'Bayan — بيان', 'Salwa — سلوى', 'Rumaithiya — الرميثية', 'Surra — السرة',
  'Yarmouk — اليرموك', 'Qurtuba — قرطبة', 'Adailiya — العديلية', 'Kaifan — كيفان', 'Khaldiya — الخالدية', 'Shamiya — الشامية',
  'Abdullah Al-Mubarak — عبدالله المبارك', 'Saad Al-Abdullah — سعد العبدالله', 'Sabah Al-Ahmad — صباح الأحمد', 'Al-Mutlaa — المطلاع',
  'Khairan — الخيران', 'Jaber Al-Ahmad — جابر الأحمد', 'Fnaitees — الفنيطيس', 'Messila — المسيلة', 'Abu Fatira — أبو فطيرة', 'Egaila — العقيلة',
];

export function stepForField(field?: string): number {
  if (!field) return 3;
  const i = STEP_FIELDS.findIndex((f) => f(field));
  return i < 0 ? (field === 'propertyType' ? 0 : 3) : i;
}

export default function Wizard({ s }: { s: AppState }) {
  const { t } = useI18n();
  const { input, setInput, result, step } = s;
  const [showErrors, setShowErrors] = useState(false);

  const update = (fn: (d: EstimateInput) => void) =>
    setInput((prev) => {
      const d: EstimateInput = JSON.parse(JSON.stringify(prev));
      fn(d);
      return d;
    });

  const stepErrors = (i: number): Issue[] =>
    result.issues.filter((x) => x.severity === 'error' && x.field && STEP_FIELDS[i](x.field) && !NON_BLOCKING.has(x.code));
  const errFor = (field: string) => {
    if (!showErrors) {
      // Format errors (bad numbers) show immediately; "required" errors only after pressing Next.
      const e = result.issues.find((x) => x.field === field && x.severity === 'error' && (x.code === 'INVALID_NUMBER' || x.code === 'NEGATIVE_NUMBER'));
      return e ? issueText(t, e) : undefined;
    }
    const e = result.issues.find((x) => x.field === field && x.severity === 'error');
    return e ? issueText(t, e) : undefined;
  };

  const next = () => {
    if (stepErrors(step).length) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    if (step < 4) s.go('wizard', step + 1);
    else s.go('results');
  };
  const back = () => (step === 0 ? s.go('home') : s.go('wizard', step - 1));

  const ctx = { input, update, errFor, s };
  return (
    <div className="wizard-wrap fade-in">
      <Stepper steps={[...STEP_KEYS.map((k) => t(`steps.${k}`)), t('steps.results')]} current={step} onGo={(i) => s.go('wizard', i)} />
      {step === 0 && <StepProperty {...ctx} />}
      {step === 1 && <StepFloors {...ctx} />}
      {step === 2 && <StepBasement {...ctx} />}
      {step === 3 && <StepSpecs {...ctx} />}
      {step === 4 && <StepExtras {...ctx} />}
      {showErrors && stepErrors(step).length > 0 && <Note kind="err" testId="step-errors">{t('common.fixErrors')}</Note>}
      <div className="wizard-nav sticky-nav">
        <button className="btn btn-ghost" onClick={back} data-testid="wizard-back">{Icon.back()} {t('common.back')}</button>
        <button className="btn btn-primary" onClick={next} data-testid="wizard-next">
          {step === 4 ? t('common.calculate') : t('common.next')} {Icon.arrow()}
        </button>
      </div>
    </div>
  );
}

interface StepProps {
  input: EstimateInput;
  update: (fn: (d: EstimateInput) => void) => void;
  errFor: (field: string) => string | undefined;
  s: AppState;
}

/* ------------------------------------------------------------------ */
function StepProperty({ input, update, errFor }: StepProps) {
  const { t } = useI18n();
  const presets = ['375', '400', '500', '600', '750'];
  const isPreset = presets.includes(input.plotArea);
  const [custom, setCustom] = useState(!isPreset);
  return (
    <section className="card">
      <h2>{t('property.title')}</h2>
      <TextField label={t('property.projectName')} value={input.projectName} placeholder={t('property.projectNamePh')} onChange={(v) => update((d) => { d.projectName = v; })} testId="project-name" />
      <div className="field">
        <span className="field-label">{t('property.type')}</span>
        <Choices
          label={t('property.type')}
          value={input.propertyType}
          onChange={(v) => update((d) => { d.propertyType = v; })}
          options={[
            { value: 'private_villa', label: t('property.private_villa') },
            { value: 'investment', label: t('property.investment') },
          ]}
        />
        {input.propertyType === 'investment' && <Note kind="warn">{t('property.investmentNote')}</Note>}
      </div>
      <div className="field">
        <span className="field-label">{t('property.plot')}</span>
        <div className="chips" role="radiogroup" aria-label={t('property.plot')}>
          {presets.map((p) => (
            <button key={p} type="button" role="radio" className="chip" aria-checked={!custom && input.plotArea === p} onClick={() => { setCustom(false); update((d) => { d.plotArea = p; }); }}>
              {p}
            </button>
          ))}
          <button type="button" role="radio" className="chip" aria-checked={custom} onClick={() => setCustom(true)} data-testid="plot-custom">{t('property.custom')}</button>
        </div>
        {custom && (
          <NumberField label={t('property.plot')} value={input.plotArea} unit={t('common.m2')} onChange={(v) => update((d) => { d.plotArea = v; })} error={errFor('plotArea')} testId="plot-input" />
        )}
        {!custom && errFor('plotArea') && <span className="err">{errFor('plotArea')}</span>}
        <span className="hint">{t('property.plotHint')}</span>
      </div>
      <TextField label={t('property.location')} value={input.location} placeholder={t('property.locationPh')} onChange={(v) => update((d) => { d.location = v; })} hint={t('property.locationHint')} list="kw-locations" testId="location" />
      <datalist id="kw-locations">{LOCATIONS.map((l) => <option key={l} value={l} />)}</datalist>
      <TextField label={`${t('property.siteNotes')} (${t('common.optional')})`} value={input.siteNotes} placeholder={t('property.siteNotesPh')} multiline onChange={(v) => update((d) => { d.siteNotes = v; })} />
    </section>
  );
}

/* ------------------------------------------------------------------ */
function StepFloors({ input, update, errFor, s }: StepProps) {
  const { t } = useI18n();
  const [advanced, setAdvanced] = useState(FLOOR_KEYS.some((k) => input.floors[k].rateOverride));
  const perFloor = suggestFloorArea(input.plotArea, input.coverage);
  const a = s.result.areas;
  const applySuggestion = () =>
    update((d) => {
      if (perFloor === null) return;
      (['ground', 'first', 'second'] as const).forEach((k) => {
        if (d.floors[k].enabled) d.floors[k].area = String(perFloor);
      });
    });

  return (
    <>
      <section className="card">
        <h2>{t('floors.title')}</h2>
        <p className="muted small" style={{ marginTop: -6 }}>{t('floors.sub')}</p>

        <div className="note gold" style={{ display: 'block' }}>
          <b>{t('floors.suggestTitle')}</b>
          <p className="xs" style={{ margin: '4px 0 10px' }}>{t('floors.suggestNote')}</p>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <div style={{ width: 210 }}>
              <NumberField label={t('floors.coverage')} value={input.coverage} unit="%" onChange={(v) => update((d) => { d.coverage = v; })} compact testId="coverage" />
            </div>
            <div className="small">
              {t('floors.suggestedPerFloor')}: <b><Num v={perFloor} unit={t('common.m2')} /></b>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={applySuggestion} disabled={perFloor === null} data-testid="apply-suggestion">
            {t('floors.apply')}
          </button>
        </div>

        {FLOOR_KEYS.map((k) => {
          const f = input.floors[k];
          return (
            <div className={`floor-row ${f.enabled ? '' : 'off'}`} key={k}>
              <div className="top">
                <Switch checked={f.enabled} onChange={(v) => update((d) => { d.floors[k].enabled = v; })} label={<span className="name">{t(`floors.${k}`)}</span>} testId={`floor-${k}-toggle`} />
              </div>
              {f.enabled ? (
                <NumberField label={t('floors.area')} value={f.area} unit={t('common.m2')} onChange={(v) => update((d) => { d.floors[k].area = v; })} error={errFor(`floors.${k}.area`)} testId={`floor-${k}-area`} compact />
              ) : (
                <span className="muted small">—</span>
              )}
              {f.enabled && advanced && (
                <NumberField label={t('floors.rateOverride')} value={f.rateOverride} unit={t('common.kwdm2')} onChange={(v) => update((d) => { d.floors[k].rateOverride = v; })} error={errFor(`floors.${k}.rateOverride`)} compact />
              )}
            </div>
          );
        })}
        <p className="hint xs muted">{t('floors.roofNote')}</p>
        <Switch checked={advanced} onChange={setAdvanced} label={<span className="small">{t('floors.advanced')}</span>} />
        {advanced && <p className="xs muted">{t('floors.rateOverrideHint')}</p>}
      </section>

      <section className="area-summary" aria-live="polite" data-testid="area-summary">
        {a.perFloor.map((f) => (
          <div className="r small" key={f.key}><span>{t(`floors.${f.key}`)}</span><span><Num v={f.area} unit={t('common.m2')} /></span></div>
        ))}
        {input.basement.enabled && <div className="r small"><span>{t('floors.basement')}</span><span><Num v={a.basement} unit={t('common.m2')} /></span></div>}
        <div className="r"><span>{t('floors.totalAbove')}</span><b data-testid="total-above"><Num v={a.aboveGround} unit={t('common.m2')} /></b></div>
        <div className="r"><span>{t('floors.totalIncl')}</span><b><Num v={a.total} unit={t('common.m2')} /></b></div>
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ */
function StepBasement({ input, update, errFor, s }: StepProps) {
  const { t } = useI18n();
  const b = input.basement;
  const libRates = basementRates(s.ratebook);
  return (
    <section className="card">
      <h2>{t('basement.title')}</h2>
      <div className="field">
        <span className="field-label">{t('basement.question')}</span>
        <Choices
          label={t('basement.question')}
          value={b.enabled ? 'yes' : 'no'}
          onChange={(v) => update((d) => { d.basement.enabled = v === 'yes'; })}
          options={[{ value: 'no', label: t('common.no') }, { value: 'yes', label: t('common.yes') }]}
        />
      </div>
      {b.enabled && (
        <div className="fade-in">
          <div className="grid2">
            <NumberField label={t('basement.area')} value={b.area} unit={t('common.m2')} onChange={(v) => update((d) => { d.basement.area = v; })} error={errFor('basement.area')} testId="basement-area" />
            <NumberField label={`${t('basement.depth')} (${t('common.optional')})`} value={b.depth} unit="m" onChange={(v) => update((d) => { d.basement.depth = v; })} error={errFor('basement.depth')} />
          </div>
          <div className="field"><span className="field-label">{t('basement.finish')}</span>
            <Chips label={t('basement.finish')} value={b.finish} onChange={(v) => update((d) => { d.basement.finish = v; })}
              options={(['unfinished', 'parking', 'habitable'] as const).map((v) => ({ value: v, label: t(`basement.f_${v}`) }))} />
          </div>
          <div className="field"><span className="field-label">{t('basement.groundwater')}</span>
            <Chips label={t('basement.groundwater')} value={b.groundwater} onChange={(v) => update((d) => { d.basement.groundwater = v; })}
              options={(['unknown', 'none', 'concerns'] as const).map((v) => ({ value: v, label: t(`basement.g_${v}`) }))} />
          </div>
          <div className="field"><span className="field-label">{t('basement.shoring')}</span>
            <Chips label={t('basement.shoring')} value={b.shoring} onChange={(v) => update((d) => { d.basement.shoring = v; })}
              options={(['unknown', 'yes', 'no'] as const).map((v) => ({ value: v, label: t(`common.${v}`) }))} />
          </div>

          <hr className="hr" />
          <h3>{t('basement.pricing')}</h3>
          <Note>{t('basement.pricingNote')}</Note>
          <Choices
            label={t('basement.pricing')}
            value={b.pricingMode}
            onChange={(v) => update((d) => { d.basement.pricingMode = v; })}
            options={[
              { value: 'none', label: t('basement.m_none') },
              { value: 'rate', label: t('basement.m_rate') },
              { value: 'allowance', label: t('basement.m_allowance') },
              { value: 'library', label: t('basement.m_library') },
            ]}
          />
          <div style={{ marginTop: 12 }}>
            {b.pricingMode === 'none' && <Note kind="warn" testId="basement-unpriced">{t('basement.unpricedNote')}</Note>}
            {b.pricingMode === 'rate' && (
              <NumberField label={t('basement.rate')} value={b.rate} unit={t('common.kwdm2')} onChange={(v) => update((d) => { d.basement.rate = v; })} error={errFor('basement.rate')} testId="basement-rate" />
            )}
            {b.pricingMode === 'allowance' && (
              <NumberField label={t('basement.allowance')} value={b.allowance} unit={t('common.kwd')} onChange={(v) => update((d) => { d.basement.allowance = v; })} error={errFor('basement.allowance')} />
            )}
            {b.pricingMode === 'library' && (libRates.length ? (
              <SelectField label={t('basement.libraryRate')} value={b.rateId} onChange={(v) => update((d) => { d.basement.rateId = v; })}
                options={[{ value: '', label: '—' }, ...libRates.map((r) => ({ value: r.rate_id, label: `${r.rate_id} · ${r.price_mid} ${t('common.kwdm2')} · ${t(`approval.${r.approval_status}`)}` }))]} />
            ) : <Note kind="warn">{t('basement.noLibrary')}</Note>)}
            {(b.pricingMode === 'rate' || b.pricingMode === 'allowance') && (
              <TextField label={t('basement.priceSource')} value={b.priceSource} onChange={(v) => update((d) => { d.basement.priceSource = v; })} />
            )}
          </div>
          {b.pricingMode !== 'none' && (
            <div className="field">
              <span className="field-label">{t('basement.includes')}</span>
              <div className="grid2" style={{ gap: 2 }}>
                {BASEMENT_COMPONENTS.map((c) => (
                  <label className="check" key={c}>
                    <input type="checkbox" checked={b.includes.includes(c)} onChange={(e) => update((d) => {
                      d.basement.includes = e.target.checked ? [...d.basement.includes, c] : d.basement.includes.filter((x) => x !== c);
                    })} />
                    {t(`basement.c_${c}`)}
                  </label>
                ))}
              </div>
              <span className="hint">{t('basement.includesHint')}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
function StepSpecs({ input, update, errFor, s }: StepProps) {
  const { t, lang } = useI18n();
  const rb = s.ratebook;
  const grade = rb.grades.find((g) => g.grade === input.grade);
  const auto = candidateRates(rb, input.scope, input.grade)[0];
  const scopeRates = buildingRatesForScope(rb, input.scope);
  const sel = input.rateSelection;
  const libRate = rb.rates.find((r) => r.rate_id === sel.rateId);

  return (
    <>
      <section className="card">
        <h2>{t('specs.title')}</h2>
        <div className="field">
          <span className="field-label">{t('specs.scope')}</span>
          <Choices cols={3} label={t('specs.scope')} value={input.scope}
            onChange={(v) => update((d) => {
              d.scope = v;
              // never carry a library rate of another scope across
              if (d.rateSelection.mode === 'library') d.rateSelection = { ...d.rateSelection, mode: 'auto', rateId: '' };
            })}
            options={SCOPES.map((sc) => ({ value: sc, label: t(`specs.s_${sc}`), desc: t(`specs.s_${sc}D`) }))} />
        </div>
        <div className="field">
          <span className="field-label">{t('specs.grade')}</span>
          <div className="grade-grid" role="radiogroup" aria-label={t('specs.grade')}>
            {GRADES.map((g, i) => {
              const gs = rb.grades.find((x) => x.grade === g);
              return (
                <button key={g} type="button" role="radio" className="grade" aria-checked={input.grade === g} onClick={() => update((d) => { d.grade = g; })} data-testid={`grade-${g}`}>
                  <span className="bars">{GRADES.map((_, j) => <i key={j} className={j <= i ? 'on' : ''} />)}</span>
                  {gs ? (lang === 'ar' ? gs.name_ar : gs.name_en) : t(`gradeNames.${g}`)}
                </button>
              );
            })}
          </div>
          {grade && (
            <div className="note info" style={{ display: 'block' }}>
              <b>{lang === 'ar' ? grade.summary_ar : grade.summary_en}</b>
              <div className="xs" style={{ marginTop: 4 }}>{t('specs.includesTypical')}:</div>
              <ul className="xs" style={{ margin: '4px 0 0' }}>
                {grade.items.map((it) => <li key={it.key}>{lang === 'ar' ? it.ar : it.en}</li>)}
              </ul>
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <h2>{t('specs.rate')}</h2>
        <Choices cols={3} label={t('specs.rate')} value={sel.mode}
          onChange={(v) => update((d) => { d.rateSelection.mode = v; if (v === 'library' && !d.rateSelection.rateId) d.rateSelection.rateId = scopeRates[0]?.rate_id ?? ''; })}
          options={[
            { value: 'auto', label: t('specs.rAuto') },
            { value: 'library', label: t('specs.rLibrary') },
            { value: 'manual', label: t('specs.rManual') },
          ]} />
        <div style={{ marginTop: 12 }}>
          {sel.mode === 'auto' && (auto ? <RateCard rateId={auto.rate_id} s={s} /> : <Note kind="warn" testId="no-rate">{t('specs.noRate')}</Note>)}
          {sel.mode === 'library' && (scopeRates.length ? (
            <>
              <SelectField label={t('specs.selectedRate')} value={sel.rateId} onChange={(v) => update((d) => { d.rateSelection.rateId = v; })} testId="rate-select"
                options={scopeRates.map((r) => ({
                  value: r.rate_id,
                  label: `${lang === 'ar' ? r.label_ar : r.label_en} — ${r.price_mid ?? '—'} ${t('common.kwdm2')}${r.grade_system !== 'urban' ? ' ⚠' : ''}`,
                }))} />
              {libRate && <RateCard rateId={libRate.rate_id} s={s} />}
            </>
          ) : <Note kind="warn">{t('specs.noRate')}</Note>)}
          {sel.mode === 'manual' && (
            <>
              <div className="grid3">
                <NumberField label={t('specs.manualLow')} value={sel.manualLow} unit={t('common.kwdm2')} onChange={(v) => update((d) => { d.rateSelection.manualLow = v; })} error={errFor('rateSelection.manualLow')} />
                <NumberField label={t('specs.manualMid')} value={sel.manualMid} unit={t('common.kwdm2')} onChange={(v) => update((d) => { d.rateSelection.manualMid = v; })} error={errFor('rateSelection.manualMid')} testId="manual-mid" />
                <NumberField label={t('specs.manualHigh')} value={sel.manualHigh} unit={t('common.kwdm2')} onChange={(v) => update((d) => { d.rateSelection.manualHigh = v; })} error={errFor('rateSelection.manualHigh')} />
              </div>
              <p className="hint xs muted" style={{ marginTop: -4 }}>{t('specs.manualHint')}</p>
              <TextField label={t('specs.manualSource')} value={sel.manualSource} onChange={(v) => update((d) => { d.rateSelection.manualSource = v; })} />
              <ApprovalBadge status="user_provisional" />
            </>
          )}
        </div>
        <hr className="hr" />
        <NumberField label={t('specs.floorHeight')} value={input.floorHeight} unit="m" placeholder="3.2 (e.g.)" onChange={(v) => update((d) => { d.floorHeight = v; })} hint={t('specs.floorHeightHint')} error={errFor('floorHeight')} />
      </section>
    </>
  );
}

function RateCard({ rateId, s }: { rateId: string; s: AppState }) {
  const { t, lang } = useI18n();
  const r = s.ratebook.rates.find((x) => x.rate_id === rateId);
  if (!r) return null;
  return (
    <div className="kpi" data-testid="rate-card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <b className="small">{lang === 'ar' ? r.label_ar : r.label_en}</b>
        <ApprovalBadge status={r.approval_status} />
      </div>
      <div className="v" style={{ marginTop: 4 }}>
        <Num v={r.price_mid} unit={t('common.kwdm2')} />
        {r.price_low !== null && r.price_high !== null && (
          <span className="small muted" style={{ fontWeight: 400 }}> · {t('specs.range')} <span className="num">{r.price_low}–{r.price_high}</span></span>
        )}
      </div>
      <div className="xs muted">{r.source} · {r.source_date}</div>
      {r.grade_system !== 'urban' && <div className="xs" style={{ color: 'var(--amber-600)', marginTop: 4 }}>⚠ {t('specs.otherSystem')}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
function StepExtras({ input, update, errFor, s }: StepProps) {
  const { t, lang } = useI18n();
  const res = s.result;
  const available = ADDITION_CATALOG.filter((c) => (!c.basementOnly || input.basement.enabled) && !input.additions.some((a) => a.key === c.key));
  return (
    <>
      <section className="card">
        <h2>{t('extras.additions')}</h2>
        <p className="muted small" style={{ marginTop: -6 }}>{t('extras.additionsHint')}</p>
        <div className="picker">
          {available.map((c) => (
            <button key={c.key} type="button" onClick={() => update((d) => { d.additions.push(newAddition(c.key, d.scope, lang)); })} data-testid={`add-${c.key}`}>
              + {lang === 'ar' ? c.ar : c.en}
            </button>
          ))}
          <button type="button" onClick={() => update((d) => { d.additions.push(newAddition('custom', d.scope, lang)); })}>+ {t('extras.custom')}</button>
        </div>
        {input.additions.map((a, idx) => {
          const cat = ADDITION_CATALOG.find((c) => c.key === a.key);
          const r = res.additions.find((x) => x.id === a.id);
          const set = (fn: (x: typeof a) => void) => update((d) => fn(d.additions[idx]));
          return (
            <div className="add-item" key={a.id} data-testid={`addition-${a.key}`}>
              <div className="head">
                <Switch checked={a.enabled} onChange={(v) => set((x) => { x.enabled = v; })} label={<b>{a.description || t('extras.custom')}</b>} />
                <button className="icon-btn" aria-label={t('common.delete')} onClick={() => update((d) => { d.additions.splice(idx, 1); })}>{Icon.trash()}</button>
              </div>
              {a.enabled && (
                <>
                  {a.key === 'custom' && <TextField label={t('extras.description')} value={a.description} onChange={(v) => set((x) => { x.description = v; })} />}
                  <div className="add-grid">
                    <NumberField label={t('extras.qty')} value={a.quantity} onChange={(v) => set((x) => { x.quantity = v; })} error={errFor(`additions.${a.id}.quantity`)} compact />
                    <TextField label={t('extras.unit')} value={a.unit} onChange={(v) => set((x) => { x.unit = v; })} />
                    <NumberField label={t('extras.rate')} value={a.rate} onChange={(v) => set((x) => { x.rate = v; })} error={errFor(`additions.${a.id}.rate`)} testId={`rate-${a.key}`} compact />
                    <TextField label={t('extras.source')} value={a.source} onChange={(v) => set((x) => { x.source = v; })} />
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <label className="check">
                      <input type="checkbox" checked={a.includedInBaseline} onChange={(e) => set((x) => { x.includedInBaseline = e.target.checked; })} />
                      {t('extras.included')}
                    </label>
                    {a.includedInBaseline && (
                      <NumberField label={t('extras.allowance')} value={a.standardAllowance} unit={t('common.kwd')} onChange={(v) => set((x) => { x.standardAllowance = v; })} error={errFor(`additions.${a.id}.standardAllowance`)} />
                    )}
                  </div>
                  {cat?.hint && <p className="xs muted" style={{ margin: '4px 0 0' }}>ⓘ {t('extras.hint')}: {cat.hint}</p>}
                  <div className="add-net">
                    <span>{t('extras.net')}</span>
                    <b>{r?.priced ? <><Kwd v={r.net} />{r.net !== null && r.net < 0 ? ` (${t('common.credit')})` : ''}</> : <span style={{ color: 'var(--amber-600)' }}>{t('common.unpriced')}</span>}</b>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </section>

      <section className="card">
        <h2>{t('extras.ownerDirect')}</h2>
        <p className="muted small" style={{ marginTop: -6 }}>{t('extras.ownerDirectHint')}</p>
        {input.ownerDirect.map((o, idx) => (
          <div className="row" key={o.id} style={{ alignItems: 'flex-end', marginBottom: 8 }}>
            <div style={{ flex: 2, minWidth: 160 }}><TextField label={t('extras.description')} value={o.description} onChange={(v) => update((d) => { d.ownerDirect[idx].description = v; })} /></div>
            <div style={{ flex: 1, minWidth: 120 }}><NumberField label={t('extras.amount')} value={o.amount} onChange={(v) => update((d) => { d.ownerDirect[idx].amount = v; })} error={errFor(`ownerDirect.${o.id}.amount`)} /></div>
            <button className="icon-btn" style={{ marginBottom: 16 }} aria-label={t('common.delete')} onClick={() => update((d) => { d.ownerDirect.splice(idx, 1); })}>{Icon.trash()}</button>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={() => update((d) => { d.ownerDirect.push({ id: newId('own'), description: '', amount: '' }); })}>{Icon.plus()} {t('extras.addOwner')}</button>
      </section>

      <section className="card">
        <h2>{t('extras.fees')}</h2>
        <p className="muted small" style={{ marginTop: -6 }}>{t('extras.feesHint')}</p>
        <div className="grid2">
          <NumberField label={t('extras.designPct')} value={input.fees.designPct} unit="%" onChange={(v) => update((d) => { d.fees.designPct = v; })} error={errFor('fees.designPct')} testId="design-pct" />
          <NumberField label={t('extras.contingencyPct')} value={input.fees.contingencyPct} unit="%" onChange={(v) => update((d) => { d.fees.contingencyPct = v; })} error={errFor('fees.contingencyPct')} testId="contingency-pct" />
          <NumberField label={t('extras.fixedFees')} value={input.fees.fixedFees} unit={t('common.kwd')} onChange={(v) => update((d) => { d.fees.fixedFees = v; })} error={errFor('fees.fixedFees')} testId="fixed-fees" />
          <TextField label={t('extras.fixedFeesLabel')} value={input.fees.fixedFeesLabel} onChange={(v) => update((d) => { d.fees.fixedFeesLabel = v; })} />
        </div>
        <SelectField label={t('extras.percentBase')} value={input.fees.percentBase} onChange={(v) => update((d) => { d.fees.percentBase = v; })}
          options={[{ value: 'construction', label: t('extras.b_construction') }, { value: 'above_ground_base', label: t('extras.b_above') }]} />
      </section>
    </>
  );
}
