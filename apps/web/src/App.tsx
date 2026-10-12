import { useEffect, useState } from 'react';
import Brand from '@wautech/wajahat/Brand';
import { safeError } from '@wautech/wajahat';
import { useApplication } from './providers/context';
import { usePath, navigate } from './routing/history';
import { resolveRoute } from './routing/routes';
import { RouteView } from './components/RouteView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProductionApplication } from './components/ProductionApplication';
import { Organizations } from './components/Organizations';
export default function App() {
  const { auth, tenant, session } = useApplication();
  const path = usePath();
  const route = resolveRoute(path);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    document.title =
      (route?.title || 'Page not found') + ' — WAUTECH Intelligence';
  }, [route]);
  useEffect(() => {
    if (
      route?.path === '/login' &&
      auth.status === 'authenticated' &&
      tenant.status === 'ready'
    )
      navigate('/dashboard', true);
  }, [route, auth.status, tenant.status]);
  async function logout() {
    setBusy(true);
    setError('');
    try {
      await session.logout();
      navigate('/login');
    } catch (e) {
      setError(safeError(e));
      setBusy(false);
    }
  }
  if (
    route &&
    auth.status === 'authenticated' &&
    tenant.status === 'ready' &&
    route.access !== 'public'
  )
    return (
      <ErrorBoundary key={path}>
        <ProductionApplication path={route.path} />
      </ErrorBoundary>
    );
  return (
    <div className="foundation-app">
      <a className="skip-link" href="#foundation-main">
        Skip to content
      </a>
      <header className="foundation-header">
        <Brand />
        {auth.status === 'authenticated' && (
          <button disabled={busy} onClick={() => void logout()}>
            Sign out
          </button>
        )}
      </header>
      <main id="foundation-main" tabIndex={-1}>
        <nav aria-label="Application navigation">
          <a href="/login">Sign in</a>
        </nav>
        {error && <p role="alert">{error}</p>}
        <ErrorBoundary key={path}>
          <RouteView
            route={route}
            auth={auth}
            tenant={tenant}
            onLogin={async (input) => {
              await session.login(input);
              navigate('/dashboard');
            }}
            onRetry={() => void session.restore()}
            renderProtected={() =>
              auth.status === 'authenticated' ? (
                route?.path === '/profile' ? (
                  <section className="foundation-status">
                    <h1>Your profile</h1>
                    <p>
                      {auth.user.firstName} {auth.user.lastName}
                    </p>
                    <p>{auth.user.email}</p>
                    <button onClick={() => navigate('/organizations')}>
                      Organizations
                    </button>
                  </section>
                ) : (
                  <Organizations />
                )
              ) : null
            }
          />
        </ErrorBoundary>
        {auth.status === 'authenticated' && route?.path === '/login' && (
          <Organizations />
        )}
      </main>
    </div>
  );
}
