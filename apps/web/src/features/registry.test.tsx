import { expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { collectFeatures, featureAt } from './registry';
import type { FeatureModule } from './contract';
import { resolveRoute } from '../routing/routes';
import { routeAccess } from '../routing/access';
import { RouteView } from '../components/RouteView';
import { unavailableTenant } from '../integrations/tenant';
const module: FeatureModule = {
  id: 'test',
  routes: [
    {
      path: '/private',
      title: 'Private',
      access: 'tenant',
      roles: ['ADMIN'],
      load: async () => ({ default: () => <p>Private data</p> }),
    },
  ],
};
test('automatically discovers an independently lazy loaded example', async () => {
  expect(resolveRoute('/feature-example')?.access).toBe('tenant');
  expect((await featureAt('/feature-example')!.load()).default).toBeTypeOf(
    'function',
  );
});
test('rejects collisions and session-only role checks', () => {
  expect(() => collectFeatures([module, module])).toThrow();
  expect(() =>
    collectFeatures([
      { ...module, routes: [module.routes[0], module.routes[0]] },
    ]),
  ).toThrow();
  expect(() =>
    collectFeatures([
      { ...module, routes: [{ ...module.routes[0], access: 'session' }] },
    ]),
  ).toThrow();
});
test('direct registered routes enforce tenant, identity and roles before rendering', () => {
  const route = collectFeatures([module])[0];
  const auth = {
    status: 'authenticated' as const,
    user: {
      id: 'user',
      email: 'test@example.test',
      firstName: 'Test',
      lastName: 'User',
    },
  };
  const tenant = {
    status: 'ready' as const,
    organization: {
      id: 'org',
      memberUserId: 'user',
      source: 'backend-membership' as const,
      role: 'VIEWER' as const,
    },
  };
  expect(routeAccess(route, auth, unavailableTenant)).toBe(
    'organization-unavailable',
  );
  expect(routeAccess(route, auth, tenant)).toBe('denied');
  expect(
    routeAccess(route, auth, {
      ...tenant,
      organization: { ...tenant.organization, role: 'ADMIN' },
    }),
  ).toBe('allowed');
  const html = renderToStaticMarkup(
    <RouteView
      route={route}
      auth={auth}
      tenant={tenant}
      onLogin={async () => {}}
      onRetry={() => {}}
      renderProtected={() => <p>Private data</p>}
    />,
  );
  expect(html).not.toContain('Private data');
  expect(html).toContain('Access denied');
});
