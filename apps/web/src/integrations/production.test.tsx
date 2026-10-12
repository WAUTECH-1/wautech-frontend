import { expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuthSession, ApiError } from '@wautech/wajahat';
import { CrmContent } from '@wautech/umer';
import { sessionTransport, organizationTransport, mutation } from './http';
import { discoverOrganizations, verifyMembership } from './membership';
import { loadOverview, money } from './overview';
import { RequestLease } from './lifecycle';
import { createCrmAdapter } from './crm';
import { apiConfiguration } from '../config';
import type { CrmContext } from './crm';
const id = '11111111-1111-4111-8111-111111111111';
const foreign = '22222222-2222-4222-8222-222222222222';
const user = {
  id,
  email: 'fixture@example.test',
  firstName: 'Test',
  lastName: 'User',
};
const member = {
  organizationId: id,
  organizationName: 'Fixture',
  membershipId: foreign,
  role: 'VIEWER',
  status: 'ACTIVE',
};
test('organization wrapper replaces case-insensitive tenant headers and excludes auth calls', async () => {
  const transport = vi.fn<typeof fetch>(async () => response([]));
  const scoped = organizationTransport(
    transport,
    id,
    new AbortController().signal,
  );
  await scoped('/api/companies', { headers: { 'x-organization-id': foreign } });
  expect(
    new Headers(transport.mock.calls[0][1]?.headers).get('X-Organization-ID'),
  ).toBe(id);
  await scoped('/api/auth/csrf', { headers: { 'X-Organization-ID': id } });
  expect(
    new Headers(transport.mock.calls[1][1]?.headers).has('X-Organization-ID'),
  ).toBe(false);
});
const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
async function authenticated() {
  const session = new AuthSession({
    me: async () => user,
    login: async () => user,
    logout: async () => {},
  });
  await session.restore();
  return session;
}
test('protected HTTP 401 immediately expires the sole session; 403 preserves it', async () => {
  const session = await authenticated();
  await sessionTransport(
    session,
    () => true,
    async () => response({}, 403),
  )('/api/companies');
  expect(session.getSnapshot().status).toBe('authenticated');
  await sessionTransport(
    session,
    () => true,
    async () => response({}, 401),
  )('/api/companies');
  expect(session.getSnapshot()).toEqual({
    status: 'anonymous',
    reason: 'expired',
  });
});
test('obsolete transport 401 cannot expire a newer session', async () => {
  const session = await authenticated();
  let active = true;
  const fetcher = sessionTransport(
    session,
    () => active,
    async () => {
      active = false;
      return response({}, 401);
    },
  );
  await expect(fetcher('/api/companies')).rejects.toMatchObject({
    name: 'AbortError',
  });
  expect(session.getSnapshot().status).toBe('authenticated');
});
test('membership discovery uses authenticated bootstrap without an arbitrary tenant', async () => {
  const transport = vi.fn<typeof fetch>(async () => response([member]));
  expect(await discoverOrganizations('', transport)).toEqual([member]);
  expect(transport.mock.calls[0][0]).toBe('/api/auth/organizations');
  expect(
    new Headers(transport.mock.calls[0][1]?.headers).has('X-Organization-ID'),
  ).toBe(false);
});
test.each([
  { ...member, status: 'REVOKED' },
  { ...member, role: 'SUPERADMIN' },
  { ...member, membershipId: 'invalid' },
])('untrusted membership rejected: %j', async (value) => {
  await expect(
    discoverOrganizations('', async () => response([value])),
  ).rejects.toBeInstanceOf(ApiError);
});
test('selection must return the requested membership and duplicate discovery fails closed', async () => {
  await expect(
    verifyMembership('', foreign, async () => response(member)),
  ).rejects.toThrow();
  await expect(
    discoverOrganizations('', async () => response([member, member])),
  ).rejects.toThrow();
});
test('writes fetch fresh validated CSRF and do not replay on forbidden', async () => {
  const transport = vi.fn<typeof fetch>(async (input) =>
    String(input).endsWith('/csrf')
      ? response({ headerName: 'X-CSRF-TOKEN', token: 'fixture-token' })
      : response({}, 403),
  );
  await expect(
    mutation('', '/notifications/read-all', transport),
  ).rejects.toMatchObject({ kind: 'forbidden' });
  expect(transport).toHaveBeenCalledTimes(2);
  expect(
    new Headers(transport.mock.calls[1][1]?.headers).get('X-CSRF-TOKEN'),
  ).toBe('fixture-token');
});
test.each(['companies', 'contacts', 'leads', 'opportunities'] as const)(
  'content-only %s preserves operations without standalone navigation/login',
  (resource) => {
    const api = {} as Parameters<typeof CrmContent>[0]['api'];
    const html = renderToStaticMarkup(
      <CrmContent
        api={api}
        resource={resource}
        user={user}
        organization={id}
      />,
    );
    expect(html).toContain('Loading records');
    expect(html).toContain(
      `New ${{ companies: 'company', contacts: 'contact', leads: 'lead', opportunities: 'opportunity' }[resource]}`,
    );
    expect(html).not.toContain('CRM navigation');
    expect(html).not.toContain('DEVELOPMENT ACCESS');
    expect(html).not.toContain('sidebar-profile');
  },
);
test('switching away and back to the same tenant rejects an obsolete CRM generation', async () => {
  let current: CrmContext = {
    auth: { status: 'authenticated', user },
    tenant: {
      status: 'ready',
      organization: {
        id,
        memberUserId: id,
        source: 'backend-membership',
        generation: 1,
      },
    },
  };
  const transport = vi.fn<typeof fetch>(async () => response([]));
  const adapter = createCrmAdapter(
    apiConfiguration(),
    () => current,
    transport,
  );
  current = {
    ...current,
    tenant: {
      status: 'ready',
      organization: {
        id,
        memberUserId: id,
        source: 'backend-membership',
        generation: 3,
      },
    },
  };
  await expect(adapter.operations.list('companies')).rejects.toThrow();
  expect(transport).not.toHaveBeenCalled();
});
test('overview maps current API records; currencies stay separate and history stays empty', async () => {
  const transport: typeof fetch = async (input) => {
    const path = String(input);
    if (path.endsWith('/pipeline'))
      return response({
        stages: [
          {
            stage: 'QUALIFICATION',
            opportunityCount: 2,
            totalsByCurrency: { USD: 10, EUR: 20 },
          },
        ],
      });
    if (path.endsWith('/notifications/unread-count'))
      return response({ count: 8 });
    if (path.endsWith('/notifications'))
      return response({
        content: [{ id, title: 'Update', message: 'Fixture', readAt: null }],
      });
    if (path.endsWith('/companies'))
      return response([{ id, name: 'Fixture company' }]);
    if (path.endsWith('/opportunities'))
      return response([
        {
          id,
          name: 'Fixture deal',
          companyId: id,
          amount: 10,
          currency: 'USD',
          stage: 'QUALIFICATION',
        },
      ]);
    return response([]);
  };
  const result = await loadOverview(
    '',
    transport,
    new AbortController().signal,
  );
  expect(result.failures).toEqual([]);
  expect(result.data.metrics[0].value).toBe('1');
  expect(result.data.pipeline[0].totals).toEqual([
    { amount: 10, currency: 'USD' },
    { amount: 20, currency: 'EUR' },
  ]);
  expect(result.data.performance.points).toEqual([]);
  expect(result.data.unreadNotificationCount).toBe(8);
});
test('outage omits failed metrics instead of fabricating zeros or demo values', async () => {
  const result = await loadOverview(
    '',
    async () => response({}, 503),
    new AbortController().signal,
  );
  expect(result.failures).toHaveLength(9);
  expect(result.data.metrics).toEqual([]);
  expect(result.data.provenance.kind).toBe('unavailable');
});
test('invalid money remains unavailable', () => {
  expect(money(null, 'USD')).toBeNull();
  expect(money(-1, 'USD')).toBeNull();
  expect(money(Number.MAX_SAFE_INTEGER + 1, 'USD')).toBeNull();
});
test('malformed dashboard responses are unavailable, never converted into plausible business metrics', async () => {
  const result = await loadOverview(
    '',
    async () => response([{ name: 'Missing identifier' }]),
    new AbortController().signal,
  );
  expect(result.data.metrics).toEqual([]);
  expect(result.failures).toHaveLength(9);
});
test('normal session verification preserves the epoch; logout and re-login change it even for the same user', async () => {
  const session = await authenticated(),
    epoch = session.getEpoch();
  await session.restore();
  expect(session.getEpoch()).toBe(epoch);
  await session.logout();
  await session.login({ email: user.email, password: 'isolated-fixture' });
  expect(session.getEpoch()).toBeGreaterThan(epoch);
});
test('StrictMode lease survives immediate remount and cancels real unmount', async () => {
  const lease = new RequestLease(),
    dispose = vi.fn();
  lease.leave(lease.enter(), dispose);
  const second = lease.enter();
  await Promise.resolve();
  expect(dispose).not.toHaveBeenCalled();
  lease.leave(second, dispose);
  await Promise.resolve();
  expect(dispose).toHaveBeenCalledTimes(1);
});
test('late invalidated login cannot change the current account epoch or restore identity', async () => {
  let resolve!: (value: typeof user) => void;
  const session = new AuthSession({
    me: async () => user,
    logout: async () => {},
    login: () =>
      new Promise((r) => {
        resolve = r;
      }),
  });
  const login = session.login({
    email: user.email,
    password: 'isolated-fixture',
  });
  session.handleApiError(new ApiError('unauthorized', 'Expired'));
  const epoch = session.getEpoch();
  resolve(user);
  await login;
  expect(session.getEpoch()).toBe(epoch);
  expect(session.getSnapshot().status).toBe('anonymous');
});
