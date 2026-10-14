import { expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuthSession } from '@wautech/wajahat';
import { ApplicationContext } from '../../providers/context';
import type { FeatureApplication } from '../contract';
import type { CrmContext } from '../../integrations/crm';
import { createOperationsApi } from '../operations/api';
import {
  document,
  goal,
  goalInput,
  website,
  journeys,
  journeyCopy,
} from './api';
import feature from './feature';
import Onboarding from './Onboarding';
import Profile from './Profile';
import Goals from './Goals';
import { referencePath } from '../copilot/api';
const id = '11111111-1111-4111-8111-111111111111',
  org = '22222222-2222-4222-8222-222222222222';
const plan = {
  id,
  version: 1,
  title: 'Reviewable goal',
  description: null,
  dueDate: null,
  status: 'ACTIVE',
  updatedAt: '2026-10-14T00:00:00Z',
  milestones: [
    {
      id: org,
      title: 'Review evidence',
      dueDate: null,
      completed: false,
      taskId: null,
      taskStatus: null,
    },
  ],
};
const json = (value: unknown) =>
  new Response(JSON.stringify(value), {
    headers: { 'Content-Type': 'application/json' },
  });
async function fixture(role: 'VIEWER' | 'ADMIN' = 'VIEWER') {
  const user = {
    id,
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
  let current: CrmContext = {
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
    auth: current.auth,
    tenant: current.tenant,
    session,
    config: {
      baseUrl: '',
      transport: 'session-cookie',
      tenantDiscovery: 'backend-membership',
    },
    organizations: [],
    selectOrganization: async () => {},
    reloadOrganizations: () => {},
    current: () => current,
  };
  const fetcher = vi.fn(async (input: RequestInfo | URL) =>
    String(input).includes('/auth/csrf')
      ? json({ headerName: 'X-CSRF-TOKEN', token: 'fixture' })
      : json({
          version: 1,
          updatedAt: '2026-10-14T00:00:00Z',
          data: { journey: 'EMPLOYEE' },
        }),
  );
  return {
    app,
    api: createOperationsApi(app, fetcher),
    fetcher,
    change() {
      current = {
        ...current,
        tenant: { status: 'unavailable', message: 'changed' },
      };
    },
  };
}
test('production business routes are tenant-gated in the existing host', () => {
  expect(feature.routes.map((r) => r.path)).toEqual([
    '/business-onboarding',
    '/business-profile',
    '/business-goals',
  ]);
  expect(feature.routes.every((r) => r.access === 'tenant')).toBe(true);
});
test('four adaptive journeys have optional-answer guidance', () => {
  expect(Object.keys(journeys)).toEqual(
    expect.arrayContaining([
      'EXISTING_OWNER',
      'NEW_FOUNDER',
      'BUSINESS_CHALLENGES',
      'EMPLOYEE',
    ]),
  );
  expect(journeyCopy.NEW_FOUNDER).toContain('validate');
  expect(journeyCopy.EMPLOYEE).toContain('role');
});
test('empty profile is absence rather than invented business facts', () => {
  expect(document({ version: 0, updatedAt: null, data: null }).data).toBeNull();
  expect(() =>
    document({
      version: 0,
      updatedAt: null,
      data: { businessName: 'Invented' },
    }),
  ).toThrow();
});
test('profile versions and current timestamps must be trustworthy', () => {
  expect(() =>
    document({ version: -1, updatedAt: null, data: null }),
  ).toThrow();
  expect(() =>
    document({ version: 1, updatedAt: 'broken', data: {} }),
  ).toThrow();
});
test('website validation rejects secret-bearing and executable URLs', () => {
  for (const url of [
    'javascript:alert(1)',
    'https://user:pass@example.test',
    'https://example.test?token=secret',
    'https://example.test#private',
  ])
    expect(() => website(url)).toThrow();
  expect(() => website('https://example.test/about')).not.toThrow();
});
test('goal input preserves explicit milestone declarations and task links', () => {
  const parsed = goal(plan);
  expect(goalInput(parsed).milestones[0].completed).toBe(false);
  expect(goalInput(parsed).milestones[0].taskId).toBeNull();
});
test('invalid duplicate milestone identities and fabricated task status fail closed', () => {
  expect(() =>
    goal({ ...plan, milestones: [plan.milestones[0], plan.milestones[0]] }),
  ).toThrow();
  expect(() =>
    goal({
      ...plan,
      milestones: [
        { ...plan.milestones[0], taskId: id, taskStatus: 'FAKE_SUCCESS' },
      ],
    }),
  ).toThrow();
});
test('VIEWER personal preferences use fresh CSRF without granting CRM writes', async () => {
  const f = await fixture();
  await f.api.write(
    '/business/preferences',
    'PUT',
    { journey: 'EMPLOYEE', storageConsent: true },
    false,
  );
  const call = f.fetcher.mock.calls.find(([url]) =>
    String(url).includes('/business/preferences'),
  )!;
  expect(call).toBeDefined();
  expect(f.api.canWrite).toBe(false);
  await expect(f.api.write('/business/goals', 'POST', {})).rejects.toThrow(
    'read-only',
  );
});
test('context switching blocks personal writes as well as shared writes', async () => {
  const f = await fixture();
  f.change();
  await expect(
    f.api.write('/business/preferences', 'PUT', {}, false),
  ).rejects.toThrow();
  expect(f.fetcher).not.toHaveBeenCalled();
});
test('permitted CRM source references navigate to the actual unified detail route', () => {
  expect(
    referencePath({
      id: 'tasks:' + id,
      label: 'Task',
      path: `/tasks/${id}`,
      facts: {},
    }),
  ).toBe('/record-context?resource=tasks&id=' + id);
  expect(
    referencePath({
      id: 'business-context',
      label: 'Business',
      path: '/business-profile',
      facts: {},
    }),
  ).toBe('/business-profile');
});
test('all production pages render text alternatives inside the host', async () => {
  const f = await fixture();
  for (const Component of [Onboarding, Profile, Goals]) {
    const html = renderToStaticMarkup(
      <ApplicationContext.Provider value={f.app}>
        <Component />
      </ApplicationContext.Provider>,
    );
    expect(html).not.toContain('getUserMedia');
    expect(html).not.toContain('<canvas');
    expect(html).toContain('Loading authorized workflows');
  }
});
