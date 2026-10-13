/** Browser-only mock fixture, excluded from the production HTML/build entry. Never live integration proof. */
const userId = '11111111-1111-4111-8111-111111111111';
const orgId = '22222222-2222-4222-8222-222222222222';
const otherId = '33333333-3333-4333-8333-333333333333';
const companyId = '44444444-4444-4444-8444-444444444444';
const contactId = '55555555-5555-4555-8555-555555555555';
const now = new Date().toISOString();
const metadata = { createdAt: now, updatedAt: now, archived: false };
let authenticated = true;
const fixtureOptions = new URLSearchParams(window.location.search);
const fixtureStart = fixtureOptions.get('route') || '/dashboard';
const expireProfile = fixtureOptions.get('expireProfile') === '1';
const profile = {
  id: userId,
  email: 'fixture@example.test',
  firstName: 'Integration',
  lastName: 'Fixture',
};
const adminMembers = [
  {
    id: companyId,
    organizationId: orgId,
    userId,
    role: 'ADMIN',
    status: 'ACTIVE',
  },
  {
    id: contactId,
    organizationId: orgId,
    userId: otherId,
    role: 'VIEWER',
    status: 'ACTIVE',
  },
];
const records: Record<string, Record<string, unknown>[]> = {
  companies: [
    {
      ...metadata,
      id: companyId,
      name: 'Integration fixture company',
      website: null,
      industry: 'Testing',
      phone: null,
      email: null,
      status: 'ACTIVE',
    },
  ],
  contacts: [
    {
      ...metadata,
      id: contactId,
      companyId,
      firstName: 'Fixture',
      lastName: 'Contact',
      phone: null,
      email: null,
      jobTitle: null,
      status: 'ACTIVE',
    },
  ],
  leads: [
    {
      ...metadata,
      id: '66666666-6666-4666-8666-666666666666',
      companyId,
      firstName: 'Fixture',
      lastName: 'Lead',
      phone: null,
      email: null,
      jobTitle: null,
      status: 'NEW',
    },
  ],
  opportunities: [
    {
      ...metadata,
      id: '77777777-7777-4777-8777-777777777777',
      companyId,
      contactId,
      name: 'Fixture opportunity',
      amount: 125.5,
      currency: 'USD',
      stage: 'QUALIFICATION',
      description: null,
      expectedCloseDate: null,
    },
  ],
  tasks: [
    {
      id: '88888888-8888-4888-8888-888888888888',
      title: 'Fixture task',
      description: 'Mock task',
      status: 'OPEN',
      dueAt: now,
      overdue: true,
    },
  ],
  activities: [
    {
      id: '99999999-9999-4999-8999-999999999999',
      subject: 'Fixture activity',
      occurredAt: now,
    },
  ],
};
let read = false;
const memberships = [orgId, otherId].map((id, index) => ({
  organizationId: id,
  organizationName: `Mock organization ${index + 1}`,
  membershipId: companyId,
  role: index ? 'VIEWER' : 'ADMIN',
  status: 'ACTIVE',
}));
const result = (data: unknown, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
window.fetch = async (input, init) => {
  const url = new URL(String(input), window.location.origin),
    path = url.pathname;
  if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const method = init?.method || 'GET';
  const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
  if (path === '/api/auth/csrf')
    return result({
      headerName: 'X-CSRF-TOKEN',
      token: 'explicit-mock-fixture',
    });
  if (path === '/api/auth/login') {
    if (body.password === 'invalid') return result({}, 401);
    authenticated = true;
    return result({
      id: userId,
      email: 'fixture@example.test',
      firstName: 'Integration',
      lastName: 'Fixture',
    });
  }
  if (!authenticated) return result({}, 401);
  if (path === '/api/auth/profile') {
    if (expireProfile) {
      authenticated = false;
      return result({}, 401);
    }
    if (method === 'PATCH') {
      profile.firstName = body.firstName;
      profile.lastName = body.lastName;
    }
    return result(profile);
  }
  if (path.startsWith('/api/organization')) {
    if (new Headers(init?.headers).get('X-Organization-ID') !== orgId)
      return result({}, 403);
    if (path === '/api/organization') {
      if (method === 'PATCH') memberships[0].organizationName = body.name;
      return result({ id: orgId, name: memberships[0].organizationName });
    }
    if (path === '/api/organization/memberships') {
      if (method === 'POST') {
        const created = {
          id: crypto.randomUUID(),
          organizationId: orgId,
          userId: body.userId,
          role: 'VIEWER',
          status: 'INVITED',
        };
        adminMembers.push(created);
        return result(created, 201);
      }
      return result(adminMembers);
    }
    const member = adminMembers.find((item) => path.includes(item.id));
    if (!member) return result({}, 404);
    if (path.endsWith('/role')) member.role = body.role;
    if (path.endsWith('/status')) member.status = body.status;
    return result(member);
  }
  if (path === '/api/auth/logout') {
    authenticated = false;
    return result(null, 204);
  }
  if (path === '/api/auth/me')
    return result({
      id: userId,
      email: 'fixture@example.test',
      firstName: 'Integration',
      lastName: 'Fixture',
    });
  if (path === '/api/auth/organizations') return result(memberships);
  if (path.startsWith('/api/auth/organizations/'))
    return result(
      memberships.find((m) => path.includes(m.organizationId)) || {},
      memberships.some((m) => path.includes(m.organizationId)) ? 200 : 403,
    );
  const org = new Headers(init?.headers).get('X-Organization-ID');
  if (!memberships.some((m) => m.organizationId === org))
    return result({}, 403);
  if (org === otherId && method !== 'GET') return result({}, 403);
  if (path === '/api/pipeline')
    return result({
      stages: [
        {
          stage: 'QUALIFICATION',
          opportunityCount: 1,
          totalsByCurrency: { USD: 125.5 },
        },
      ],
    });
  if (path === '/api/notifications/unread-count')
    return result({ count: read ? 0 : 1 });
  if (path === '/api/notifications/read-all') {
    read = true;
    return result(null, 204);
  }
  if (path === '/api/notifications')
    return result({
      content: [
        {
          id: contactId,
          title: 'Mock notification',
          message: 'Test fixture only',
          readAt: read ? now : null,
        },
      ],
    });
  const [, , resource, id, action] = path.split('/');
  const rows = org === otherId ? [] : records[resource] || [];
  if (method === 'GET')
    return id
      ? result(
          rows.find((r) => r.id === id) || {},
          rows.some((r) => r.id === id) ? 200 : 404,
        )
      : result(
          rows.filter(
            (r) =>
              !url.searchParams.get('search') ||
              JSON.stringify(r)
                .toLowerCase()
                .includes(url.searchParams.get('search')!.toLowerCase()),
          ),
        );
  if (method === 'POST') {
    const row = {
      ...metadata,
      ...body,
      id: crypto.randomUUID(),
      ...(resource === 'leads' ? { status: 'NEW' } : {}),
      ...(resource === 'opportunities' ? { stage: 'QUALIFICATION' } : {}),
    };
    records[resource].push(row);
    return result(row, 201);
  }
  const row = rows.find((r) => r.id === id);
  if (!row) return result({}, 404);
  if (method === 'DELETE') {
    records[resource] = rows.filter((r) => r.id !== id);
    return result(null, 204);
  }
  if (action === 'status' || action === 'stage') Object.assign(row, body);
  else Object.assign(row, body);
  return result(row);
};
window.history.replaceState(null, '', fixtureStart);
await import('../src/main');
const banner = document.createElement('div');
banner.textContent = 'MOCK BROWSER TEST — not live backend data';
banner.style.cssText =
  'position:fixed;left:0;bottom:0;z-index:1000;background:#8b2030;color:white;padding:4px 10px;font:12px sans-serif';
document.body.append(banner);
