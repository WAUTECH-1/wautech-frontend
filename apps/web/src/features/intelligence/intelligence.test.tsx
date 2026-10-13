import { expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { opportunityStages } from '@wautech/umer/contracts';
import {
  addDecimals,
  decimal,
  moneyLabel,
  parseExactJson,
  sumMoney,
} from './money';
import {
  records,
  parsePipeline,
  parseLeads,
  parseOpportunities,
  loadSnapshot,
  filterLeads,
  filterOpportunities,
  pipelineTotals,
  exactRequest,
} from './data';
import type { Snapshot, OpportunityRow } from './data';
import { csv, reportCsv } from './csv';
import {
  ScopedStore,
  sameContext,
  canChangeStage,
  createIntelligenceRuntime,
} from './runtime';
import { ReportsContent } from './ReportsPage';
import DashboardPage from './DashboardPage';
import { ApplicationContext } from '../../providers/context';
import { intelligenceRuntime } from './runtime';
import { LoadBoundary, Source } from './ui';
import { AuthSession } from '@wautech/wajahat';
import type { FeatureApplication } from '../contract';
import type { CrmContext } from '../../integrations/crm';
const id = '11111111-1111-4111-8111-111111111111',
  other = '22222222-2222-4222-8222-222222222222';
const createdAt = '2026-10-12T23:00:00Z';
const row: OpportunityRow = {
  id,
  name: 'Alpha deal',
  stage: 'QUALIFICATION',
  amount: '0.1',
  currency: 'USD',
  companyId: other,
  createdAt,
};
const stages = opportunityStages.map((stage) => ({
  stage,
  opportunityCount: stage === 'QUALIFICATION' ? 2 : 0,
  totalsByCurrency:
    stage === 'QUALIFICATION' ? { USD: '0.3', EUR: '2.5000' } : {},
}));
const snapshot: Snapshot = {
  asOf: createdAt,
  companies: { status: 'ready', value: 0 },
  contacts: { status: 'ready', value: 0 },
  leads: { status: 'ready', value: [] },
  pipeline: { status: 'ready', value: parsePipeline(stagesToObject()) },
  tasks: { status: 'ready', value: [] },
  activities: { status: 'ready', value: [] },
};
function stagesToObject() {
  return { stages };
}
function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
test('preserves decimal JSON tokens and escaped string content', () => {
  expect(
    parseExactJson(
      String.raw`{"amount":999999999999999.1234,"count":2,"name":"price 1 \"quoted\""}`,
    ),
  ).toEqual({
    amount: '999999999999999.1234',
    count: '2',
    name: 'price 1 "quoted"',
  });
  expect(() => parseExactJson('{broken}')).toThrow('Invalid JSON');
});
test('exact arithmetic and currency-separated sums never round or combine currencies', () => {
  expect(addDecimals('0.1', '0.2')).toBe('0.3');
  expect(
    sumMoney([
      row,
      { amount: '2.5', currency: 'EUR' },
      { amount: '0.2', currency: 'USD' },
    ]),
  ).toEqual({ totals: { USD: '0.3', EUR: '2.5' }, unavailable: 0 });
  expect(moneyLabel('999999999999999.1234', 'USD')).toBe(
    'USD 999,999,999,999,999.1234',
  );
});
test.each([
  null,
  undefined,
  -1,
  Infinity,
  NaN,
  '-1',
  '1e999',
  'garbage',
  {},
  Number.MAX_SAFE_INTEGER + 1,
])('missing or invalid money %s is unavailable', (amount) => {
  expect(decimal(amount)).toBeNull();
  expect(sumMoney([{ amount, currency: 'USD' }]).unavailable).toBe(1);
});
test('invalid currency and unvalued opportunities are counted, not silently treated as zero', () => {
  expect(
    sumMoney([
      { amount: null, currency: null },
      { amount: '4', currency: 'usd' },
    ]),
  ).toEqual({ totals: {}, unavailable: 2 });
  expect(moneyLabel(null, 'USD')).toBe('Value unavailable');
});
test('aggregate contracts reject missing/duplicate stages, invalid counts and money', () => {
  expect(parsePipeline(stagesToObject())).toHaveLength(6);
  expect(() => parsePipeline({ stages: stages.slice(1) })).toThrow();
  expect(() =>
    parsePipeline({ stages: stages.map(() => stages[0]) }),
  ).toThrow();
  expect(() =>
    parsePipeline({
      stages: stages.map((s) => ({ ...s, opportunityCount: 'NaN' })),
    }),
  ).toThrow();
  expect(() =>
    parsePipeline({
      stages: stages.map((s) => ({
        ...s,
        totalsByCurrency: { USD: 'invalid' },
      })),
    }),
  ).toThrow();
});
test('open totals exclude closed stages and preserve all currency buckets', () => {
  const parsed = parsePipeline(stagesToObject());
  parsed[4].totals = { USD: '100' };
  expect(pipelineTotals(parsed, true)).toEqual({ USD: '0.3', EUR: '2.5' });
  expect(pipelineTotals(parsed)).toEqual({ USD: '100.3', EUR: '2.5' });
});
test('lead cohorts use inclusive UTC creation dates and reject invalid ranges', () => {
  const rows = parseLeads([
    { id, status: 'QUALIFIED', createdAt: '2026-10-13T00:30:00+02:00' },
  ]);
  expect(filterLeads(rows, '2026-10-12', '2026-10-12')).toHaveLength(1);
  expect(filterLeads(rows, '2026-10-13')).toHaveLength(0);
  expect(() => filterLeads(rows, '2026-02-30')).toThrow();
  expect(() => filterLeads(rows, '2026-10-13', '2026-10-12')).toThrow();
});
test('pipeline search/stage/currency filters are conjunctive and stable', () => {
  const rows = [
    row,
    {
      ...row,
      id: other,
      name: 'Beta',
      stage: 'PROPOSAL' as const,
      currency: 'EUR',
    },
  ];
  expect(filterOpportunities(rows, 'ALP', 'QUALIFICATION', 'USD')).toEqual([
    row,
  ]);
  expect(filterOpportunities(rows, 'Alpha', '', 'EUR')).toEqual([]);
});
test('unpaged lists reject oversized/duplicate/invalid data rather than partial totals', () => {
  expect(() => records(Array.from({ length: 5001 }, () => ({ id })))).toThrow(
    '5,000',
  );
  expect(() => records([{ id }, { id }])).toThrow('Duplicate');
  expect(() => parseLeads([{ id, status: 'CONVERTED', createdAt }])).toThrow();
  expect(() => parseOpportunities([{ ...row, stage: 'FAKE' }])).toThrow();
});
test('CSV escapes quotes/comma/newlines and neutralizes formula prefixes', () => {
  expect(csv([['a,b', 'a"b', 'a\nb', '=SUM(A1)', ' @command']])).toBe(
    '\uFEFF"a,b","a""b","a\nb","\'=SUM(A1)","\' @command"\r\n',
  );
});
test('current report CSV preserves currencies and does not fabricate unavailable metrics', () => {
  const result = reportCsv(
    { ...snapshot, contacts: { status: 'error', message: 'Unavailable' } },
    [],
    'all lead dates',
  );
  expect(result).toContain('"USD","0.3"');
  expect(result).toContain('"EUR","2.5"');
  expect(result).toContain('"contacts","unavailable"');
  expect(result).not.toContain('revenue');
});
test('empty report renders zero counts, unavailable ratios and clear metric definitions', () => {
  const html = renderToStaticMarkup(<ReportsContent data={snapshot} />);
  expect(html).toContain('0 leads');
  expect(html).toContain('no leads');
  expect(html).toContain('does not measure opportunity conversion');
  expect(html).toContain('recognized revenue');
});
test('loading/error/partial states distinguish failures from empty data', () => {
  expect(
    renderToStaticMarkup(
      <LoadBoundary state={{ status: 'loading' }}>{() => null}</LoadBoundary>,
    ),
  ).toContain('Loading authorized');
  expect(
    renderToStaticMarkup(
      <Source data={{ status: 'error', message: 'API unavailable' }}>
        {() => <p>0</p>}
      </Source>,
    ),
  ).toContain('API unavailable');
});
test('snapshot uses existing pipeline aggregate and preserves independent failures', async () => {
  const fetcher = vi.fn<typeof fetch>(async (input) =>
    String(input).endsWith('/pipeline')
      ? response(stagesToObject())
      : String(input).endsWith('/leads')
        ? response({}, 500)
        : response([]),
  );
  const result = await loadSnapshot('', fetcher, new AbortController().signal);
  expect(result.leads.status).toBe('error');
  expect(result.contacts).toEqual({ status: 'ready', value: 0 });
  expect(result.pipeline.status).toBe('ready');
  expect(
    fetcher.mock.calls.some(([input]) =>
      String(input).endsWith('/opportunities'),
    ),
  ).toBe(false);
});
test('bounded financial response retains precision and rejects oversized bodies', async () => {
  const signal = new AbortController().signal;
  expect(
    await exactRequest(
      '',
      '/pipeline',
      async () =>
        new Response('{"amount":999999999999999.1234}', {
          headers: { 'Content-Type': 'application/json' },
        }),
      signal,
    ),
  ).toEqual({ amount: '999999999999999.1234' });
  await expect(
    exactRequest(
      '',
      '/pipeline',
      async () =>
        new Response(' '.repeat(10000001), {
          headers: { 'Content-Type': 'application/json' },
        }),
      signal,
    ),
  ).rejects.toThrow('too large');
});
test('store coalesces consumers and reuses a fresh snapshot', async () => {
  const load = vi.fn(async () => 42);
  const store = new ScopedStore(load, () => true);
  const a = store.acquire(),
    b = store.acquire();
  await vi.waitFor(() =>
    expect(store.getSnapshot()).toEqual({ status: 'ready', data: 42 }),
  );
  a();
  b();
  await Promise.resolve();
  const c = store.acquire();
  expect(load).toHaveBeenCalledTimes(1);
  c();
});
test('store aborts on final unmount and rejects stale results, including account switches', async () => {
  let active = true;
  let resolve!: (n: number) => void;
  const load = vi.fn((signal: AbortSignal) => {
    expect(signal.aborted).toBe(false);
    return new Promise<number>((done) => {
      resolve = done;
    });
  });
  const store = new ScopedStore(load, () => active);
  const release = store.acquire();
  active = false;
  release();
  await Promise.resolve();
  resolve(5);
  await Promise.resolve();
  expect(store.getSnapshot().status).toBe('loading');
});
test('a later refresh wins over an earlier response', async () => {
  const resolvers: ((n: number) => void)[] = [];
  const store = new ScopedStore(
    () => new Promise<number>((done) => resolvers.push(done)),
    () => true,
  );
  const old = store.refresh(),
    latest = store.refresh();
  resolvers[1](2);
  await latest;
  resolvers[0](1);
  await old;
  expect(store.getSnapshot()).toEqual({ status: 'ready', data: 2 });
});
test('role and terminal-stage restrictions mirror existing CRM transitions', () => {
  expect(canChangeStage('VIEWER', 'QUALIFICATION', 'NEEDS_ANALYSIS')).toBe(
    false,
  );
  expect(canChangeStage('ADMIN', 'QUALIFICATION', 'CLOSED_WON')).toBe(false);
  expect(canChangeStage('SALES_USER', 'QUALIFICATION', 'NEEDS_ANALYSIS')).toBe(
    true,
  );
  expect(canChangeStage('OWNER', 'CLOSED_WON', 'QUALIFICATION')).toBe(false);
});
async function application(role: 'ADMIN' | 'VIEWER' = 'ADMIN') {
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
        id: other,
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
  return {
    app,
    change: (value: CrmContext) => {
      context = value;
    },
    context,
  };
}
test('account/tenant generations and membership identity control scoped cache access', async () => {
  const { context } = await application();
  expect(sameContext(context, context)).toBe(true);
  expect(sameContext(context, { ...context, sessionEpoch: 99 })).toBe(false);
  expect(
    sameContext(context, {
      ...context,
      tenant: {
        status: 'ready',
        organization: {
          id,
          memberUserId: id,
          source: 'backend-membership',
          generation: 2,
        },
      },
    }),
  ).toBe(false);
});
test('viewer stage actions never reach the network', async () => {
  const { app } = await application('VIEWER');
  const fetcher = vi.fn<typeof fetch>();
  const runtime = createIntelligenceRuntime(app, fetcher);
  await expect(runtime.changeStage(row, 'NEEDS_ANALYSIS')).rejects.toThrow(
    'not permitted',
  );
  expect(fetcher).not.toHaveBeenCalled();
});
test('stage writes use existing CSRF adapter and confirmed server response', async () => {
  const { app } = await application();
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    const path = String(input);
    if (path.endsWith('/csrf'))
      return response({ headerName: 'X-CSRF-TOKEN', token: 'fixture' });
    if (init?.method === 'PATCH')
      return response({ ...row, stage: 'NEEDS_ANALYSIS' });
    if (path.endsWith('/pipeline')) return response(stagesToObject());
    if (path.endsWith('/opportunities'))
      return response([{ ...row, stage: 'NEEDS_ANALYSIS' }]);
    return response([]);
  });
  const runtime = createIntelligenceRuntime(app, fetcher);
  await runtime.changeStage(row, 'NEEDS_ANALYSIS');
  const write = fetcher.mock.calls.find(([, init]) => init?.method === 'PATCH');
  expect(write?.[0]).toBe(`/api/opportunities/${id}/stage`);
  expect(new Headers(write?.[1]?.headers).get('X-CSRF-TOKEN')).toBe('fixture');
  expect(new Headers(write?.[1]?.headers).get('X-Organization-ID')).toBe(other);
  expect(runtime.opportunities.getSnapshot().status).toBe('ready');
});
test('unconfirmed stage response and API failure cannot change displayed cached records', async () => {
  const { app } = await application();
  const runtime = createIntelligenceRuntime(app, async (input) =>
    String(input).endsWith('/csrf')
      ? response({ headerName: 'X-CSRF-TOKEN', token: 'fixture' })
      : response({ ...row, stage: 'QUALIFICATION' }),
  );
  await expect(runtime.changeStage(row, 'NEEDS_ANALYSIS')).rejects.toThrow(
    'did not confirm',
  );
  expect(runtime.opportunities.getSnapshot().status).toBe('loading');
});
test('the registered executive dashboard renders validated data and honest empty states', async () => {
  const { app } = await application();
  vi.stubGlobal('fetch', async (input: RequestInfo | URL) =>
    String(input).endsWith('/pipeline')
      ? response(stagesToObject())
      : response([]),
  );
  try {
    await intelligenceRuntime(app).snapshot.refresh();
    const html = renderToStaticMarkup(
      <ApplicationContext value={app}>
        <DashboardPage />
      </ApplicationContext>,
    );
    expect(html).toContain('Executive sales command center');
    expect(html).toContain('USD 0.3');
    expect(html).toContain('EUR 2.5');
    expect(html).toContain('No recent activities');
    expect(html).toContain(
      'true lead-to-opportunity conversion are unavailable',
    );
  } finally {
    vi.unstubAllGlobals();
  }
});
test('store exposes network failure instead of a fabricated zero snapshot', async () => {
  const store = new ScopedStore(
    async () => {
      throw new Error('API unavailable');
    },
    () => true,
  );
  await store.refresh();
  expect(store.getSnapshot()).toEqual({
    status: 'error',
    message: 'API unavailable',
  });
});
test('server rejection of a stage change preserves state and no optimistic update is published', async () => {
  const { app } = await application();
  const runtime = createIntelligenceRuntime(app, async (input) =>
    String(input).endsWith('/csrf')
      ? response({ headerName: 'X-CSRF-TOKEN', token: 'fixture' })
      : response({ detail: 'Stage transition is not allowed' }, 400),
  );
  await expect(runtime.changeStage(row, 'NEEDS_ANALYSIS')).rejects.toThrow(
    'not allowed',
  );
  expect(runtime.opportunities.getSnapshot()).toEqual({ status: 'loading' });
});
