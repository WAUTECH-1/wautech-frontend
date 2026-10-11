// Run against a development backend with a provisioned account and active membership.
import assert from 'node:assert/strict';
import process from 'node:process';
import console from 'node:console';
const base = process.env.CRM_SMOKE_BASE_URL || 'http://localhost:8080';
const organization = process.env.CRM_SMOKE_ORGANIZATION_ID;
const email = process.env.CRM_SMOKE_EMAIL;
const password = process.env.CRM_SMOKE_PASSWORD;
if (!organization || !email || !password)
  throw new Error(
    'Provide CRM_SMOKE_ORGANIZATION_ID, CRM_SMOKE_EMAIL and CRM_SMOKE_PASSWORD in your environment.',
  );
const cookies = new Map();
let csrf;
async function request(path, method = 'GET', body) {
  const headers = {
    Accept: 'application/json',
    Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join('; '),
  };
  if (!path.startsWith('/api/auth/'))
    headers['X-Organization-ID'] = organization;
  if (method !== 'GET') {
    headers[csrf.headerName] = csrf.token;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
  }
  const response = await globalThis.fetch(`${base.replace(/\/$/, '')}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(';')[0];
    const index = pair.indexOf('=');
    cookies.set(pair.slice(0, index), pair.slice(index + 1));
  }
  if (!response.ok)
    throw new Error(`${method} ${path}: HTTP ${response.status}`);
  return response.status === 204 ? undefined : response.json();
}
let id;
let authenticated = false;
try {
  csrf = await request('/api/auth/csrf');
  await request('/api/auth/login', 'POST', { email, password });
  authenticated = true;
  csrf = await request('/api/auth/csrf');
  const body = {
    name: `Frontend smoke ${Date.now()}`,
    website: null,
    industry: 'Integration QA',
    phone: null,
    email: null,
    status: 'ACTIVE',
  };
  const created = await request('/api/companies', 'POST', body);
  id = created.id;
  assert.equal(created.name, body.name);
  assert.equal((await request(`/api/companies/${id}`)).id, id);
  const updated = await request(`/api/companies/${id}`, 'PUT', {
    ...body,
    name: `${body.name} updated`,
  });
  assert.equal(updated.name, `${body.name} updated`);
  const rows = await request(
    `/api/companies?search=${encodeURIComponent(body.name)}&sortBy=name&sortDirection=asc`,
  );
  assert.ok(rows.some((row) => row.id === id));
  await request(`/api/companies/${id}`, 'DELETE');
  const after = await request(
    `/api/companies?search=${encodeURIComponent(body.name)}`,
  );
  assert.ok(!after.some((row) => row.id === id));
  id = undefined;
  console.log(
    'LIVE company create/list/detail/update/search/archive smoke passed.',
  );
} finally {
  if (id) await request(`/api/companies/${id}`, 'DELETE');
  if (authenticated) await request('/api/auth/logout', 'POST');
}
