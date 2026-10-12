import { expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RouteView } from './RouteView';
import { ErrorFallback } from './ErrorBoundary';
import { routes, resolveRoute } from '../routing/routes';
import { unavailableTenant } from '../integrations/tenant';
import type { AuthState } from '../integrations/auth';
const onLogin = async () => {};
const onRetry = () => {};
const screen = (path: string, auth: AuthState) =>
  renderToStaticMarkup(
    <RouteView
      route={resolveRoute(path)}
      auth={auth}
      tenant={unavailableTenant}
      onLogin={onLogin}
      onRetry={onRetry}
    />,
  );
test('startup keeps private view closed while verifying', () => {
  const html = screen('/companies', { status: 'checking' });
  expect(html).toContain('Verifying your session');
  expect(html).not.toContain('CRM INTEGRATION');
  expect(html).not.toContain('New company');
});
test.each(routes.filter((r) => r.access !== 'public'))(
  'anonymous %s cannot mount business modules',
  (route) => {
    const html = screen(route.path, {
      status: 'anonymous',
      reason: 'signed-out',
    });
    expect(html).toContain('Sign in to continue');
    expect(html).not.toContain('table');
    expect(html).not.toContain('Sample');
  },
);
test('verified user without organization sees no company data or manual tenant input', () => {
  const html = screen('/companies', {
    status: 'authenticated',
    user: {
      id: 'mock',
      email: 'mock@example.test',
      firstName: 'Mock',
      lastName: 'Only',
    },
  });
  expect(html).toContain('Organization access unavailable');
  expect(html).not.toContain('<input');
  expect(html).not.toContain('MOCK');
  expect(html).not.toContain('New company');
});
test('unavailable backend does not mount private content', () => {
  const html = screen('/dashboard', {
    status: 'unavailable',
    message: 'offline',
  });
  expect(html).toContain('Connection unavailable');
  expect(html).toContain('Retry session check');
  expect(html).not.toContain('Revenue');
});
test('login reuses existing login screen and unknown routes are safe', () => {
  expect(
    screen('/login', { status: 'anonymous', reason: 'signed-out' }),
  ).toContain('Work email');
  expect(screen('/unknown', { status: 'checking' })).toContain(
    'Page not found',
  );
  expect(screen('/access-denied', { status: 'checking' })).toContain(
    'Access denied',
  );
});
test('future settings is a nonfunctional placeholder even after verification', () => {
  const html = screen('/settings', {
    status: 'authenticated',
    user: {
      id: 'mock',
      email: 'mock@example.test',
      firstName: 'Mock',
      lastName: 'Only',
    },
  });
  expect(html).toContain('Integration unavailable');
  expect(html).not.toContain('<input');
});
test('error fallback does not leak caught errors or private content', () => {
  const html = renderToStaticMarkup(<ErrorFallback onReset={() => {}} />);
  expect(html).toContain('Unable to open the application');
  expect(html).not.toContain('stack');
  expect(html).toContain('Reload application');
});
