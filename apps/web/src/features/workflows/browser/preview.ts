/** Explicit disposable mock, excluded from production imports. */
import { opportunityStages } from '@wautech/umer/contracts';
const userId = '11111111-1111-4111-8111-111111111111',
  org = '22222222-2222-4222-8222-222222222222',
  viewer = '33333333-3333-4333-8333-333333333333',
  company = '44444444-4444-4444-8444-444444444444';
const options = new URLSearchParams(location.search),
  time = '2026-10-13T12:00:00Z';
const metadata = { createdAt: time, updatedAt: time, archived: false };
const links = {
  companyId: company,
  contactId: null,
  leadId: null,
  opportunityId: null,
};
const user = {
  id: userId,
  email: 'fixture@example.test',
  firstName: 'Workflow',
  lastName: 'Fixture',
};
const memberships = [
  {
    organizationId: org,
    organizationName: 'Workflow fixture',
    membershipId: company,
    role: 'ADMIN',
    status: 'ACTIVE',
  },
  {
    organizationId: viewer,
    organizationName: 'Empty viewer fixture',
    membershipId: company,
    role: 'VIEWER',
    status: 'ACTIVE',
  },
];
let authenticated = true,
  sequence = 5;
type Row = Record<string, unknown>;
const tasks: Row[] = [
  {
    ...metadata,
    ...links,
    id: '55555555-5555-4555-8555-555555555555',
    title: 'Fixture task',
    description: null,
    status: 'OPEN',
    priority: 'HIGH',
    dueAt: time,
    completedAt: null,
    overdue: true,
  },
];
const activities: Row[] = [
  {
    ...metadata,
    ...links,
    id: '66666666-6666-4666-8666-666666666666',
    subject: 'Fixture call',
    description: null,
    type: 'CALL',
    occurredAt: time,
  },
];
const notifications = [
  {
    id: '77777777-7777-4777-8777-777777777777',
    title: 'Membership updated',
    message: 'Disposable notification',
    targetType: 'ORGANIZATION_MEMBERSHIP',
    targetId: company,
    createdAt: time,
    readAt: null as string | null,
  },
];
const json = (data: unknown, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
window.fetch = async (input, init) => {
  if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const url = new URL(String(input), location.origin),
    p = url.pathname,
    method = init?.method || 'GET',
    body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
  if (p === '/api/auth/csrf')
    return json({ headerName: 'X-CSRF-TOKEN', token: 'mock' });
  if (p === '/api/auth/login') {
    authenticated = true;
    return json(user);
  }
  if (!authenticated) return json({}, 401);
  if (p === '/api/auth/logout') {
    authenticated = false;
    return json(null, 204);
  }
  if (p === '/api/auth/me' || p === '/api/auth/profile') return json(user);
  if (p === '/api/auth/organizations') return json(memberships);
  if (p.startsWith('/api/auth/organizations/'))
    return json(memberships.find((m) => p.includes(m.organizationId)) || {});
  const tenant = new Headers(init?.headers).get('X-Organization-ID');
  if (tenant !== org && tenant !== viewer) return json({}, 403);
  if (options.get('fail') && p === `/api/${options.get('fail')}`)
    return json({}, 503);
  const readonly = tenant === viewer;
  if (method !== 'GET' && readonly && !p.startsWith('/api/notifications'))
    return json({}, 403);
  for (const [kind, store] of [
    ['tasks', tasks],
    ['activities', activities],
  ] as const) {
    if (!p.startsWith(`/api/${kind}`)) continue;
    const visible = readonly ? [] : store.filter((r) => !r.archived);
    if (p === `/api/${kind}`) {
      if (method === 'POST') {
        const id = `a0000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`;
        const row = {
          ...metadata,
          ...body,
          id,
          ...(kind === 'tasks'
            ? { status: 'OPEN', completedAt: null, overdue: false }
            : {}),
        };
        store.push(row);
        return json(row, 201);
      }
      let rows = visible.filter((r) =>
        [...url.searchParams].every(([key, value]) =>
          ['sortBy', 'sortDirection'].includes(key) || key === 'search'
            ? key !== 'search' ||
              String(r.title || r.subject)
                .toLowerCase()
                .includes(value.toLowerCase())
            : key === 'dueAfter'
              ? Date.parse(String(r.dueAt)) >= Date.parse(value)
              : key === 'dueBefore'
                ? Date.parse(String(r.dueAt)) <= Date.parse(value)
                : String(r[key]) === value,
        ),
      );
      const sort = url.searchParams.get('sortBy');
      if (sort)
        rows = rows.sort(
          (a, b) =>
            String(a[sort] ?? '').localeCompare(String(b[sort] ?? '')) *
            (url.searchParams.get('sortDirection') === 'desc' ? -1 : 1),
        );
      return json(rows);
    }
    const row = visible.find((r) => p.includes(String(r.id)));
    if (!row) return json({}, 404);
    if (method === 'DELETE') {
      row.archived = true;
      return json(null, 204);
    }
    if (method === 'PUT') Object.assign(row, body);
    if (method === 'PATCH') {
      row.status = body.status;
      row.completedAt = body.status === 'COMPLETED' ? time : null;
      row.overdue = false;
    }
    return json(row);
  }
  if (p === '/api/notifications/unread-count')
    return json({
      count: readonly ? 0 : notifications.filter((n) => !n.readAt).length,
    });
  if (p === '/api/notifications/read-all') {
    const updatedCount = readonly
      ? 0
      : notifications.filter((n) => !n.readAt).length;
    if (!readonly) notifications.forEach((n) => (n.readAt = time));
    return json({ updatedCount });
  }
  if (p === '/api/notifications') {
    const rows = readonly ? [] : notifications;
    return json({
      content: rows,
      page: Number(url.searchParams.get('page') || 0),
      size: 20,
      totalElements: rows.length,
      totalPages: rows.length ? 1 : 0,
      first: true,
      last: true,
    });
  }
  if (p.startsWith('/api/notifications/')) {
    const row = readonly
      ? undefined
      : notifications.find((n) => p.includes(n.id));
    if (!row) return json({}, 404);
    if (method === 'PATCH') row.readAt = time;
    return json(row);
  }
  if (p === '/api/organization/memberships')
    return json(readonly ? [] : [{ id: company, organizationId: org }]);
  if (p === '/api/pipeline')
    return json({
      stages: opportunityStages.map((stage) => ({
        stage,
        opportunityCount: 0,
        totalsByCurrency: {},
      })),
    });
  if (p === '/api/companies')
    return json(
      readonly ? [] : [{ ...metadata, id: company, name: 'Fixture buyer' }],
    );
  if (p === `/api/companies/${company}`)
    return readonly
      ? json({}, 404)
      : json({ ...metadata, id: company, name: 'Fixture buyer' });
  if (['/api/contacts', '/api/leads', '/api/opportunities'].includes(p))
    return json([]);
  return json({}, 404);
};
history.replaceState(null, '', options.get('route') || '/tasks');
await import('../../../main');
const banner = document.createElement('div');
banner.textContent = 'MOCK WORKFLOW TEST — disposable in-memory data';
banner.style.cssText =
  'position:fixed;bottom:0;left:0;z-index:1000;background:#8b2030;color:white;padding:4px;font:12px sans-serif';
document.body.append(banner);
