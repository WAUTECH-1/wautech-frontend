import { useEffect, useState, useSyncExternalStore } from 'react';
import { createAuthApi } from './api/auth-api';
import { AuthSession, routeAccess } from './auth/session';
import { AuthProvider } from './auth/provider';
import { useAuth } from './auth/context';
import type { LoginInput, PortalRoute } from './auth/types';
import Brand from './components/Brand';
import LoginPage from './components/LoginPage';
import PortalPage from './components/PortalPage';
import StatusPage from './components/StatusPage';

const routes = [
  '/login',
  '/portal',
  '/organizations',
  '/unauthorized',
  '/access-denied',
];
const pathname = () => window.location.pathname;
const serverPathname = () => '/login';
function subscribeRoute(listener: () => void) {
  window.addEventListener('popstate', listener);
  return () => window.removeEventListener('popstate', listener);
}
function navigate(path: PortalRoute) {
  window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo(0, 0);
}

export default function AuthApplication() {
  const [session] = useState(
    () => new AuthSession(createAuthApi(import.meta.env.VITE_API_BASE_URL)),
  );
  return (
    <AuthProvider session={session}>
      <AuthScreens />
    </AuthProvider>
  );
}

function AuthScreens() {
  const { state, login: signIn, logout: signOut, verifySession } = useAuth();
  const path = useSyncExternalStore(subscribeRoute, pathname, serverPathname);
  const route = (path === '/' ? '/login' : path) as PortalRoute;
  useEffect(() => {
    document.title = `${route === '/portal' ? 'Your account' : route === '/organizations' ? 'Organizations' : 'Sign in'} — WAUTECH Intelligence`;
  }, [route]);

  async function login(input: LoginInput) {
    await signIn(input);
    navigate('/portal');
  }
  async function logout() {
    await signOut();
    navigate('/login');
  }
  const access = routeAccess(route, state);
  let screen;
  if (!routes.includes(route)) screen = <StatusPage kind="not-found" />;
  else if (route === '/access-denied') screen = <StatusPage kind="denied" />;
  else if (route === '/unauthorized')
    screen = <StatusPage kind="unauthorized" />;
  else if (state.status === 'checking') screen = <StatusPage kind="checking" />;
  else if (state.status === 'denied') screen = <StatusPage kind="denied" />;
  else if (state.status === 'unavailable' && route === '/login')
    screen = <LoginPage connectionMessage={state.message} onLogin={login} />;
  else if (state.status === 'unavailable')
    screen = (
      <StatusPage
        kind="unavailable"
        message={state.message}
        onRetry={() => void verifySession()}
      />
    );
  else if (state.status === 'authenticated')
    screen = (
      <PortalPage
        user={state.user}
        organizations={route === '/organizations'}
        onLogout={logout}
      />
    );
  else if (access === 'unauthorized' && state.reason !== 'expired')
    screen = <StatusPage kind="unauthorized" />;
  else screen = <LoginPage reason={state.reason} onLogin={login} />;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <Brand />
        <span className="header-caption">
          A CLEARER WAY FORWARD <span aria-hidden="true">↗</span>
        </span>
      </header>
      <main id="main-content" tabIndex={-1}>
        {screen}
      </main>
      <footer className="site-footer">
        <span>© {new Date().getFullYear()} WAUTECH LTD.</span>
        <span>Purpose built. People first.</span>
      </footer>
    </div>
  );
}
