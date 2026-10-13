import { leadStatuses, opportunityStages } from '@wautech/umer/contracts';
import type { LeadStatus, OpportunityStage } from '@wautech/umer/contracts';
import { decimal, parseExactJson, validCurrency, addDecimals } from './money';
export const MAX_RECORDS = 5000;
export interface LeadRow {
  id: string;
  status: LeadStatus;
  createdAt: string;
}
export interface TaskRow {
  id: string;
  title: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  overdue: boolean;
}
export interface ActivityRow {
  id: string;
  subject: string;
  occurredAt: string;
}
export interface OpportunityRow {
  id: string;
  name: string;
  stage: OpportunityStage;
  amount: unknown;
  currency: unknown;
  companyId: string;
  createdAt: string;
}
export interface StageSummary {
  stage: OpportunityStage;
  count: number;
  totals: Record<string, string>;
}
export type Dataset<T> =
  { status: 'ready'; value: T } | { status: 'error'; message: string };
export interface Snapshot {
  asOf: string;
  companies: Dataset<number>;
  contacts: Dataset<number>;
  leads: Dataset<LeadRow[]>;
  pipeline: Dataset<StageSummary[]>;
  tasks: Dataset<TaskRow[]>;
  activities: Dataset<ActivityRow[]>;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Unexpected service response.');
  return value as Record<string, unknown>;
}
function id(value: unknown) {
  if (typeof value !== 'string' || !uuid.test(value))
    throw new Error('Invalid record identifier.');
  return value;
}
function text(value: unknown) {
  if (typeof value !== 'string') throw new Error('Invalid record text.');
  return value;
}
function timestamp(value: unknown) {
  const result = text(value);
  if (!/T/.test(result) || !Number.isFinite(Date.parse(result)))
    throw new Error('Invalid record timestamp.');
  return result;
}
export function records(value: unknown) {
  if (!Array.isArray(value)) throw new Error('Expected a record list.');
  if (value.length > MAX_RECORDS)
    throw new Error(
      'The unpaged response exceeds 5,000 records. A paged or aggregate backend endpoint is required; no partial total is shown.',
    );
  const rows = value.map(object);
  const ids = rows.map((row) => id(row.id));
  if (new Set(ids).size !== ids.length)
    throw new Error('Duplicate record identifiers.');
  return rows;
}
export function parseLeads(value: unknown): LeadRow[] {
  return records(value).map((row) => {
    if (!leadStatuses.includes(row.status as LeadStatus))
      throw new Error('Unknown lead status.');
    return {
      id: id(row.id),
      status: row.status as LeadStatus,
      createdAt: timestamp(row.createdAt),
    };
  });
}
export function parseTasks(value: unknown): TaskRow[] {
  return records(value).map((row) => {
    if (
      !['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(
        String(row.status),
      ) ||
      typeof row.overdue !== 'boolean'
    )
      throw new Error('Invalid task status.');
    return {
      id: id(row.id),
      title: text(row.title),
      status: row.status as TaskRow['status'],
      overdue: row.overdue,
    };
  });
}
export function parseActivities(value: unknown): ActivityRow[] {
  return records(value)
    .map((row) => ({
      id: id(row.id),
      subject: text(row.subject),
      occurredAt: timestamp(row.occurredAt),
    }))
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
}
export function parseOpportunities(value: unknown): OpportunityRow[] {
  return records(value).map((row) => {
    if (!opportunityStages.includes(row.stage as OpportunityStage))
      throw new Error('Unknown opportunity stage.');
    return {
      id: id(row.id),
      name: text(row.name),
      stage: row.stage as OpportunityStage,
      amount: row.amount,
      currency: row.currency,
      companyId: id(row.companyId),
      createdAt: timestamp(row.createdAt),
    };
  });
}
export function parsePipeline(value: unknown): StageSummary[] {
  const stages = object(value).stages;
  if (!Array.isArray(stages) || stages.length !== opportunityStages.length)
    throw new Error('Incomplete pipeline aggregate.');
  const result = stages.map((value) => {
    const row = object(value);
    const count = Number(row.opportunityCount);
    if (
      !opportunityStages.includes(row.stage as OpportunityStage) ||
      !Number.isSafeInteger(count) ||
      count < 0 ||
      !/^\d+$/.test(String(row.opportunityCount))
    )
      throw new Error('Invalid pipeline aggregate.');
    const totals: Record<string, string> = {};
    for (const [currency, value] of Object.entries(
      object(row.totalsByCurrency),
    )) {
      const amount = decimal(value);
      if (!validCurrency(currency) || amount === null)
        throw new Error(
          'Invalid aggregate money; financial totals are unavailable.',
        );
      totals[currency] = amount;
    }
    return { stage: row.stage as OpportunityStage, count, totals };
  });
  if (
    new Set(result.map((stage) => stage.stage)).size !==
    opportunityStages.length
  )
    throw new Error('Duplicate pipeline stage.');
  if (
    !Number.isSafeInteger(result.reduce((sum, stage) => sum + stage.count, 0))
  )
    throw new Error('Opportunity count exceeds supported precision.');
  return opportunityStages.map((stage) =>
    result.find((row) => row.stage === stage)!,
  );
}
export async function exactRequest(
  baseUrl: string,
  path: string,
  transport: typeof fetch,
  signal: AbortSignal,
) {
  const response = await transport(`${baseUrl}/api${path}`, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok)
    throw new Error(
      response.status === 403
        ? 'Permission denied by the server.'
        : response.status === 401
          ? 'Your session expired.'
          : 'The service is unavailable. Retry to refresh this dataset.',
    );
  if (!response.headers.get('content-type')?.includes('json'))
    throw new Error('Unexpected service response.');
  if (!response.body) throw new Error('Empty service response.');
  const reader = response.body.getReader(),
    decoder = new TextDecoder();
  let source = '',
    bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (signal.aborted || bytes > 10_000_000) {
        await reader.cancel();
        if (signal.aborted)
          throw new DOMException('Request cancelled', 'AbortError');
        throw new Error('Response too large. Backend pagination is required.');
      }
      source += decoder.decode(chunk.value, { stream: true });
    }
    source += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  if (signal.aborted) throw new DOMException('Request cancelled', 'AbortError');
  if (source.length > 10_000_000)
    throw new Error('Response too large. Backend pagination is required.');
  return parseExactJson(source);
}
export async function loadSnapshot(
  baseUrl: string,
  transport: typeof fetch,
  signal: AbortSignal,
): Promise<Snapshot> {
  const paths = [
    '/companies',
    '/contacts',
    '/leads',
    '/pipeline',
    '/tasks',
    '/activities',
  ];
  const parsers: ((value: unknown) => unknown)[] = [
    (value) => records(value).length,
    (value) => records(value).length,
    parseLeads,
    parsePipeline,
    parseTasks,
    parseActivities,
  ];
  const results = await Promise.allSettled(
    paths.map(async (path, index) =>
      parsers[index](await exactRequest(baseUrl, path, transport, signal)),
    ),
  );
  if (signal.aborted) throw new DOMException('Request cancelled', 'AbortError');
  const dataset = <T>(index: number): Dataset<T> => {
    const result = results[index];
    return result.status === 'fulfilled'
      ? { status: 'ready', value: result.value as T }
      : {
          status: 'error',
          message:
            result.reason instanceof Error
              ? result.reason.message
              : 'Dataset unavailable.',
        };
  };
  return {
    asOf: new Date().toISOString(),
    companies: dataset(0),
    contacts: dataset(1),
    leads: dataset(2),
    pipeline: dataset(3),
    tasks: dataset(4),
    activities: dataset(5),
  };
}
export function filterLeads(rows: readonly LeadRow[], from = '', through = '') {
  const date = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const timestamp = Date.parse(value + 'T00:00:00Z');
    return (
      Number.isFinite(timestamp) &&
      new Date(timestamp).toISOString().slice(0, 10) === value
    );
  };
  if (
    (from && !date(from)) ||
    (through && !date(through)) ||
    (from && through && from > through)
  )
    throw new Error('Choose a valid lead creation date range.');
  return rows.filter(
    (row) =>
      (!from || new Date(row.createdAt).toISOString().slice(0, 10) >= from) &&
      (!through ||
        new Date(row.createdAt).toISOString().slice(0, 10) <= through),
  );
}
export function pipelineTotals(
  stages: readonly StageSummary[],
  openOnly = false,
) {
  const totals: Record<string, string> = {};
  for (const row of stages) {
    if (openOnly && row.stage.startsWith('CLOSED_')) continue;
    for (const [currency, amount] of Object.entries(row.totals))
      totals[currency] = addDecimals(totals[currency] ?? '0', amount);
  }
  return totals;
}
export function filterOpportunities(
  rows: readonly OpportunityRow[],
  search: string,
  stage: string,
  currency: string,
) {
  const query = search.trim().toLocaleLowerCase();
  return rows
    .filter(
      (row) =>
        (!query || row.name.toLocaleLowerCase().includes(query)) &&
        (!stage || row.stage === stage) &&
        (!currency || row.currency === currency),
    )
    .sort(
      (a, b) =>
        opportunityStages.indexOf(a.stage) -
          opportunityStages.indexOf(b.stage) ||
        a.name.localeCompare(b.name) ||
        a.id.localeCompare(b.id),
    );
}
