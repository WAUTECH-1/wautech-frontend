import { expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuthSession } from '@wautech/wajahat';
import { ApplicationContext } from '../../providers/context';
import type { FeatureApplication } from '../contract';
import type { CrmContext } from '../../integrations/crm';
import { createOperationsApi, note, savedView, page } from './api';
import feature from './feature';
import NotesPage from './NotesPage';
import ViewsPage from './ViewsPage';
import TransferPage from './TransferPage';
import PipelinesPage from './PipelinesPage';
const userId = '11111111-1111-4111-8111-111111111111',
  org = '22222222-2222-4222-8222-222222222222',
  id = '33333333-3333-4333-8333-333333333333';
const noteRow = {
  id,
  companyId: id,
  contactId: null,
  leadId: null,
  opportunityId: null,
  title: 'Fixture note',
  body: 'Plain <script> text',
  archived: false,
};
const view = {
  id,
  name: 'Companies',
  resource: 'COMPANY',
  configurationVersion: 1,
  configuration: { search: 'Fixture', sortBy: 'name', sortDirection: 'asc' },
};
const json = (value: unknown, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
async function fixture(
  role: 'ADMIN' | 'VIEWER' | 'SALES_USER' = 'ADMIN',
  respond: (
    path: string,
    init?: RequestInit,
  ) => Promise<Response> | Response = () => json(noteRow),
) {
  const user = {
    id: userId,
    email: 'fixture@example.test',
    firstName: 'Fixture',
    lastName: 'User',
  };
  const session = new AuthSession({
    me: async () => user,
    login: async () => user,
    logout: async () => {},
  });
  await session.restore();
  let context: CrmContext = {
    auth: session.getSnapshot(),
    tenant: {
      status: 'ready',
      organization: {
        id: org,
        memberUserId: userId,
        source: 'backend-membership',
        generation: 1,
        role,
      },
    },
    sessionEpoch: session.getEpoch(),
  };
  const app: FeatureApplication = {
    auth: context.auth,
    tenant: context.tenant,
    session,
    config: {
      baseUrl: '',
      transport: 'session-cookie',
      tenantDiscovery: 'backend-membership',
    },
    organizations: [],
    selectOrganization: async () => {},
    reloadOrganizations: () => {},
    current: () => context,
  };
  const fetcher = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const p = new URL(String(input), 'https://fixture.test').pathname;
      if (p === '/api/auth/csrf')
        return json({ headerName: 'X-CSRF-TOKEN', token: 'fixture' });
      if (p === '/api/companies/' + id)
        return json({ id, name: 'Fixture', archived: false });
      return respond(p, init);
    },
  );
  return {
    app,
    api: createOperationsApi(app, fetcher),
    fetcher,
    session,
    change: () => {
      context = { ...context, sessionEpoch: session.getEpoch() + 1 };
    },
  };
}
test('notes CRUD revalidates parent and confirms writes using CSRF and tenant scope', async () => {
  const { api, fetcher } = await fixture('ADMIN', (_p, init) =>
    init?.method === 'DELETE' ? json(null, 204) : json(noteRow),
  );
  const { id: _, ...input } = noteRow;
  void _;
  expect((await api.saveNote(input)).id).toBe(id);
  await api.saveNote(input, id);
  await api.archiveNote(id);
  expect(fetcher.mock.calls.map(([, init]) => init?.method)).toEqual(
    expect.arrayContaining(['POST', 'PUT', 'DELETE']),
  );
  for (const [input, init] of fetcher.mock.calls) {
    expect(init?.credentials).toBe('include');
    const headers = new Headers(init?.headers);
    expect(headers.get('X-Organization-ID')).toBe(
      String(input).includes('/auth/') ? null : org,
    );
    if (init?.method && init.method !== 'GET')
      expect(headers.get('X-CSRF-TOKEN')).toBe('fixture');
  }
});
test('VIEWER cannot change notes, views, assignments or imports', async () => {
  const { api, fetcher } = await fixture('VIEWER');
  await expect(api.archiveNote(id)).rejects.toThrow('read-only');
  await expect(
    api.saveView({ ...view, id: undefined } as never),
  ).rejects.toThrow('read-only');
  await expect(api.assign('tasks', id, userId)).rejects.toThrow('read-only');
  await expect(
    api.preview('companies', new File(['name'], 'fixture.csv')),
  ).rejects.toThrow('ADMIN');
  expect(fetcher).not.toHaveBeenCalled();
});
test('sales membership can author notes but cannot import', async () => {
  const { api } = await fixture('SALES_USER');
  expect(api.canWrite).toBe(true);
  expect(api.admin).toBe(false);
  await expect(
    api.preview('companies', new File(['header'], 'fixture.csv')),
  ).rejects.toThrow('ADMIN');
});
test('note association validation and malformed responses fail closed', () => {
  expect(() => note({ ...noteRow, contactId: id })).toThrow();
  expect(() => note({ ...noteRow, archived: true })).toThrow();
  expect(() => note({ ...noteRow, body: undefined })).toThrow();
  expect(() => savedView({ ...view, resource: 'USERS' })).toThrow();
  expect(() =>
    page(
      { content: [], page: 0, size: 1000, totalElements: 0, totalPages: 0 },
      note,
    ),
  ).toThrow();
});
test('saved view create/edit/archive uses actual DTO with no fabricated archived field', async () => {
  const { api } = await fixture('ADMIN', (_p, init) =>
    init?.method === 'DELETE' ? json(null, 204) : json(view),
  );
  const { id: _, ...input } = view;
  void _;
  expect((await api.saveView(input)).configuration.search).toBe('Fixture');
  await api.saveView(input, id);
  await api.archiveView(id);
});
test('CSV preview/import uses multipart and export preserves CSV bytes', async () => {
  const { api, fetcher } = await fixture('ADMIN', (p) =>
    p.endsWith('/validate')
      ? json({ totalRows: 1, validRows: 1, invalidRows: 0, errors: [] })
      : p.startsWith('/api/imports/')
        ? json({ processedRows: 1, createdRecords: 1 })
        : new Response('name\r\nFixture\r\n', {
            headers: { 'Content-Type': 'text/csv;charset=utf-8' },
          }),
  );
  const file = new File(
    ['name,website,industry,phone,email,status\nFixture,,,,,ACTIVE'],
    'fixture.csv',
  );
  expect((await api.preview('companies', file)).validRows).toBe(1);
  expect((await api.importCsv('companies', file)).createdRecords).toBe(1);
  expect(await (await api.exportCsv('companies')).text()).toContain('Fixture');
  const uploads = fetcher.mock.calls.filter(
    ([, init]) => init?.body instanceof FormData,
  );
  expect(uploads).toHaveLength(2);
  for (const [, init] of uploads)
    expect(new Headers(init?.headers).get('content-type')).toBeNull();
});
test.each(['bad.txt', 'bad.json'])(
  'invalid file %s rejected before network',
  async (name) => {
    const { api, fetcher } = await fixture();
    await expect(
      api.preview('companies', new File(['bad'], name)),
    ).rejects.toThrow('CSV');
    expect(fetcher).not.toHaveBeenCalled();
  },
);
test('stale/expired scope and API errors cannot return private records', async () => {
  let resolve!: (value: Response) => void;
  const { api, change } = await fixture(
    'ADMIN',
    () =>
      new Promise<Response>((r) => {
        resolve = r;
      }),
  );
  const pending = api.notes({}, new AbortController().signal);
  change();
  resolve(
    json({
      content: [noteRow],
      page: 0,
      size: 25,
      totalElements: 1,
      totalPages: 1,
    }),
  );
  await expect(pending).rejects.toThrow();
  const expired = await fixture('ADMIN', () => json({}, 401));
  await expect(
    expired.api.views(new AbortController().signal),
  ).rejects.toThrow();
  expect(expired.session.getSnapshot().status).toBe('anonymous');
  const failed = await fixture('ADMIN', () => json({}, 503));
  await expect(
    failed.api.views(new AbortController().signal),
  ).rejects.toThrow();
});
test('assignment requires matching server confirmation and verified minimal member DTO', async () => {
  const { api } = await fixture('ADMIN', (p) =>
    p.endsWith('eligible-members')
      ? json([{ userId, name: 'Fixture User' }])
      : json({ id, assigneeUserId: userId }),
  );
  expect((await api.members())[0].name).toBe('Fixture User');
  await expect(api.assign('tasks', id, userId)).resolves.toHaveProperty(
    'assigneeUserId',
    userId,
  );
  await expect(api.assign('tasks', 'bad', userId)).rejects.toThrow();
});
test('all operations routes mount within shared application; viewer import and pipeline writes absent', async () => {
  const { app } = await fixture('VIEWER');
  expect(feature.routes.every((r) => r.access === 'tenant')).toBe(true);
  for (const Page of [NotesPage, ViewsPage, TransferPage, PipelinesPage]) {
    const html = renderToStaticMarkup(
      <ApplicationContext.Provider value={app}>
        <Page />
      </ApplicationContext.Provider>,
    );
    expect(html).not.toContain('Sign in');
    expect(html).not.toContain('Create pipeline');
    expect(html).not.toContain('Create note');
    if (Page === TransferPage) {
      expect(html).toContain('CSV import requires ADMIN');
      expect(html).not.toContain('type="file"');
    }
  }
});
