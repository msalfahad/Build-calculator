import { useState } from 'react';
import { useI18n } from './i18n';
import { Icon, Logo } from './components/ui';
import { useAppState, type View } from './hooks/useAppState';
import Home from './pages/Home';
import Wizard from './pages/Wizard';
import Results from './pages/Results';
import Breakdown from './pages/Breakdown';
import Report from './pages/Report';
import Saved from './pages/Saved';
import Admin from './pages/Admin';
import Research from './pages/Research';
import { ADMIN_ENABLED } from './lib/ratebookStore';

const NAV: { key: string; view: View }[] = [
  { key: 'calculator', view: 'home' },
  { key: 'saved', view: 'saved' },
  // The rate library is hidden in a public (read-only) build.
  ...(ADMIN_ENABLED ? [{ key: 'ratebook', view: 'admin' as View }] : []),
  { key: 'research', view: 'research' },
];

export default function App() {
  const { t, lang, setLang } = useI18n();
  const s = useAppState();
  const [menu, setMenu] = useState(false);
  const calcViews: View[] = ['home', 'wizard', 'results', 'breakdown', 'report'];
  const active = (v: View) => (v === 'home' ? calcViews.includes(s.view) : s.view === v);

  return (
    <>
      <header className="app-header no-print">
        <div className="inner">
          <Logo onClick={() => s.go('home')} />
          <nav className="nav" aria-label="Main">
            {NAV.map((n) => (
              <button key={n.key} aria-current={active(n.view) ? 'page' : undefined} onClick={() => s.go(n.view)}>
                {t(`app.nav.${n.key}`)}
              </button>
            ))}
          </nav>
          <div className="header-actions">
            {s.cloud !== 'checking' && (
              <span className={`sync-chip ${s.cloud}`} data-testid="sync-status"><i />{s.cloud === 'synced' ? t('app.synced') : t('app.localOnly')}</span>
            )}
            <button className="lang-btn" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} data-testid="lang-toggle" aria-label="Language">
              {t('app.lang')}
            </button>
            <button className="menu-btn" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label={t('app.menu')}>
              {Icon.menu()}
            </button>
          </div>
        </div>
        {menu && (
          <div className="mobile-menu">
            {NAV.map((n) => (
              <button key={n.key} onClick={() => { setMenu(false); s.go(n.view); }}>
                {t(`app.nav.${n.key}`)}
              </button>
            ))}
          </div>
        )}
      </header>
      <main>
        {s.view === 'home' && <Home s={s} />}
        {s.view === 'wizard' && <Wizard s={s} />}
        {s.view === 'results' && <Results s={s} />}
        {s.view === 'breakdown' && <Breakdown s={s} />}
        {s.view === 'report' && <Report s={s} />}
        {s.view === 'saved' && <Saved s={s} />}
        {s.view === 'admin' && <Admin s={s} />}
        {s.view === 'research' && <Research s={s} />}
      </main>
      {s.toast && <div className="toast" role="status">{s.toast}</div>}
    </>
  );
}
