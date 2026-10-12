import { useEffect, useState } from 'react';
import Brand from '../../../workspaces/wajahat/src/components/Brand';
import { safeError } from '../../../workspaces/wajahat/src/api/auth-api';
import type { LoginInput } from './integrations/auth';
import { useApplication } from './providers/context';
import { usePath, navigate } from './routing/history';
import { Link } from './routing/Link';
import { resolveRoute, routes } from './routing/routes';
import { RouteView } from './components/RouteView';
import { ErrorBoundary } from './components/ErrorBoundary';
export default function App() {
  const { auth, tenant, session } = useApplication();
  const path = usePath();
  const route = resolveRoute(path);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    document.title = `${route?.title || 'Page not found'} — WAUTECH Intelligence`;
    document.getElementById('foundation-main')?.focus();
  }, [route]);
  async function login(input: LoginInput) {
    await session.login(input);
    navigate('/dashboard');
  }
  async function logout() {
    setBusy(true);
    setError('');
    try {
      await session.logout();
      navigate('/login');
    } catch (e) {
      setError(safeError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="foundation-app">
      <a className="skip-link" href="#foundation-main">
        Skip to content
      </a>
      <header className="foundation-header">
        <Brand />
        <div className="foundation-session">
          {auth.status === 'authenticated' ? (
            <>
              <span>
                {auth.user.firstName} {auth.user.lastName}
                <small>Verified backend session</small>
              </span>
              <button disabled={busy} onClick={() => void logout()}>
                {busy ? 'Signing out…' : 'Sign out'}
              </button>
            </>
          ) : (
            <span className="foundation-availability">
              {auth.status === 'checking'
                ? 'Checking session'
                : 'Session required'}
            </span>
          )}
        </div>
      </header>
      <div className="foundation-layout">
        <aside className="foundation-sidebar">
          <span className="foundation-eyebrow">APPLICATION</span>
          <nav aria-label="Application navigation">
            {routes
              .filter((item) => item.access !== 'public')
              .map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  current={route?.path === item.path}
                >
                  <span aria-hidden="true">
                    {item.module === 'crm'
                      ? '◇'
                      : item.path === '/dashboard'
                        ? '▦'
                        : '◌'}
                  </span>
                  {item.title}
                </Link>
              ))}
          </nav>
          <div className="foundation-sidebar-note">
            <span className="foundation-eyebrow">ORGANIZATION</span>
            <p>Selection unavailable</p>
            <small>
              Membership discovery is required before business data can be
              loaded.
            </small>
          </div>
        </aside>
        <main id="foundation-main" tabIndex={-1}>
          <div className="foundation-breadcrumb">
            WAUTECH Intelligence <span>/</span>{' '}
            {route?.title || 'Page not found'}
          </div>
          {error && (
            <div className="error-notice" role="alert">
              {error}
            </div>
          )}
          <ErrorBoundary key={path}>
            <RouteView
              route={route}
              auth={auth}
              tenant={tenant}
              onLogin={login}
              onRetry={() => void session.restore()}
            />
          </ErrorBoundary>
        </main>
      </div>
      <footer className="foundation-footer">
        <span>WAUTECH LTD.</span>
        <span>Unified application foundation</span>
      </footer>
    </div>
  );
}
