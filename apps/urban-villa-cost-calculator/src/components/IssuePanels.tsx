import { useI18n } from '../i18n';
import { Note } from './ui';
import { issueText, unpricedText } from '../reports/format';
import type { EstimateResult } from '../types';

export function UnpricedPanel({ r }: { r: EstimateResult }) {
  const { t } = useI18n();
  if (!r.unpriced.length) return null;
  return (
    <Note kind="warn" testId="unpriced-panel">
      <b>{t('results.unpricedTitle')}</b>
      <ul>{r.unpriced.map((u, i) => <li key={i}>{unpricedText(t, u)}</li>)}</ul>
    </Note>
  );
}

export function WarningsPanel({ r }: { r: EstimateResult }) {
  const { t } = useI18n();
  const items = r.issues.filter((i) => i.severity !== 'error' && i.code !== 'PARTIAL_ESTIMATE');
  if (!items.length) return null;
  return (
    <div className="card" data-testid="warnings-panel">
      <h2>{t('results.warningsTitle')}</h2>
      <ul className="small" style={{ margin: 0, paddingInlineStart: 18, display: 'grid', gap: 6 }}>
        {items.map((i, k) => (
          <li key={k} style={{ color: i.severity === 'warning' ? 'var(--amber-600)' : 'var(--ink-2)' }}>{issueText(t, i)}</li>
        ))}
      </ul>
    </div>
  );
}
