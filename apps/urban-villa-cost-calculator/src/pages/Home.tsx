import { useI18n } from '../i18n';
import { Icon, Note } from '../components/ui';
import { defaultInput, mfatahExampleInput, varndaExampleInput } from '../lib/defaults';
import type { AppState } from '../hooks/useAppState';

/** Original illustration of a modern Kuwaiti-style villa (flat roofs, screens, palm) — no third-party artwork. */
function VillaArt() {
  return (
    <svg viewBox="0 0 600 360" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fc0ec" />
          <stop offset="1" stopColor="#e6eef5" />
        </linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a4a6e" />
          <stop offset="1" stopColor="#56809f" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#sky)" />
      <circle cx="500" cy="70" r="34" fill="#fff6d8" opacity=".8" />
      {/* distant skyline */}
      <g fill="#b9cde0">
        <rect x="20" y="200" width="26" height="70" /><rect x="52" y="180" width="18" height="90" /><rect x="420" y="190" width="22" height="80" />
        <rect x="450" y="170" width="16" height="100" /><rect x="560" y="196" width="24" height="74" />
        <path d="M95 270V170l6-30 6 30v100z" /><circle cx="101" cy="150" r="9" />
      </g>
      {/* ground */}
      <rect y="300" width="600" height="60" fill="#d9d2c3" />
      <rect y="296" width="600" height="8" fill="#c7bfae" />
      {/* villa body */}
      <rect x="130" y="150" width="330" height="150" fill="#f4efe6" />
      <rect x="110" y="140" width="250" height="14" fill="#e7ded0" />
      <rect x="300" y="90" width="190" height="64" fill="#f8f4ec" />
      <rect x="290" y="82" width="210" height="12" fill="#e7ded0" />
      {/* timber screen */}
      <g fill="#a87c52">{Array.from({ length: 9 }).map((_, i) => <rect key={i} x={318 + i * 18} y="100" width="8" height="46" />)}</g>
      {/* windows */}
      <rect x="150" y="172" width="120" height="58" fill="url(#glass)" />
      <rect x="150" y="242" width="80" height="58" fill="url(#glass)" />
      <rect x="290" y="172" width="150" height="58" fill="url(#glass)" />
      <rect x="250" y="242" width="54" height="58" fill="#7a5a3c" />
      <rect x="320" y="242" width="120" height="58" fill="url(#glass)" />
      <g stroke="#f4efe6" strokeWidth="3"><path d="M210 172v58M365 172v58M190 242v58M380 242v58" /></g>
      {/* boundary wall */}
      <rect x="60" y="282" width="70" height="18" fill="#e2d9c9" /><rect x="460" y="282" width="100" height="18" fill="#e2d9c9" />
      {/* palm */}
      <g transform="translate(520 300)">
        <path d="M0 0c2-40 4-70 0-110" stroke="#8a6a46" strokeWidth="7" fill="none" />
        <g fill="#4f8a4a">
          <path d="M0-110c-30-6-50 6-62 20 22-8 42-10 62-20z" /><path d="M0-110c30-6 50 6 62 20-22-8-42-10-62-20z" />
          <path d="M0-110c-20-20-44-22-60-16 22 2 42 8 60 16z" /><path d="M0-110c20-20 44-22 60-16-22 2-42 8-60 16z" />
          <path d="M0-110c-4-24 4-40 14-48-4 16-8 32-14 48z" />
        </g>
      </g>
      {/* shrubs */}
      <g fill="#6a9a5c"><circle cx="120" cy="296" r="14" /><circle cx="140" cy="300" r="10" /><circle cx="470" cy="298" r="12" /></g>
    </svg>
  );
}

export default function Home({ s }: { s: AppState }) {
  const { t, lang } = useI18n();
  const start = () => {
    s.setInput(defaultInput());
    s.setReopened(null);
    s.go('wizard', 0);
  };
  const loadExample = (which: 'varnda' | 'mfatah') => {
    s.setInput(which === 'varnda' ? varndaExampleInput() : mfatahExampleInput());
    s.setReopened(null);
    s.go('results');
  };

  const features = [
    { icon: Icon.bolt(), k: 'f1' },
    { icon: Icon.doc(), k: 'f2' },
    { icon: Icon.gear(), k: 'f3' },
    { icon: Icon.globe(), k: 'f4' },
  ];

  return (
    <div className="fade-in">
      <section className="hero">
        <div className="hero-art"><VillaArt /></div>
        <div className="hero-body">
          <h1>{t('home.title')}</h1>
          {lang === 'en' && <div className="ar-title" lang="ar" dir="rtl">حاسبة تكلفة بناء القسيمة</div>}
          <p>{t('home.subtitle')}</p>
          <button className="btn btn-blue btn-block" style={{ maxWidth: 360 }} onClick={start} data-testid="start-estimate">
            {t('home.start')} {Icon.arrow()}
          </button>
          <p className="xs" style={{ marginTop: 12, marginBottom: 0 }}>{t('home.disclaimer')}</p>
        </div>
      </section>

      <div className="features">
        {features.map((f) => (
          <div className="feature" key={f.k}>
            {f.icon}
            <b>{t(`home.${f.k}`)}</b>
            <span>{t(`home.${f.k}d`)}</span>
          </div>
        ))}
      </div>

      <section className="card">
        <h2>{t('home.examples')}</h2>
        <div className="ex-list">
          <button className="ex" onClick={() => loadExample('varnda')} data-testid="example-varnda">
            <span className="t"><b>{t('home.exVarnda')}</b><span>{t('home.exVarndaD')}</span></span>
            {Icon.arrow()}
          </button>
          <button className="ex" onClick={() => loadExample('mfatah')} data-testid="example-mfatah">
            <span className="t"><b>{t('home.exMfatah')}</b><span>{t('home.exMfatahD')}</span></span>
            {Icon.arrow()}
          </button>
          <button className="ex" onClick={() => s.go('research')} data-testid="example-alhisba">
            <span className="t"><b>{t('home.exAlhisba')}</b><span>{t('home.exAlhisbaD')}</span></span>
            {Icon.arrow()}
          </button>
        </div>
        <Note kind="gold">{t('home.demoNote')}</Note>
      </section>
    </div>
  );
}
