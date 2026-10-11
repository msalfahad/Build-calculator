import { useRef } from 'react';
import { useI18n } from '../i18n';
import { Icon, Kwd, Note, StatusBadge } from '../components/ui';
import { downloadJson, parseSavedEstimate } from '../lib/savedEstimates';
import type { AppState } from '../hooks/useAppState';
import type { SavedEstimate } from '../types';

export default function Saved({ s }: { s: AppState }) {
  const { t } = useI18n();
  const file = useRef<HTMLInputElement>(null);
  const reopen = (e: SavedEstimate) => {
    s.setInput(e.input);
    s.setReopened(e);
    s.go('results');
  };
  const onImport = async (f: File) => {
    try {
      const e = parseSavedEstimate(await f.text());
      s.setSaved([e, ...s.saved.filter((x) => x.id !== e.id)]);
      s.setToast(t('saved.imported'));
    } catch (err) {
      s.setToast(t('saved.importError', { msg: (err as Error).message }));
    }
  };
  return (
    <div className="fade-in">
      <div className="page-head"><h1>{t('saved.title')}</h1></div>
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => file.current?.click()}>{Icon.download()} {t('saved.importFile')}</button>
        <input ref={file} type="file" accept="application/json,.json" hidden data-testid="import-estimate"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ''; }} />
      </div>
      {s.saved.length === 0 && <div className="card empty">{t('saved.empty')}</div>}
      {s.saved.map((e) => (
        <div className="card" key={e.id} data-testid="saved-item">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <b>{e.name}</b>
              <div className="xs muted">{new Date(e.savedAt).toLocaleString('en-GB')} · {t('report.ratebook')} v{e.ratebookVersion} · {t('report.version')} {e.engineVersion}</div>
            </div>
            <StatusBadge status={e.result.status} />
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <span className="small">{t('saved.snapshot')}: <b><Kwd v={e.result.ownerTotal?.mid} /></b></span>
            <span className="spacer" />
            <button className="btn btn-primary btn-sm" onClick={() => reopen(e)} data-testid="reopen">{t('saved.reopen')}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => downloadJson(`${e.name.replace(/[^\w؀-ۿ-]+/g, '_')}.json`, e)}>{t('common.export')}</button>
            <button className="btn btn-danger btn-sm" onClick={() => s.setSaved(s.saved.filter((x) => x.id !== e.id))} aria-label={t('common.delete')}>{Icon.trash()}</button>
          </div>
          {e.ratebookVersion !== s.ratebook.ratebook_version && <Note kind="warn">{t('saved.savedWith', { saved: e.ratebookVersion, current: s.ratebook.ratebook_version })}</Note>}
        </div>
      ))}
    </div>
  );
}
