import { expect, test } from 'vitest';
import { routes, resolveRoute } from './routes';
import { routeAccess } from './access';
import { unavailableTenant } from '../integrations/tenant';
import type { AuthState } from '../integrations/auth';
test('all requested routes exist, root maps to dashboard and unknown is not-found', () => {
  expect(routes.map((r) => r.path)).toEqual([
    '/login',
    '/dashboard',
    '/companies',
    '/contacts',
    '/leads',
    '/opportunities',
    '/activities',
    '/tasks',
    '/settings',
    '/pipeline',
    '/profile',
    '/organizations',
    '/unauthorized',
    '/access-denied',
    '/feature-example',
  ]);
  expect(resolveRoute('/')?.path).toBe('/dashboard');
  expect(resolveRoute('/missing')).toBeUndefined();
  expect(resolveRoute('//companies')).toBeUndefined();
});
test.each(routes.filter((r) => r.access !== 'public'))(
  'private route %s never allows unverified states',
  (route) => {
    const states: AuthState[] = [
      { status: 'checking' },
      { status: 'anonymous', reason: 'signed-out' },
      { status: 'denied' },
      { status: 'unavailable', message: 'offline' },
    ];
    expect(
      states.map((state) => routeAccess(route, state, unavailableTenant)),
    ).toEqual(['checking', 'unauthorized', 'denied', 'unavailable']);
  },
);
test('verified identity alone never unlocks tenant routes', () => {
  const auth: AuthState = {
    status: 'authenticated',
    user: {
      id: 'user',
      email: 'test@example.test',
      firstName: 'Test',
      lastName: 'User',
    },
  };
  for (const route of routes.filter((r) => r.access === 'tenant'))
    expect(routeAccess(route, auth, unavailableTenant)).toBe(
      'organization-unavailable',
    );
  expect(routeAccess(resolveRoute('/settings')!, auth, unavailableTenant)).toBe(
    'allowed',
  );
  expect(
    routeAccess(resolveRoute('/companies')!, auth, {
      status: 'ready',
      organization: {
        id: 'org',
        memberUserId: 'another',
        source: 'backend-membership',
      },
    }),
  ).toBe('denied');
});
test('public status and login routes remain accessible', () => {
  for (const route of routes.filter((r) => r.access === 'public'))
    expect(routeAccess(route, { status: 'checking' }, unavailableTenant)).toBe(
      'public',
    );
});
