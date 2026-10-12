import { expect, test, vi } from 'vitest';
import { createSessionAdapter } from './auth';
import { createCrmAdapter } from './crm';
import { unavailableTenant } from './tenant';
import { apiConfiguration } from '../config';
const user = {
  id: '12345678-1234-1234-1234-123456789abc',
  email: 'qa@example.test',
  firstName: 'QA',
  lastName: 'Test',
};
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
test('startup delegates to real auth module /me with cookie security options', async () => {
  const transport = vi.fn<typeof fetch>(async () => response(user));
  const session = createSessionAdapter('', transport);
  expect(session.getSnapshot()).toEqual({ status: 'checking' });
  await session.restore();
  expect(session.getSnapshot()).toEqual({ status: 'authenticated', user });
  expect(transport.mock.calls[0][0]).toBe('/api/auth/me');
  expect(transport.mock.calls[0][1]).toMatchObject({
    credentials: 'include',
    cache: 'no-store',
    redirect: 'error',
  });
});
test.each([401, 403, 500])(
  'session failure %s never yields authenticated state',
  async (status) => {
    const session = createSessionAdapter('', async () => response({}, status));
    await session.restore();
    expect(session.getSnapshot().status).toBe(
      status === 401 ? 'anonymous' : status === 403 ? 'denied' : 'unavailable',
    );
  },
);
test('login does not authenticate when cookie verification fails after successful POST', async () => {
  const transport = vi.fn<typeof fetch>(async (input) =>
    String(input).endsWith('/csrf')
      ? response({ headerName: 'X-CSRF-TOKEN', token: 'test-token' })
      : String(input).endsWith('/login')
        ? response(user)
        : response({}, 401),
  );
  const session = createSessionAdapter('', transport);
  await expect(
    session.login({ email: 'qa@example.test', password: 'mock-only' }),
  ).rejects.toThrow();
  expect(session.getSnapshot().status).not.toBe('authenticated');
  expect(transport.mock.calls.map(([url]) => url)).toEqual([
    '/api/auth/csrf',
    '/api/auth/login',
    '/api/auth/me',
  ]);
});
test('verified session still cannot construct CRM without organization discovery', async () => {
  const session = createSessionAdapter('', async () => response(user));
  await session.restore();
  const crmFetch = vi.fn<typeof fetch>();
  expect(() =>
    createCrmAdapter(
      apiConfiguration(),
      () => ({ auth: session.getSnapshot(), tenant: unavailableTenant }),
      crmFetch,
    ),
  ).toThrow();
  expect(crmFetch).not.toHaveBeenCalled();
});
test('logout invalidates session using reused CSRF flow', async () => {
  const transport = vi.fn<typeof fetch>(async (input) =>
    String(input).endsWith('/csrf')
      ? response({ headerName: 'X-CSRF-TOKEN', token: 'test-token' })
      : String(input).endsWith('/logout')
        ? new Response(null, { status: 204 })
        : response(user),
  );
  const session = createSessionAdapter('', transport);
  await session.restore();
  await session.logout();
  expect(session.getSnapshot()).toEqual({
    status: 'anonymous',
    reason: 'logout',
  });
  expect(
    new Headers(transport.mock.calls[2][1]?.headers).get('X-CSRF-TOKEN'),
  ).toBe('test-token');
});
test('malformed backend identity stays unavailable', async () => {
  const session = createSessionAdapter('', async () =>
    response({ id: 'not-a-uuid', email: 'qa@example.test' }),
  );
  await session.restore();
  expect(session.getSnapshot().status).toBe('unavailable');
});
