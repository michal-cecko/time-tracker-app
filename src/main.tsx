import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Self-hosted fonts — bundled with the app, served same-origin, identical
// across dev / prod / iOS / Android / macOS. No Google Fonts dependency.
import '@fontsource/geist/400.css';
import '@fontsource/geist/500.css';
import '@fontsource/geist/600.css';
import '@fontsource/geist/700.css';
import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/500.css';
import '@fontsource/geist-mono/600.css';
import './styles/tokens.css';
import './styles/desktop.css';
import './styles/base.css';
import { startDrainLoop } from './offline/sync';

startDrainLoop();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
