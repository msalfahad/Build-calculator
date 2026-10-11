import { useI18n } from '../i18n';
import { Icon } from './ui';
import { defaultInput } from '../lib/defaults';
import { downloadJson, makeSaved } from '../lib/savedEstimates';
import type { AppState } from '../hooks/useAppState';

export function ResultActions({ s, showBreakdown = true }: { s: AppState; showBreakdown?: boolean }) {
  const { t } = useI18n();
  const r = s.result;
  const disabled = r.status === 'blocked';
  const save = () => {
    const rec = makeSaved(s.input, r, s.ratebook);
    s.setSaved([rec, ...s.saved]);
    s.setToast(t('results.savedToast'));
  };
  const exportJson = () => {
    const rec = makeSaved(s.input, r, s.ratebook);
    downloadJson(`urban-villa-estimate-${rec.savedAt.slice(0, 10)}.json`, rec);
  };
  return (
    <div className="actions no-print">
      {showBreakdown && (
        <button className="btn btn-primary" disabled={disabled} onClick={() => s.go('breakdown')} data-testid="view-breakdown">{t('results.breakdown')} {Icon.arrow()}</button>
      )}
      <button className="btn btn-blue" disabled={disabled} onClick={() => s.go('report')} data-testid="open-report">{Icon.print()} {t('results.report')}</button>
      <button className="btn btn-ghost" disabled={disabled} onClick={save} data-testid="save-estimate">{Icon.save()} {t('results.save')}</button>
      <button className="btn btn-ghost" disabled={disabled} onClick={exportJson} data-testid="export-json">{Icon.download()} {t('results.exportJson')}</button>
      <button className="btn btn-ghost" onClick={() => s.go('wizard', 0)}>{Icon.back()} {t('results.editInputs')}</button>
      <button className="btn btn-ghost" onClick={() => { s.setInput(defaultInput()); s.setReopened(null); s.go('wizard', 0); }}>{t('results.newEstimate')}</button>
    </div>
  );
}
