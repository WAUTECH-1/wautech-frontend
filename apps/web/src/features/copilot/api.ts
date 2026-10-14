import type { FeatureApplication } from '../contract';
import { createWorkflowApi } from '../workflows/api';
import { object } from '../operations/api';
import { uuid } from '../workflows/contracts';
import { decimal, validCurrency } from '../intelligence/money';
import {
  sessionTransport,
  organizationTransport,
} from '../../integrations/http';

export type Scope =
  | 'briefing'
  | 'leads'
  | 'opportunities'
  | 'tasks'
  | 'activities'
  | 'record'
  | 'advisor';
export interface Selection {
  scope: Scope;
  stage?: string;
  resource?: string;
  recordId?: string;
  shareBusinessContext?: boolean;
}
export interface Source {
  id: string;
  label: string;
  path: `/${string}`;
  facts: Record<string, unknown>;
}
export interface Turn {
  requestId: string;
  question: string;
  at: string;
  evidence: {
    asOf: string;
    sources: Source[];
    rules: string[];
    boundaries: string[];
  };
  interpretation: {
    recommendations: { text: string; sourceIds: string[] }[];
    limitations: string;
    inputTokens: number;
    outputTokens: number;
  };
}
export interface History {
  conversationId: string;
  turns: Turn[];
  expiresAt: string;
}
export interface Status {
  available: boolean;
  reason: string;
  provider: string;
  model: string;
  retention: string;
}
function string(value: unknown, max = 2000): string {
  if (typeof value !== 'string' || value.length > max)
    throw Error('Invalid assistant response.');
  return value;
}
function strings(value: unknown, max = 10): string[] {
  if (!Array.isArray(value) || value.length > max)
    throw Error('Invalid assistant list.');
  return value.map((v) => string(v));
}
export function parseTurn(value: unknown): Turn {
  const t = object(value),
    e = object(t.evidence),
    r = object(t.interpretation);
  if (
    !uuid(string(t.requestId)) ||
    !Number.isFinite(Date.parse(string(t.at))) ||
    !Number.isFinite(Date.parse(string(e.asOf))) ||
    !Array.isArray(e.sources) ||
    e.sources.length < 1 ||
    e.sources.length > 21
  )
    throw Error('Invalid assistant evidence.');
  const sources = e.sources.map((v) => {
    const s = object(v),
      id = string(s.id),
      path = string(s.path);
    const match =
      /^(leads|opportunities|tasks|activities):([a-f0-9-]{36})$/i.exec(id);
    if (
      id === 'business-context'
        ? path !== '/business-profile'
        : id === 'summary'
          ? path !== '/reports'
          : !match || !uuid(match[2]) || path !== `/${match[1]}/${match[2]}`
    )
      throw Error('Invalid CRM reference.');
    return {
      id,
      label: string(s.label, 100),
      path: path as `/${string}`,
      facts: object(s.facts),
    };
  });
  if (new Set(sources.map((s) => s.id)).size !== sources.length)
    throw Error('Duplicate evidence.');
  const summary = sources.find((s) => s.id === 'summary');
  if (!summary) throw Error('Verified summary is missing.');
  const counts = object(summary.facts.counts);
  for (const key of [
    'company',
    'contact',
    'lead',
    'opportunity',
    'task',
    'activity',
  ])
    if (!Number.isSafeInteger(counts[key]) || Number(counts[key]) < 0)
      throw Error('Invalid factual totals.');
  for (const key of ['activeLeads', 'overdueTasks'])
    if (
      !Number.isSafeInteger(summary.facts[key]) ||
      Number(summary.facts[key]) < 0
    )
      throw Error('Invalid factual summary.');
  if (
    !Array.isArray(summary.facts.currencyStageTotals) ||
    summary.facts.currencyStageTotals.length > 40 ||
    typeof summary.facts.currencyGroupsTruncated !== 'boolean'
  )
    throw Error('Invalid pipeline facts.');
  for (const value of summary.facts.currencyStageTotals) {
    const row = object(value);
    if (
      typeof row.amount !== 'string' ||
      decimal(row.amount) === null ||
      !validCurrency(row.currency) ||
      typeof row.category !== 'string' ||
      !Number.isSafeInteger(row.count) ||
      Number(row.count) < 0
    )
      throw Error('Invalid currency aggregate.');
  }
  if (!Array.isArray(r.recommendations) || r.recommendations.length > 6)
    throw Error('Invalid recommendations.');
  const recommendations = r.recommendations.map((v) => {
    const rec = object(v),
      sourceIds = strings(rec.sourceIds, 8);
    if (
      !sourceIds.length ||
      sourceIds.some((id) => !sources.some((s) => s.id === id))
    )
      throw Error('Unverified recommendation source.');
    return { text: string(rec.text, 1000), sourceIds };
  });
  for (const [key, max] of [
    ['inputTokens', 26000],
    ['outputTokens', 1000],
  ] as const)
    if (
      !Number.isSafeInteger(r[key]) ||
      Number(r[key]) < 0 ||
      Number(r[key]) > max
    )
      throw Error('Invalid usage.');
  return {
    requestId: string(t.requestId),
    question: string(t.question, 1000),
    at: string(t.at),
    evidence: {
      asOf: string(e.asOf),
      sources,
      rules: strings(e.rules),
      boundaries: strings(e.boundaries),
    },
    interpretation: {
      recommendations,
      limitations: string(r.limitations, 1500),
      inputTokens: Number(r.inputTokens),
      outputTokens: Number(r.outputTokens),
    },
  };
}
export function parseHistory(value: unknown): History {
  const h = object(value);
  if (
    !uuid(string(h.conversationId)) ||
    !Array.isArray(h.turns) ||
    h.turns.length > 10 ||
    !Number.isFinite(Date.parse(string(h.expiresAt)))
  )
    throw Error('Invalid conversation.');
  return {
    conversationId: string(h.conversationId),
    expiresAt: string(h.expiresAt),
    turns: h.turns.map(parseTurn),
  };
}
export function referencePath(source: Source): `/${string}` {
  const match =
    /^(leads|opportunities|tasks|activities):([a-f0-9-]{36})$/i.exec(source.id);
  return match
    ? `/record-context?resource=${match[1]}&id=${match[2]}`
    : source.path;
}
export function createAssistantApi(
  app: FeatureApplication,
  fetcher: typeof fetch = fetch,
) {
  const scope = createWorkflowApi(app, fetcher),
    controller = new AbortController();
  const context = app.current();
  if (context.tenant.status !== 'ready')
    throw Error('Select a verified organization.');
  const transport = organizationTransport(
    sessionTransport(app.session, scope.active, fetcher, 45000),
    context.tenant.organization.id,
    controller.signal,
  );
  async function request(path: string, method = 'GET', body?: unknown) {
    let headers: Record<string, string> = { Accept: 'application/json' };
    if (method !== 'GET') {
      const token = object(await scope.read('/auth/csrf'));
      if (
        token.headerName !== 'X-CSRF-TOKEN' ||
        typeof token.token !== 'string' ||
        !token.token ||
        /[\r\n]/.test(token.token)
      )
        throw Error('Request security unavailable.');
      headers = {
        ...headers,
        'X-CSRF-TOKEN': token.token,
        'Content-Type': 'application/json',
      };
    }
    const response = await transport(
      app.config.baseUrl + '/api/intelligence' + path,
      {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      },
    );
    if (!response.ok)
      throw Error(
        response.status === 429
          ? 'AI request or token budget reached. Wait for the UTC rate window to reset.'
          : response.status === 409
            ? 'Conversation changed or another response is in progress. Refresh history before retrying.'
            : response.status === 403
              ? 'Your organization membership does not permit this request.'
              : response.status === 503
                ? 'AI is unavailable. Check provider setup or retry later. No CRM changes were made.'
                : response.status === 400
                  ? 'Check your question, context and record ID.'
                  : 'Assistant request failed. Refresh history before retrying.',
      );
    if (
      response.status === 204 ||
      response.headers.get('content-length') === '0'
    )
      return undefined;
    const bodyText = await response.text();
    if (bodyText.length > 350000 || !scope.active())
      throw Error('Conversation context changed.');
    return bodyText ? JSON.parse(bodyText) : undefined;
  }
  return {
    active: scope.active,
    dispose() {
      controller.abort();
      scope.dispose();
    },
    async status(): Promise<Status> {
      const s = object(await request('/status'));
      if (typeof s.available !== 'boolean')
        throw Error('Invalid assistant availability.');
      return {
        available: s.available,
        reason: string(s.reason),
        provider: string(s.provider),
        model: string(s.model),
        retention: string(s.retention),
      };
    },
    async history() {
      return parseHistory(await request('/conversation'));
    },
    async reset() {
      await request('/conversation/reset', 'POST');
      return parseHistory(await request('/conversation'));
    },
    async ask(conversationId: string, question: string, selection: Selection) {
      if (!uuid(conversationId) || !question.trim() || question.length > 1000)
        throw Error('Enter a question up to 1,000 characters.');
      return parseTurn(
        await request('/messages', 'POST', {
          conversationId,
          question,
          selection,
        }),
      );
    },
  };
}
