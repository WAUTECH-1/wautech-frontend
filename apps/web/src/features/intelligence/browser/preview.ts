/** Explicit browser-only mock; never imported by the production manifest. */
import { opportunityStages } from '@wautech/umer/contracts';
import { addDecimals } from '../money';
const userId = '11111111-1111-4111-8111-111111111111',
  orgId = '22222222-2222-4222-8222-222222222222',
  viewerOrg = '33333333-3333-4333-8333-333333333333',
  companyId = '44444444-4444-4444-8444-444444444444';
const options = new URLSearchParams(location.search),
  failure = options.get('fail');
const now = '2026-10-13T10:00:00Z',
  metadata = { createdAt: now, updatedAt: now, archived: false };
const user = {
  id: userId,
  email: 'fixture@example.test',
  firstName: 'Intelligence',
  lastName: 'Fixture',
};
let authenticated = true;
const rows = [
  {
    id: '55555555-5555-4555-8555-555555555555',
    name: 'Exact USD alpha',
    amount: 0.1,
    currency: 'USD',
    stage: 'QUALIFICATION',
  },
  {
    id: '66666666-6666-4666-8666-666666666666',
    name: 'Exact USD beta',
    amount: 0.2,
    currency: 'USD',
    stage: 'QUALIFICATION',
  },
  {
    id: '77777777-7777-4777-8777-777777777777',
    name: 'EUR proposal',
    amount: 100.0001,
    currency: 'EUR',
    stage: 'PROPOSAL',
  },
  {
    id: '88888888-8888-4888-8888-888888888888',
    name: 'Won opportunity',
    amount: 999.0001,
    currency: 'USD',
    stage: 'CLOSED_WON',
  },
  {
    id: '99999999-9999-4999-8999-999999999999',
    name: 'Unvalued opportunity',
    amount: null,
    currency: null,
    stage: 'NEEDS_ANALYSIS',
  },
].map((row) => ({
  ...metadata,
  ...row,
  companyId,
  contactId: null,
  description: null,
  expectedCloseDate: null,
}));
const json = (value: unknown, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
const memberships = [
  {
    organizationId: orgId,
    organizationName: 'Intelligence fixture',
    membershipId: companyId,
    role: 'ADMIN',
    status: 'ACTIVE',
  },
  {
    organizationId: viewerOrg,
    organizationName: 'Empty viewer fixture',
    membershipId: companyId,
    role: 'VIEWER',
    status: 'ACTIVE',
  },
];
window.fetch = async (input, init) => {
  if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const path = new URL(String(input), location.origin).pathname,
    method = init?.method || 'GET',
    body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
  if (path === '/api/auth/csrf')
    return json({ headerName: 'X-CSRF-TOKEN', token: 'mock-csrf' });
  if (path === '/api/auth/login') {
    authenticated = true;
    return json(user);
  }
  if (!authenticated) return json({}, 401);
  if (path === '/api/auth/logout') {
    authenticated = false;
    return json(null, 204);
  }
  if (path === '/api/auth/me' || path === '/api/auth/profile')
    return json(user);
  if (path === '/api/auth/organizations') return json(memberships);
  if (path.startsWith('/api/auth/organizations/'))
    return json(
      memberships.find((m) => path.includes(m.organizationId)) || {},
      memberships.some((m) => path.includes(m.organizationId)) ? 200 : 403,
    );
  const tenant = new Headers(init?.headers).get('X-Organization-ID');
  if (tenant !== orgId && tenant !== viewerOrg) return json({}, 403);
  if (failure && path === `/api/${failure}`) return json({}, 503);
  const visible = tenant === orgId ? rows : [];
  if (path === '/api/opportunities') return json(visible);
  if (path.startsWith('/api/opportunities/')) {
    const row = visible.find((row) => path.includes(row.id));
    if (!row) return json({}, 404);
    if (method === 'PATCH') {
      if (tenant === viewerOrg) return json({}, 403);
      row.stage = body.stage;
    }
    return json(row);
  }
  if (path === '/api/pipeline')
    return json({
      stages: opportunityStages.map((stage) => {
        const matches = visible.filter((row) => row.stage === stage),
          totalsByCurrency: Record<string, string> = {};
        for (const row of matches)
          if (row.amount !== null && row.currency)
            totalsByCurrency[row.currency] = addDecimals(
              totalsByCurrency[row.currency] || '0',
              String(row.amount),
            );
        return {
          stage,
          opportunityCount: matches.length,
          totalsByCurrency: Object.fromEntries(
            Object.entries(totalsByCurrency).map(([currency, amount]) => [
              currency,
              Number(amount),
            ]),
          ),
        };
      }),
    });
  if (path === '/api/companies')
    return json(
      tenant === orgId
        ? [{ ...metadata, id: companyId, name: 'Fixture company' }]
        : [],
    );
  if (path === '/api/contacts')
    return json(
      tenant === orgId
        ? [
            {
              ...metadata,
              id: companyId,
              companyId,
              firstName: 'Fixture',
              lastName: 'Contact',
            },
          ]
        : [],
    );
  if (path === '/api/leads')
    return json(
      tenant === orgId
        ? [
            {
              ...metadata,
              id: companyId,
              firstName: 'Fixture',
              lastName: 'Lead',
              status: 'QUALIFIED',
            },
          ]
        : [],
    );
  if (path === '/api/tasks')
    return json(
      tenant === orgId
        ? [
            {
              ...metadata,
              id: companyId,
              title: 'Fixture pending task',
              description: null,
              status: 'OPEN',
              overdue: false,
              dueAt: null,
            },
          ]
        : [],
    );
  if (path === '/api/activities')
    return json(
      tenant === orgId
        ? [
            {
              ...metadata,
              id: companyId,
              subject: 'Fixture call',
              occurredAt: now,
            },
          ]
        : [],
    );
  if (path === '/api/notifications') return json({ content: [] });
  if (path === '/api/notifications/unread-count') return json({ count: 0 });
  return json({}, 404);
};
history.replaceState(null, '', options.get('route') || '/dashboard');
await import('../../../main');
const banner = document.createElement('div');
banner.textContent = 'MOCK INTELLIGENCE TEST — not live backend data';
banner.style.cssText =
  'position:fixed;bottom:0;left:0;z-index:1000;background:#8b2030;color:#fff;padding:4px 8px;font:12px sans-serif';
document.body.append(banner);
