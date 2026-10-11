import React from 'react';
import ReactDOM from 'react-dom/client';
import './fonts';
import './styles/app.css';
import { I18nProvider } from './i18n';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>,
);
