import { useId, type ReactNode } from 'react';
import { useI18n } from '../i18n';
import type { ApprovalStatus, EstimateStatus } from '../types';

/* ---------------- icons (inline, stroke-based) ---------------- */
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
export const Icon = {
  arrow: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" className="flip-rtl" aria-hidden><path {...P} d="M5 12h14M13 6l6 6-6 6" /></svg>
  ),
  back: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" className="flip-rtl" aria-hidden><path {...P} d="M19 12H5M11 6l-6 6 6 6" /></svg>
  ),
  bolt: (s = 26) => <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden><path {...P} d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>,
  doc: (s = 26) => <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden><path {...P} d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5M8 13h8M8 17h6" /></svg>,
  gear: (s = 26) => <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden><circle {...P} cx="12" cy="12" r="3" /><path {...P} d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>,
  globe: (s = 26) => <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden><circle {...P} cx="12" cy="12" r="9" /><path {...P} d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>,
  info: (s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden><circle {...P} cx="12" cy="12" r="9" /><path {...P} d="M12 11v5M12 8h.01" /></svg>,
  warn: (s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden><path {...P} d="M12 3 2 20h20zM12 10v4M12 17h.01" /></svg>,
  check: (s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden><path {...P} d="m5 12 4 4 10-10" /></svg>,
  trash: (s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden><path {...P} d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>,
  plus: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden><path {...P} d="M12 5v14M5 12h14" /></svg>,
  menu: (s = 22) => <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden><path {...P} d="M4 7h16M4 12h16M4 17h16" /></svg>,
  print: (s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden><path {...P} d="M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z" /></svg>,
  save: (s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden><path {...P} d="M5 3h11l3 3v15H5zM8 3v5h7M8 21v-7h8v7" /></svg>,
  download: (s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden><path {...P} d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>,
  home: (s = 22) => <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden><path {...P} d="M3 11 12 4l9 7M5 10v10h14V10" /></svg>,
};

/* ---------------- brand ---------------- */
export function LogoMark({ size = 38 }: { size?: number }) {
  // Original geometric mark: gable outline with three columns (not a competitor asset).
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <path d="M8 54V25L32 9l24 16v29" fill="none" stroke="#c9a24a" strokeWidth="4" strokeLinejoin="round" />
      <path d="M20 54V30M32 54V23M44 54V30M14 54h36" stroke="#c9a24a" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ onClick }: { onClick?: () => void }) {
  const { t } = useI18n();
  return (
    <button className="logo" onClick={onClick} type="button" aria-label="Urban Projects">
      <LogoMark />
      <span className="wordmark">
        <b>{t('app.brand')}</b>
        <span>{t('app.brandSub')}</span>
      </span>
    </button>
  );
}

/* ---------------- fields ---------------- */
interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  hint?: ReactNode;
  error?: string;
  placeholder?: string;
  testId?: string;
  compact?: boolean;
}

export function NumberField({ label, value, onChange, unit, hint, error, placeholder, testId, compact }: NumberFieldProps) {
  const id = useId();
  return (
    <div className="field" style={compact ? { marginBottom: 0 } : undefined}>
      <label htmlFor={id}>{label}</label>
      <div className={unit ? 'input-affix' : undefined}>
        <input
          id={id}
          className="input num-input"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          data-testid={testId}
          onChange={(e) => onChange(e.target.value)}
        />
        {unit && <span className="affix">{unit}</span>}
      </div>
      {error && <span className="err" id={`${id}-err`} role="alert">{error}</span>}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function TextField({ label, value, onChange, placeholder, hint, multiline, testId, list }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: ReactNode; multiline?: boolean; testId?: string; list?: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea id={id} className="input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} data-testid={testId} />
      ) : (
        <input id={id} className="input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} data-testid={testId} list={list} />
      )}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function SelectField<T extends string>({ label, value, onChange, options, hint, testId }: {
  label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; hint?: ReactNode; testId?: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value as T)} data-testid={testId}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function Chips<T extends string>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div className="chips" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" className="chip" aria-checked={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Choices<T extends string>({ value, options, onChange, label, cols = 2 }: {
  value: T; options: { value: T; label: string; desc?: string }[]; onChange: (v: T) => void; label: string; cols?: 2 | 3;
}) {
  return (
    <div className={`choice-grid c${cols}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className="choice" onClick={() => onChange(o.value)} data-testid={`choice-${o.value}`}>
          <span className="dot" />
          <span>
            <b>{o.label}</b>
            {o.desc && <span>{o.desc}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label, testId }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; testId?: string }) {
  return (
    <label className="switch">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} data-testid={testId} />
      <span>{label}</span>
    </label>
  );
}

export function Note({ kind = 'info', children, testId }: { kind?: 'info' | 'warn' | 'err' | 'ok' | 'gold'; children: ReactNode; testId?: string }) {
  return (
    <div className={`note ${kind}`} role={kind === 'err' ? 'alert' : undefined} data-testid={testId}>
      {kind === 'warn' || kind === 'err' ? Icon.warn() : kind === 'ok' ? Icon.check() : Icon.info()}
      <div>{children}</div>
    </div>
  );
}

export function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  const { t } = useI18n();
  return <span className={`badge b-${status}`} data-testid="approval-badge">{t(`approval.${status}`)}</span>;
}

export function StatusBadge({ status }: { status: EstimateStatus }) {
  const { t } = useI18n();
  return <span className={`badge b-${status}`}>{t(`status.${status}`)}</span>;
}

export function Kwd({ v }: { v: number | null | undefined }) {
  const { kwd } = useI18n();
  return <span className="kwd">{kwd(v)}</span>;
}

export function Num({ v, unit }: { v: number | null | undefined; unit?: string }) {
  const { num } = useI18n();
  return (
    <span>
      <span className="num">{num(v)}</span>
      {unit ? ` ${unit}` : ''}
    </span>
  );
}

export function Stepper({ steps, current, onGo }: { steps: string[]; current: number; onGo: (i: number) => void }) {
  return (
    <nav className="stepper" aria-label="Progress">
      {steps.map((s, i) => (
        <button
          key={s}
          type="button"
          className={`s ${i < current ? 'done' : ''} ${i === current ? 'current' : ''}`}
          aria-current={i === current ? 'step' : undefined}
          onClick={() => i < current && onGo(i)}
          disabled={i > current}
        >
          <i>{i < current ? Icon.check(14) : i + 1}</i>
          <span>{s}</span>
        </button>
      ))}
    </nav>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-bg" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in">
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}
