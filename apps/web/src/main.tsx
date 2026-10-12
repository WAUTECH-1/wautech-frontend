import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ApplicationProvider } from './providers/ApplicationProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import './auth.css';
import './styles.css';
import '@wautech/asad/themes.css';
import '@wautech/asad/dashboard.css';
import '@wautech/umer/content.css';
import './production.css';
const root = document.getElementById('root');
if (!root) throw new Error('Missing application root.');
createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <ApplicationProvider>
        <App />
      </ApplicationProvider>
    </ErrorBoundary>
  </StrictMode>,
);
