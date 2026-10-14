import { decimal, addDecimals } from '../intelligence/money';
export interface Bucket {
  category: string;
  count: number;
  currency?: string | null;
  amount?: string | null;
  userId?: string | null;
  pipelineId?: string | null;
  stage?: string;
}
export interface Summary {
  asOf: string;
  counts: Record<string, number>;
  leadStatuses: Bucket[];
  opportunityStages: Bucket[];
  taskStatuses: Bucket[];
  overdueTasks: number;
  completedInPeriod: number;
  activityTypes: Bucket[];
  recentActivities: { id: string; subject: string; occurredAt: string }[];
  currencyTotals: Bucket[];
  pipelineStages: Bucket[];
  pipelineStagesTruncated: boolean;
  ownerPerformance: Bucket[];
  ownerPerformanceTruncated: boolean;
  assigneePerformance: Bucket[];
  assigneePerformanceTruncated: boolean;
}
export function parseSummary(value: unknown): Summary {
  if (!value || typeof value !== 'object')
    throw Error('Invalid report response.');
  const r = value as Summary;
  const count = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0;
  if (
    !r.asOf ||
    !Number.isFinite(Date.parse(r.asOf)) ||
    !r.counts ||
    !['company', 'contact', 'lead', 'opportunity', 'task', 'activity'].every(
      (k) => count(r.counts[k]),
    ) ||
    !count(r.overdueTasks) ||
    !count(r.completedInPeriod)
  )
    throw Error('Report totals could not be verified.');
  for (const field of [
    'leadStatuses',
    'opportunityStages',
    'taskStatuses',
    'activityTypes',
    'currencyTotals',
    'pipelineStages',
    'ownerPerformance',
    'assigneePerformance',
  ] as const) {
    if (
      !Array.isArray(r[field]) ||
      r[field].some(
        (b) =>
          typeof b.category !== 'string' ||
          !count(b.count) ||
          (b.currency != null &&
            (!/^[A-Z]{3}$/.test(b.currency) ||
              typeof b.amount !== 'string' ||
              !decimal(b.amount))),
      )
    )
      throw Error('Invalid report breakdown.');
  }
  for (const field of [
    'ownerPerformanceTruncated',
    'assigneePerformanceTruncated',
    'pipelineStagesTruncated',
  ] as const)
    if (typeof r[field] !== 'boolean')
      throw Error('Report completeness unavailable.');
  if (
    !Array.isArray(r.recentActivities) ||
    r.recentActivities.length > 10 ||
    r.recentActivities.some(
      (a) =>
        !uuid(a.id) ||
        typeof a.subject !== 'string' ||
        !Number.isFinite(Date.parse(a.occurredAt)),
    )
  )
    throw Error('Invalid recent activity response.');
  for (const [field, total] of [
    ['leadStatuses', 'lead'],
    ['opportunityStages', 'opportunity'],
    ['taskStatuses', 'task'],
    ['activityTypes', 'activity'],
  ] as const)
    if (r[field].reduce((n, b) => n + b.count, 0) !== r.counts[total])
      throw Error('Report counts do not reconcile.');
  return r;
}
export const uuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export function openValues(data: Summary) {
  const result: Record<string, string> = {};
  for (const b of data.currencyTotals)
    if (
      b.currency &&
      b.amount &&
      !['CLOSED_WON', 'CLOSED_LOST'].includes(b.category)
    )
      result[b.currency] = addDecimals(result[b.currency] || '0', b.amount);
  return result;
}
export function percentage(n: number, total: number) {
  return total ? ((100 * n) / total).toFixed(1) + '%' : 'Not applicable';
}
export function validateDates(from: string, through: string) {
  for (const value of [from, through])
    if (value) {
      const date = new Date(value + 'T00:00:00Z');
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value ||
        value < '1900-01-01' ||
        value > '9998-12-31'
      )
        throw Error('Enter valid UTC calendar dates between 1900 and 9998.');
    }
  if (from && through && from > through)
    throw Error('From date must precede through date.');
}
