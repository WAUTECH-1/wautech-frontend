import { describe, expect, test, vi } from 'vitest';
import { ApiError, CrmApi } from './api';
import type { Company, Resource, Requests } from './contracts';
const org = '12345678-1234-1234-1234-123456789abc';
const company: Company = {
  id: org,
  name: 'Acme',
  email: null,
  phone: null,
  website: null,
  industry: null,
  status: 'ACTIVE',
  createdAt: '2026-10-11T00:00:00Z',
  updatedAt: '2026-10-11T00:00:00Z',
  archived: false,
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
function mock() {
  const records = new Map<string, Company>();
  const calls: { url: string; init: RequestInit }[] = [];
  const transport = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init: init || {} });
      if (url.endsWith('/auth/csrf'))
        return json({
          headerName: 'X-CSRF-TOKEN',
          parameterName: '_csrf',
          token: 'test-token',
        });
      if (url.endsWith('/companies') && init?.method === 'POST') {
        const record = { ...company, ...JSON.parse(String(init.body)) };
        records.set(record.id, record);
        return json(record, 201);
      }
      if (url.includes('/companies/') && init?.method === 'PUT') {
        const record = { ...company, ...JSON.parse(String(init.body)) };
        records.set(company.id, record);
        return json(record);
      }
      if (init?.method === 'DELETE') {
        records.delete(company.id);
        return new Response(null, { status: 204 });
      }
      if (url.includes('/companies/')) return json(records.get(company.id));
      return json([...records.values()]);
    },
  );
  return { api: new CrmApi('', org, transport), transport, calls };
}
describe('mocked network contracts (not live backend verification)', () => {
  test.each<Resource>(['contacts', 'leads', 'opportunities'])(
    'mocked CRUD round trip for %s',
    async (resource) => {
      const requests: Requests = {
        companies: company,
        contacts: {
          companyId: org,
          firstName: 'Dev',
          lastName: 'Contact',
          email: null,
          phone: null,
          jobTitle: null,
          status: 'ACTIVE',
        },
        leads: {
          companyId: null,
          firstName: 'Dev',
          lastName: 'Lead',
          email: null,
          phone: null,
          jobTitle: null,
        },
        opportunities: {
          name: 'Deal',
          description: null,
          amount: 0,
          currency: 'USD',
          companyId: org,
          contactId: null,
          expectedCloseDate: null,
        },
      };
      let record: Record<string, unknown> | null = null;
      const transport = vi.fn<typeof fetch>(async (input, init) => {
        if (String(input).endsWith('/csrf'))
          return json({ headerName: 'X-CSRF-TOKEN', token: 'test-token' });
        if (init?.method === 'DELETE') {
          record = null;
          return new Response(null, { status: 204 });
        }
        if (init?.method === 'POST' || init?.method === 'PUT') {
          record = {
            ...JSON.parse(String(init.body)),
            id: org,
            createdAt: company.createdAt,
            updatedAt: company.updatedAt,
            archived: false,
            ...(resource === 'leads'
              ? { status: 'NEW' }
              : resource === 'opportunities'
                ? { stage: 'QUALIFICATION' }
                : {}),
          };
          return json(record, init.method === 'POST' ? 201 : 200);
        }
        return json(
          String(input).endsWith(`/${org}`) ? record : record ? [record] : [],
        );
      });
      const api = new CrmApi('', org, transport);
      expect(await api.list(resource)).toEqual([]);
      expect((await api.create(resource, requests[resource])).id).toBe(org);
      expect(await api.list(resource)).toHaveLength(1);
      expect((await api.get(resource, org)).id).toBe(org);
      expect((await api.update(resource, org, requests[resource])).id).toBe(
        org,
      );
      await api.archive(resource, org);
      expect(await api.list(resource)).toEqual([]);
      for (const [url, init] of transport.mock.calls) {
        if (String(url).includes('/auth/')) continue;
        expect(new Headers(init?.headers).get('X-Organization-ID')).toBe(org);
      }
    },
  );
  test('company create, list, detail, update and archive round trip', async () => {
    const { api, calls } = mock();
    const created = await api.create('companies', company);
    expect(created.name).toBe('Acme');
    expect(await api.list('companies')).toHaveLength(1);
    expect((await api.get('companies', company.id)).id).toBe(company.id);
    expect(
      (
        await api.update('companies', company.id, {
          ...company,
          name: 'Updated',
        })
      ).name,
    ).toBe('Updated');
    await api.archive('companies', company.id);
    expect(await api.list('companies')).toEqual([]);
    for (const call of calls.filter((c) => !c.url.includes('/auth/'))) {
      expect(call.init.credentials).toBe('include');
      expect(new Headers(call.init.headers).get('X-Organization-ID')).toBe(org);
      if (call.init.method !== 'GET')
        expect(new Headers(call.init.headers).get('X-CSRF-TOKEN')).toBe(
          'test-token',
        );
    }
  });
  test.each<Resource>(['companies', 'contacts', 'leads', 'opportunities'])(
    'detail route: %s',
    async (resource) => {
      const transport = vi.fn<typeof fetch>(async () => json(company));
      const api = new CrmApi('', org, transport);
      await api.get(resource, org);
      expect(String(transport.mock.calls[0]?.[0])).toContain(
        `/${resource}/${org}`,
      );
    },
  );
  test('search and sort encode safely; pagination is never invented', async () => {
    const { api, calls } = mock();
    await api.list('companies', {
      search: 'A&B',
      sortBy: 'name',
      sortDirection: 'asc',
    });
    const url = new URL(calls[0].url, 'http://test');
    expect(url.searchParams.get('search')).toBe('A&B');
    expect(url.searchParams.get('sortDirection')).toBe('asc');
    expect(url.searchParams.has('page')).toBe(false);
  });
  test('association and state filters are forwarded', async () => {
    const { api, calls } = mock();
    await api.list('leads', { companyId: org, status: 'QUALIFIED' });
    await api.list('opportunities', {
      companyId: org,
      contactId: org,
      stage: 'PROPOSAL',
    });
    expect(calls[0].url).toContain('status=QUALIFIED');
    expect(calls[1].url).toContain('stage=PROPOSAL');
    expect(calls[1].url).toContain(`contactId=${org}`);
  });
  test('CSRF rotates after login, and auth calls have no tenant header', async () => {
    let generation = 0;
    const transport = vi.fn<typeof fetch>(async (input: RequestInfo | URL) =>
      String(input).endsWith('/csrf')
        ? json({ headerName: 'X-CSRF-TOKEN', token: `token-${++generation}` })
        : String(input).endsWith('/logout')
          ? new Response(null, { status: 204 })
          : json({
              id: org,
              email: 'dev@example.test',
              firstName: 'Dev',
              lastName: 'User',
            }),
    );
    const api = new CrmApi('', org, transport);
    await api.login('dev@example.test', 'mock-password');
    await api.logout();
    expect(
      new Headers(transport.mock.calls[1]?.[1]?.headers).get('X-CSRF-TOKEN'),
    ).toBe('token-1');
    expect(
      new Headers(transport.mock.calls[3]?.[1]?.headers).get('X-CSRF-TOKEN'),
    ).toBe('token-2');
    expect(
      new Headers(transport.mock.calls[1]?.[1]?.headers).has(
        'X-Organization-ID',
      ),
    ).toBe(false);
  });
  test('status and stage changes use confirmed PATCH routes', async () => {
    const { api, calls } = mock();
    await api.changeLeadStatus(org, 'CONTACTED');
    await api.changeOpportunityStage(org, 'NEEDS_ANALYSIS');
    expect(calls[1].url).toBe(`/api/leads/${org}/status`);
    expect(calls[1].init.method).toBe('PATCH');
    expect(JSON.parse(String(calls[2].init.body))).toEqual({
      stage: 'NEEDS_ANALYSIS',
    });
  });
  test.each([400, 401, 403, 404, 500])(
    'normalizes ProblemDetail %s',
    async (status) => {
      const api = new CrmApi('', org, async () =>
        json({ detail: 'Backend problem' }, status),
      );
      await expect(api.list('companies')).rejects.toMatchObject({
        status,
        message: 'Backend problem',
      });
    },
  );
  test('missing tenant fails before network access', async () => {
    const transport = vi.fn();
    await expect(
      new CrmApi('', '', transport).list('companies'),
    ).rejects.toMatchObject({ status: 403 });
    expect(transport).not.toHaveBeenCalled();
  });
  test('network failure, non-JSON error and malformed list are explicit', async () => {
    await expect(
      new CrmApi('', org, async () => {
        throw new Error('offline');
      }).list('companies'),
    ).rejects.toMatchObject({ status: 0 });
    await expect(
      new CrmApi(
        '',
        org,
        async () => new Response('bad', { status: 502 }),
      ).list('companies'),
    ).rejects.toBeInstanceOf(ApiError);
    await expect(
      new CrmApi('', org, async () => json({ content: [] })).list('companies'),
    ).rejects.toThrow('Expected an array');
  });
  test('cancellation remains an AbortError', async () => {
    const controller = new AbortController();
    controller.abort();
    const api = new CrmApi('', org, async (_input, init) => {
      expect(init?.signal).toBe(controller.signal);
      throw new DOMException('Aborted', 'AbortError');
    });
    await expect(
      api.list('companies', {}, controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
