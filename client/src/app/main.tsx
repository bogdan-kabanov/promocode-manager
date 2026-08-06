import React from 'react';
import ReactDOM from 'react-dom/client';
import { t } from '@/shared/i18n';
import { AppProviders } from './providers/AppProviders';
import { AppRouter } from './router/AppRouter';
import './styles/global.css';

document.title = t('app.documentTitle');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </React.StrictMode>,
);
