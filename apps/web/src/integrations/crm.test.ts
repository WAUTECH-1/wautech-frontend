import { expect, test, vi } from 'vitest';
import { createCrmAdapter, crmRoutes } from './crm';
import type { CrmContext } from './crm';
import { apiConfiguration } from '../config';
import { unavailableTenant } from './tenant';
const id = '12345678-1234-1234-1234-123456789abc';
const ready = (): CrmContext => ({
  auth: {
    status: 'authenticated',
    user: {
      id,
      email: 'mock@example.test',
      firstName: 'Mock',
      lastName: 'Only',
    },
  },
  tenant: {
    status: 'ready',
    organization: { id, memberUserId: id, source: 'backend-membership' },
  },
});
test('CRM routes map to existing resource DTOs', () => {
  expect(crmRoutes).toEqual({
    companies: '/companies',
    contacts: '/contacts',
    leads: '/leads',
    opportunities: '/opportunities',
  });
});
test('unverified identity and missing tenant reject before network', () => {
  const transport = vi.fn<typeof fetch>();
  expect(() =>
    createCrmAdapter(
      apiConfiguration(),
      () => ({
        auth: { status: 'anonymous', reason: 'signed-out' },
        tenant: unavailableTenant,
      }),
      transport,
    ),
  ).toThrow();
  expect(transport).not.toHaveBeenCalled();
});
test('prepared adapter uses confirmed tenant header and cookie transport', async () => {
  const transport = vi.fn<typeof fetch>(
    async () =>
      new Response('[]', { headers: { 'Content-Type': 'application/json' } }),
  );
  const adapter = createCrmAdapter(apiConfiguration(), ready, transport);
  expect(await adapter.operations.list('companies')).toEqual([]);
  expect(transport.mock.calls[0][0]).toBe('/api/companies');
  expect(
    new Headers(transport.mock.calls[0][1]?.headers).get('X-Organization-ID'),
  ).toBe(id);
  expect(transport.mock.calls[0][1]).toMatchObject({
    credentials: 'include',
    cache: 'no-store',
    redirect: 'error',
  });
  expect('login' in adapter.operations).toBe(false);
  adapter.dispose();
});
test('context changes reject old adapter before network', async () => {
  let context = ready();
  const transport = vi.fn<typeof fetch>();
  const adapter = createCrmAdapter(
    apiConfiguration(),
    () => context,
    transport,
  );
  context = {
    auth: { status: 'anonymous', reason: 'logout' },
    tenant: unavailableTenant,
  };
  await expect(adapter.operations.list('companies')).rejects.toThrow();
  expect(transport).not.toHaveBeenCalled();
});
test('late record data cannot escape after context changes during JSON parsing', async () => {
  let context = ready();
  let release!: () => void;
  const body = new Promise<void>((resolve) => {
    release = resolve;
  });
  const transport: typeof fetch = async () =>
    ({
      ok: true,
      status: 200,
      json: async () => {
        await body;
        return [];
      },
    }) as Response;
  const adapter = createCrmAdapter(
    apiConfiguration(),
    () => context,
    transport,
  );
  const result = adapter.operations.list('companies');
  await Promise.resolve();
  context = {
    auth: { status: 'anonymous', reason: 'logout' },
    tenant: unavailableTenant,
  };
  release();
  await expect(result).rejects.toThrow();
});
test('dispose cancels inflight reads', async () => {
  let started!: () => void;
  const hasStarted = new Promise<void>((resolve) => {
    started = resolve;
  });
  const transport: typeof fetch = async (_input, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener(
        'abort',
        () => reject(new Error('aborted')),
        { once: true },
      );
      started();
    });
  const adapter = createCrmAdapter(apiConfiguration(), ready, transport);
  const result = adapter.operations.list('companies');
  await hasStarted;
  adapter.dispose();
  await expect(result).rejects.toThrow();
});
