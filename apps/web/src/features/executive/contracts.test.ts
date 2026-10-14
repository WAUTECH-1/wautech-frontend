import { expect, test, vi } from 'vitest';
import {
  parseSummary,
  openValues,
  percentage,
  validateDates,
} from './contracts';
import { loadAggregateOverview } from '../../integrations/aggregate-overview';
const fixture = () => ({
  asOf: '2026-10-14T00:00:00Z',
  counts: {
    company: 5101,
    contact: 0,
    lead: 2,
    opportunity: 2,
    task: 0,
    activity: 0,
  },
  leadStatuses: [
    { category: 'NEW', count: 1 },
    { category: 'QUALIFIED', count: 1 },
  ],
  opportunityStages: [{ category: 'QUALIFICATION', count: 2 }],
  taskStatuses: [],
  overdueTasks: 0,
  completedInPeriod: 0,
  activityTypes: [],
  recentActivities: [],
  currencyTotals: [
    {
      category: 'QUALIFICATION',
      count: 1,
      currency: 'USD',
      amount: '999999999999999.1234',
    },
    { category: 'QUALIFICATION', count: 1, currency: 'EUR', amount: '0.1000' },
  ],
  pipelineStages: [],
  pipelineStagesTruncated: false,
  ownerPerformance: [],
  ownerPerformanceTruncated: false,
  assigneePerformance: [],
  assigneePerformanceTruncated: false,
});
test('UTC dates reject invalid leap days and reversed ranges', () => {
  expect(() => validateDates('2026-02-29', '')).toThrow('calendar');
  expect(() => validateDates('2026-02-01', '2026-01-31')).toThrow('precede');
});
test('UTC dates allow leap years and open-ended cohorts', () => {
  expect(() => validateDates('2024-02-29', '')).not.toThrow();
  expect(() => validateDates('', '2026-01-31')).not.toThrow();
});
test('aggregate counts over 5,000 do not require materialized collections', () =>
  expect(parseSummary(fixture()).counts.company).toBe(5101));
test('exact currency values remain separated and exclude closed stages', () => {
  const s = fixture();
  s.currencyTotals.push({
    category: 'CLOSED_WON',
    count: 1,
    currency: 'USD',
    amount: '100',
  });
  expect(openValues(parseSummary({ ...s }))).toEqual({
    USD: '999999999999999.1234',
    EUR: '0.1',
  });
});
test('statuses must reconcile with organization totals', () =>
  expect(() =>
    parseSummary({ ...fixture(), counts: { ...fixture().counts, lead: 3 } }),
  ).toThrow('reconcile'));
test('unsafe or missing aggregate counts fail closed', () => {
  expect(() => parseSummary({ ...fixture(), overdueTasks: -1 })).toThrow();
  expect(() =>
    parseSummary({ ...fixture(), counts: { company: Infinity } }),
  ).toThrow();
});
test('money and completeness metadata are validated', () => {
  expect(() =>
    parseSummary({
      ...fixture(),
      currencyTotals: [
        { category: 'OPEN', count: 1, currency: 'USD', amount: 0.1 },
      ],
    }),
  ).toThrow();
  expect(() =>
    parseSummary({ ...fixture(), ownerPerformanceTruncated: undefined }),
  ).toThrow();
});
test('zero-denominator shares are not fabricated conversion rates', () => {
  expect(percentage(0, 0)).toBe('Not applicable');
  expect(percentage(1, 2)).toBe('50.0%');
});
test('shell loads aggregates and bounded personal notification page only', async () => {
  const transport = vi.fn<typeof fetch>(
    async (input) =>
      new Response(
        JSON.stringify(
          String(input).includes('unread-count')
            ? { count: 41 }
            : String(input).includes('notifications')
              ? { content: [] }
              : fixture(),
        ),
        { headers: { 'Content-Type': 'application/json' } },
      ),
  );
  const result = await loadAggregateOverview(
    '',
    transport,
    new AbortController().signal,
  );
  expect(transport.mock.calls.map((c) => String(c[0]))).toEqual([
    '/api/reports/summary',
    '/api/notifications?page=0&size=20',
    '/api/notifications/unread-count',
  ]);
  expect(result.data.metrics[0].value).toBe('5101');
  expect(result.data.unreadNotificationCount).toBe(41);
});
test('failed aggregate never falls back to partial lists or zero totals', async () => {
  const result = await loadAggregateOverview(
    '',
    async () => new Response('{}', { status: 503 }),
    new AbortController().signal,
  );
  expect(result.data.metrics).toEqual([]);
  expect(result.failures).toHaveLength(3);
});
