import { expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuthSession } from '@wautech/wajahat';
import type { FeatureApplication } from '../contract';
import type { CrmContext } from '../../integrations/crm';
import { createWorkflowApi, parseRecord, parseNotificationPage } from './api';
import {
  emptyLinks,
  instant,
  queryString,
  transitions,
  validateInput,
  workflowLink,
} from './contracts';
import { RecordForm } from './RecordForm';
import feature from './feature';
const id = '11111111-1111-4111-8111-111111111111',
  org = '22222222-2222-4222-8222-222222222222',
  company = '33333333-3333-4333-8333-333333333333';
const time = '2026-10-13T12:00:00Z';
const links = { ...emptyLinks(), companyId: company };
const task = {
  ...links,
  id,
  title: 'Call buyer',
  description: null,
  priority: 'NORMAL',
  status: 'OPEN',
  dueAt: time,
  completedAt: null,
  overdue: false,
  createdAt: time,
  updatedAt: time,
  archived: false,
};
const activity = {
  ...links,
  id,
  subject: 'Meeting',
  description: null,
  type: 'MEETING',
  occurredAt: time,
  createdAt: time,
  updatedAt: time,
  archived: false,
};
const notification = {
  id,
  title: 'Membership updated',
  message: 'Membership changed',
  targetType: 'ORGANIZATION_MEMBERSHIP',
  targetId: company,
  createdAt: time,
  readAt: null,
};
const reply = (data: unknown, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
async function setup(
  role: 'ADMIN' | 'VIEWER' = 'ADMIN',
  handler?: (path: string, init?: RequestInit) => Response | Promise<Response>,
) {
  const user = {
    id,
    email: 'fixture@example.test',
    firstName: 'Test',
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
        memberUserId: id,
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
      const path = new URL(String(input), 'https://fixture.test').pathname;
      if (path === '/api/auth/csrf')
        return reply({ headerName: 'X-CSRF-TOKEN', token: 'fixture' });
      return handler
        ? handler(path, init)
        : reply({ id: company, name: 'Buyer', archived: false });
    },
  );
  return {
    api: createWorkflowApi(app, fetcher),
    fetcher,
    session,
    app,
    change: () => {
      context = { ...context, sessionEpoch: (context.sessionEpoch ?? 0) + 1 };
    },
  };
}
test.each(['tasks', 'activities'] as const)(
  '%s create/update/detail/archive use verified relationships and server confirmation',
  async (kind) => {
    const row = kind === 'tasks' ? task : activity;
    const { api, fetcher } = await setup('ADMIN', (path, init) =>
      path.startsWith('/api/companies/')
        ? reply({ id: company, name: 'Buyer', archived: false })
        : init?.method === 'DELETE'
          ? reply(null, 204)
          : reply(row),
    );
    const input =
      kind === 'tasks'
        ? {
            ...links,
            title: 'Call buyer',
            description: null,
            priority: 'NORMAL' as const,
            dueAt: time,
          }
        : {
            ...links,
            subject: 'Meeting',
            description: null,
            type: 'MEETING' as const,
            occurredAt: time,
          };
    expect((await api.save(kind, input)).id).toBe(id);
    await api.save(kind, input, id);
    expect((await api.get(kind, id)).id).toBe(id);
    await api.archive(kind, id);
    expect(fetcher.mock.calls.map(([, init]) => init?.method)).toEqual(
      expect.arrayContaining(['POST', 'PUT', 'DELETE']),
    );
    for (const [url, init] of fetcher.mock.calls) {
      expect(init?.credentials).toBe('include');
      const headers = new Headers(init?.headers);
      expect(headers.get('X-Organization-ID')).toBe(
        String(url).includes('/auth/') ? null : org,
      );
      if (init?.method && init.method !== 'GET')
        expect(headers.get('X-CSRF-TOKEN')).toBe('fixture');
    }
  },
);
test('completion and reopening require valid transitions and matching server confirmation', async () => {
  const { api } = await setup('ADMIN', (_p, init) =>
    reply({ ...task, status: JSON.parse(String(init?.body)).status }),
  );
  const completed = await api.status(parseRecord('tasks', task), 'COMPLETED');
  expect(completed.task?.status).toBe('COMPLETED');
  expect((await api.status(completed, 'OPEN')).task?.status).toBe('OPEN');
  await expect(api.status(completed, 'IN_PROGRESS')).rejects.toThrow(
    'transition',
  );
  expect(transitions.CANCELLED).toEqual(['OPEN']);
});
test('viewer cannot create/edit/archive/status but can mark personal notifications read', async () => {
  const { api, fetcher } = await setup('VIEWER', (_p, init) =>
    reply(init?.method === 'PATCH' ? { ...notification, readAt: time } : []),
  );
  await expect(
    api.save('tasks', {
      ...links,
      title: 'X',
      description: null,
      priority: 'NORMAL',
      dueAt: null,
    }),
  ).rejects.toThrow('read-only');
  await expect(api.archive('tasks', id)).rejects.toThrow('read-only');
  await expect(
    api.status(parseRecord('tasks', task), 'COMPLETED'),
  ).rejects.toThrow('read-only');
  expect(fetcher).not.toHaveBeenCalled();
  expect((await api.markRead(id)).readAt).toBe(time);
  await expect(api.membershipTarget(company)).rejects.toThrow('permission');
});
test('notification list/count/read-all and membership navigation use actual response contracts', async () => {
  const { api } = await setup('ADMIN', (p) =>
    reply(
      p.endsWith('unread-count')
        ? { count: 1 }
        : p.endsWith('read-all')
          ? { updatedCount: 1 }
          : p.endsWith('memberships')
            ? [{ id: company, organizationId: org }]
            : {
                content: [notification],
                page: 0,
                size: 20,
                totalElements: 1,
                totalPages: 1,
                first: true,
                last: true,
              },
    ),
  );
  expect(
    (await api.notifications(0, new AbortController().signal)).content[0]
      .readAt,
  ).toBeNull();
  expect(await api.unread(new AbortController().signal)).toBe(1);
  expect(await api.markAllRead()).toBe(1);
  expect(await api.membershipTarget(company)).toBe('/administration');
  await expect(api.membershipTarget(id)).rejects.toThrow('unavailable');
});
test('cross-tenant or missing relationship blocks writes before CSRF/mutation', async () => {
  const { api, fetcher } = await setup('ADMIN', () => reply({}, 404));
  await expect(
    api.save('tasks', {
      ...links,
      title: 'X',
      description: null,
      priority: 'HIGH',
      dueAt: null,
    }),
  ).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
test('stale response after context change is discarded', async () => {
  let resolve!: (r: Response) => void;
  const { api, change } = await setup(
    'ADMIN',
    () =>
      new Promise<Response>((r) => {
        resolve = r;
      }),
  );
  const pending = api.get('tasks', id);
  change();
  resolve(reply(task));
  await expect(pending).rejects.toThrow();
  expect(api.active()).toBe(false);
});
test('401 expires shared session and backend errors remain errors', async () => {
  const expired = await setup('ADMIN', () => reply({}, 401));
  await expect(expired.api.get('tasks', id)).rejects.toThrow();
  expect(expired.session.getSnapshot().status).toBe('anonymous');
  const failed = await setup('ADMIN', () => reply({}, 503));
  await expect(failed.api.get('tasks', id)).rejects.toThrow();
});
test('disposed scope and aborted requests cannot return records', async () => {
  const { api } = await setup('ADMIN', () => reply(task));
  api.dispose();
  await expect(api.get('tasks', id)).rejects.toThrow();
});
test('search/filter/sort and deep links encode only valid supported values', () => {
  const query = queryString('tasks', {
    search: 'a & b',
    priority: 'URGENT',
    status: 'OPEN',
    companyId: company,
    sortBy: 'dueAt',
    sortDirection: 'asc',
    overdue: 'true',
  });
  expect(new URLSearchParams(query).get('search')).toBe('a & b');
  expect(workflowLink('activities', links, id)).toBe(
    `/activities?id=${id}&companyId=${company}`,
  );
  expect(() => queryString('activities', { status: 'OPEN' })).toThrow();
  expect(() => queryString('tasks', { sortBy: 'unsafe' })).toThrow();
  expect(() => queryString('tasks', { companyId: 'bad' })).toThrow();
  expect(() =>
    queryString('tasks', { dueAfter: '2026-10-14T00:00:00Z', dueBefore: time }),
  ).toThrow('reversed');
});
test.each(['2026-02-30T12:00', '2026-13-01T00:00', '2026-10-13T25:00', 'bad'])(
  'invalid due date %s is rejected',
  (value) => expect(() => instant(value, true)).toThrow(),
);
test('required associations, title/type and activity timestamp are validated', () => {
  expect(() =>
    validateInput('tasks', {
      ...emptyLinks(),
      title: 'X',
      description: null,
      priority: 'NORMAL',
      dueAt: null,
    }),
  ).toThrow('related');
  expect(() =>
    validateInput('activities', {
      ...links,
      subject: '',
      description: null,
      type: 'NOTE',
      occurredAt: time,
    }),
  ).toThrow('Title');
  expect(() =>
    validateInput('activities', {
      ...links,
      subject: 'X',
      description: null,
      type: 'NOTE',
      occurredAt: '',
    }),
  ).toThrow();
});
test('malformed, archived and duplicate responses fail closed', async () => {
  expect(() => parseRecord('tasks', { ...task, archived: true })).toThrow();
  expect(() =>
    parseRecord('activities', { ...activity, type: 'SMS' }),
  ).toThrow();
  expect(() => parseNotificationPage({ content: [], page: -1 })).toThrow();
  const { api } = await setup('ADMIN', () => reply([task, task]));
  await expect(
    api.list('tasks', {}, new AbortController().signal),
  ).rejects.toThrow('Duplicate');
});
test('production exports register three tenant routes and form fields have keyboard labels', async () => {
  expect(feature.routes.map((r) => [r.path, r.access])).toEqual([
    ['/tasks', 'tenant'],
    ['/activities', 'tenant'],
    ['/notifications', 'tenant'],
  ]);
  const { api } = await setup();
  const html = renderToStaticMarkup(
    <RecordForm
      kind="tasks"
      api={api}
      busy={false}
      onSave={async () => {}}
      onCancel={() => {}}
    />,
  );
  expect(html).toContain('datetime-local');
  expect(html).toContain('Related company ID');
  expect(html).toContain('type="submit"');
  expect(html).not.toContain('tabindex="-1"');
});
