// Development-only QA entry. Vite production build includes only index.html.
import { createRoot } from 'react-dom/client';
import { CrmApi } from '../src/api';
import { Workspace } from '../src/Workspace';
import type { Resource } from '../src/contracts';
import '../src/styles.css';
const organization = '12345678-1234-1234-1234-123456789abc';
const now = '2026-10-11T09:00:00Z';
type MockRecord = Record<string, unknown> & { id: string };
const data: Record<Resource, MockRecord[]> = {
  companies: Array.from({ length: 13 }, (_, i) => ({
    id: `12345678-1234-1234-1234-${String(i + 1).padStart(12, '0')}`,
    name:
      [
        'Northstar Labs',
        'Meridian Group',
        'Atlas Commerce',
        'Cedar & Stone',
        'Pioneer Systems',
      ][i % 5] + (i > 4 ? ` ${i + 1}` : ''),
    industry: ['Technology', 'Consulting', 'Retail'][i % 3],
    website: 'https://example.test',
    email: 'hello@example.test',
    phone: null,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
    archived: false,
  })),
  contacts: [],
  leads: [],
  opportunities: [],
};
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
const transport: typeof fetch = async (input, init) => {
  const url = new URL(String(input), 'http://mock.test');
  const parts = url.pathname.split('/').filter(Boolean);
  const resource = parts[1] as Resource;
  const id = parts[2];
  if (url.pathname === '/api/auth/csrf')
    return response({
      headerName: 'X-CSRF-TOKEN',
      token: 'mock-only',
      parameterName: '_csrf',
    });
  if (!data[resource])
    return response({ detail: 'Fixture route not supported' }, 404);
  if (new Headers(init?.headers).get('X-Organization-ID') !== organization)
    return response({ detail: 'Mock tenant denied' }, 403);
  if (url.searchParams.get('search') === 'backend-error')
    return response({ detail: 'Mock backend failure' }, 500);
  if (url.searchParams.get('search') === 'forbidden')
    return response({ detail: 'Mock authorization denied' }, 403);
  if (init?.method === 'POST') {
    const body = JSON.parse(String(init.body));
    const record = {
      ...body,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      archived: false,
      ...(resource === 'leads'
        ? { status: 'NEW' }
        : resource === 'opportunities'
          ? { stage: 'QUALIFICATION' }
          : {}),
    };
    data[resource].unshift(record);
    return response(record, 201);
  }
  const record = data[resource].find((r) => r.id === id);
  if (id && !record) return response({ detail: 'Mock record not found' }, 404);
  if (init?.method === 'DELETE') {
    data[resource] = data[resource].filter((r) => r.id !== id);
    return new Response(null, { status: 204 });
  }
  if (init?.method === 'PUT' || init?.method === 'PATCH') {
    Object.assign(record!, JSON.parse(String(init.body)));
    return response(record);
  }
  if (id) return response(record);
  let rows = data[resource].filter((r) => !r.archived);
  for (const field of ['companyId', 'contactId', 'status', 'stage'])
    if (url.searchParams.get(field))
      rows = rows.filter((r) => r[field] === url.searchParams.get(field));
  const search = url.searchParams.get('search')?.toLowerCase();
  if (search)
    rows = rows.filter((r) =>
      ['name', 'firstName', 'lastName', 'email', 'industry'].some((k) =>
        String(r[k] || '')
          .toLowerCase()
          .includes(search),
      ),
    );
  const sort = url.searchParams.get('sortBy');
  if (sort)
    rows.sort(
      (a, b) =>
        String(a[sort]).localeCompare(String(b[sort])) *
        (url.searchParams.get('sortDirection') === 'desc' ? -1 : 1),
    );
  return response(rows);
};
const api = new CrmApi('', organization, transport);
createRoot(document.getElementById('root')!).render(
  <Workspace
    api={api}
    user={{
      id: 'mock',
      email: 'mock@example.test',
      firstName: 'Mock QA',
      lastName: 'Only',
    }}
    organization={organization}
    onDisconnect={async () => {
      window.location.href = '/';
    }}
    disconnectBusy={false}
    accessError="MOCK NETWORK QA — no live backend verification"
  />,
);
