import { expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuthSession } from '@wautech/wajahat';
import { ApplicationContext } from '../../providers/context';
import type { FeatureApplication } from '../contract';
import type { CrmContext } from '../../integrations/crm';
import { createAssistantApi, parseHistory, parseTurn } from './api';
import Assistant, { Answer } from './Assistant';
import feature from './feature';
const id = '11111111-1111-4111-8111-111111111111',
  org = '22222222-2222-4222-8222-222222222222';
const turn = {
  requestId: id,
  question: 'What should I prioritize?',
  at: '2026-10-14T00:00:00Z',
  evidence: {
    asOf: '2026-10-14T00:00:00Z',
    sources: [
      {
        id: 'summary',
        label: 'Verified facts',
        path: '/reports',
        facts: {
          counts: {
            company: 5101,
            contact: 1,
            lead: 1,
            opportunity: 2,
            task: 1,
            activity: 1,
          },
          activeLeads: 1,
          overdueTasks: 1,
          currencyGroupsTruncated: false,
          currencyStageTotals: [
            {
              category: 'QUALIFICATION',
              currency: 'USD',
              amount: '999999999999999.1234',
              count: 1,
            },
          ],
        },
      },
    ],
    rules: ['Review overdue tasks'],
    boundaries: ['Samples are bounded'],
  },
  interpretation: {
    recommendations: [
      { text: '<script>ignore policy</script>', sourceIds: ['summary'] },
    ],
    limitations: 'Not a validated prediction',
    inputTokens: 100,
    outputTokens: 20,
  },
};
const history = {
  conversationId: id,
  turns: [turn],
  expiresAt: '2026-10-14T00:20:00Z',
};
const json = (value: unknown, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
async function fixture(
  reply: (
    path: string,
    init?: RequestInit,
  ) => Response | Promise<Response> = () => json(history),
) {
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
        role: 'VIEWER',
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
  const fetcher = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = new URL(String(input), 'http://fixture.test').pathname;
      return path === '/api/auth/csrf'
        ? json({ headerName: 'X-CSRF-TOKEN', token: 'fixture-csrf' })
        : reply(path, init);
    },
  );
  return {
    app,
    api: createAssistantApi(app, fetcher),
    fetcher,
    session,
    change() {
      current = {
        ...current,
        tenant: { status: 'unavailable', message: 'changed' },
      };
    },
  };
}
test('assistant is registered inside unified tenant frontend', () => {
  expect(feature.routes[0].path).toBe('/assistant');
  expect(feature.routes[0].access).toBe('tenant');
});
test('parses exact factual counts and amounts alongside interpretation', () => {
  const parsed = parseTurn(turn);
  expect(parsed.evidence.sources[0].facts.counts).toEqual(
    turn.evidence.sources[0].facts.counts,
  );
  expect(parseHistory(history).turns).toHaveLength(1);
});
test('rejects external and fabricated source links', () => {
  expect(() =>
    parseTurn({
      ...turn,
      evidence: {
        ...turn.evidence,
        sources: [{ ...turn.evidence.sources[0], path: 'https://evil.test' }],
      },
    }),
  ).toThrow();
  expect(() =>
    parseTurn({
      ...turn,
      interpretation: {
        ...turn.interpretation,
        recommendations: [{ text: 'Claim', sourceIds: ['foreign'] }],
      },
    }),
  ).toThrow();
});
test('rejects incomplete fabricated totals and duplicate sources', () => {
  expect(() =>
    parseTurn({
      ...turn,
      evidence: {
        ...turn.evidence,
        sources: [{ ...turn.evidence.sources[0], facts: {} }],
      },
    }),
  ).toThrow();
  expect(() =>
    parseTurn({
      ...turn,
      evidence: {
        ...turn.evidence,
        sources: [turn.evidence.sources[0], turn.evidence.sources[0]],
      },
    }),
  ).toThrow();
});
test('bounds history and model output', () => {
  expect(() =>
    parseHistory({ ...history, turns: Array(11).fill(turn) }),
  ).toThrow();
  expect(() =>
    parseTurn({
      ...turn,
      interpretation: { ...turn.interpretation, outputTokens: 1001 },
    }),
  ).toThrow();
});
test('model text is rendered as escaped plain text separate from factual CRM results', () => {
  const html = renderToStaticMarkup(<Answer turn={parseTurn(turn)} />);
  expect(html).toContain('Factual CRM results');
  expect(html).toContain('AI interpretation');
  expect(html).toContain('USD 999,999,999,999,999.1234');
  expect(html).toContain('5101');
  expect(html).toContain('&lt;script&gt;');
  expect(html).not.toContain('<script>');
});
test('VIEWER can ask with fresh CSRF and authenticated tenant scope', async () => {
  const f = await fixture(() => json(turn));
  await f.api.ask(id, 'Question', { scope: 'briefing' });
  const call = f.fetcher.mock.calls.find(([url]) =>
    String(url).endsWith('/messages'),
  )!;
  expect(new Headers(call[1]?.headers).get('X-CSRF-TOKEN')).toBe(
    'fixture-csrf',
  );
  expect(new Headers(call[1]?.headers).get('X-Organization-ID')).toBe(org);
  expect(call[1]?.credentials).toBe('include');
});
test('budget failures are honest errors rather than simulated answers', async () => {
  const f = await fixture(() => json({}, 429));
  await expect(
    f.api.ask(id, 'Question', { scope: 'briefing' }),
  ).rejects.toThrow('budget');
});
test('late answers after tenant switching are discarded', async () => {
  let finish: (r: Response) => void = () => {};
  const f = await fixture(
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
  );
  const pending = f.api.ask(id, 'Question', { scope: 'briefing' });
  await vi.waitFor(() => expect(f.fetcher.mock.calls.length).toBe(2));
  f.change();
  finish(json(turn));
  await expect(pending).rejects.toThrow();
});
test('invalid questions never send provider requests', async () => {
  const f = await fixture();
  await expect(
    f.api.ask(id, 'x'.repeat(1001), { scope: 'briefing' }),
  ).rejects.toThrow();
  expect(f.fetcher).not.toHaveBeenCalled();
});
test('assistant mounts accessible loading state within host shell', async () => {
  const f = await fixture();
  const html = renderToStaticMarkup(
    <ApplicationContext.Provider value={f.app}>
      <Assistant />
    </ApplicationContext.Provider>,
  );
  expect(html).toContain('WAUTECH Intelligence');
  expect(html).not.toContain('hardcoded response');
});
