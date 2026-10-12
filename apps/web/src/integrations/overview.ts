import type { DashboardData, Money } from '@wautech/asad';
import type { Company, Opportunity } from '@wautech/umer/contracts';
import { jsonRequest } from './http';
export interface TaskDto {
  id: string;
  title: string;
  description: string | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  dueAt: string | null;
  overdue: boolean;
}
interface ActivityDto {
  id: string;
  subject: string;
  occurredAt: string;
}
interface PipelineDto {
  stages: {
    stage: string;
    opportunityCount: number;
    totalsByCurrency: Record<string, number>;
  }[];
}
interface NotificationDto {
  id: string;
  title: string;
  message: string;
  readAt: string | null;
}
export const emptyOverview = (): DashboardData => ({
  provenance: {
    kind: 'unavailable',
    label: 'Waiting for authorized backend data',
  },
  metrics: [],
  performance: {
    currency: 'XXX',
    points: [],
    description:
      'Historical analytics unavailable: no verified history endpoint.',
  },
  pipeline: [],
  opportunities: [],
  tasks: [],
  priorities: [],
  activities: [],
  notifications: [],
});
export function money(amount: unknown, currency: unknown): Money | null {
  if (
    typeof amount !== 'number' ||
    !Number.isFinite(amount) ||
    amount < 0 ||
    amount > Number.MAX_SAFE_INTEGER ||
    typeof currency !== 'string' ||
    !/^[A-Z]{3}$/.test(currency)
  )
    return null;
  return { amount, currency };
}
function validData(index: number, value: unknown): boolean {
  const object = (item: unknown): item is Record<string, unknown> =>
    !!item && typeof item === 'object' && !Array.isArray(item);
  const id = (item: Record<string, unknown>) =>
    typeof item.id === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      item.id,
    );
  if (index < 6)
    return (
      Array.isArray(value) &&
      value.every(
        (item) =>
          object(item) &&
          id(item) &&
          (index === 0
            ? typeof item.name === 'string'
            : index === 3
              ? typeof item.name === 'string' &&
                typeof item.companyId === 'string' &&
                typeof item.stage === 'string'
              : index === 4
                ? typeof item.title === 'string' &&
                  ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(
                    String(item.status),
                  ) &&
                  typeof item.overdue === 'boolean'
                : index === 5
                  ? typeof item.subject === 'string' &&
                    typeof item.occurredAt === 'string' &&
                    Number.isFinite(Date.parse(item.occurredAt))
                  : typeof item.firstName === 'string' &&
                    typeof item.lastName === 'string'),
      )
    );
  if (!object(value)) return false;
  if (index === 6)
    return (
      Array.isArray(value.stages) &&
      value.stages.every(
        (item) =>
          object(item) &&
          typeof item.stage === 'string' &&
          Number.isSafeInteger(item.opportunityCount) &&
          Number(item.opportunityCount) >= 0 &&
          object(item.totalsByCurrency) &&
          Object.entries(item.totalsByCurrency).every(
            ([currency, amount]) => money(amount, currency) !== null,
          ),
      )
    );
  if (index === 7)
    return (
      Array.isArray(value.content) &&
      value.content.every(
        (item) =>
          object(item) &&
          id(item) &&
          typeof item.title === 'string' &&
          typeof item.message === 'string' &&
          (item.readAt === null || typeof item.readAt === 'string'),
      )
    );
  return Number.isSafeInteger(value.count) && Number(value.count) >= 0;
}
export async function loadOverview(
  baseUrl: string,
  transport: typeof fetch,
  signal: AbortSignal,
) {
  const paths = [
    '/companies',
    '/contacts',
    '/leads',
    '/opportunities',
    '/tasks',
    '/activities',
    '/pipeline',
    '/notifications',
    '/notifications/unread-count',
  ] as const;
  const results = await Promise.allSettled(
    paths.map((path) =>
      jsonRequest<unknown>(baseUrl, path, transport, { signal }),
    ),
  );
  if (signal.aborted) throw new DOMException('Context changed', 'AbortError');
  const data = emptyOverview();
  const failures: string[] = [];
  const read = <T>(index: number, array = true): T | undefined => {
    const result = results[index];
    if (
      result.status === 'rejected' ||
      (array && !Array.isArray(result.value)) ||
      !validData(index, result.value)
    ) {
      failures.push(paths[index]);
      return;
    }
    return result.value as T;
  };
  const companies = read<Company[]>(0),
    contacts = read<unknown[]>(1),
    leads = read<unknown[]>(2),
    opportunities = read<Opportunity[]>(3);
  const tasks = read<TaskDto[]>(4),
    activities = read<ActivityDto[]>(5),
    pipeline = read<PipelineDto>(6, false);
  const notifications = read<{ content: NotificationDto[] }>(7, false),
    count = read<{ count: number }>(8, false);
  data.metrics = [companies, contacts, leads, opportunities].flatMap(
    (rows, index) =>
      rows
        ? [
            {
              id: paths[index],
              label: [
                'Active companies',
                'Active contacts',
                'Active leads',
                'Active opportunities',
              ][index],
              value: String(rows.length),
              detail: 'Current authorized active records',
              icon: ['Companies', 'Contacts', 'Leads', 'Opportunities'][index],
            },
          ]
        : [],
  );
  data.opportunities =
    opportunities?.map((item) => ({
      id: item.id,
      name: item.name,
      company:
        companies?.find((c) => c.id === item.companyId)?.name ||
        'Company unavailable',
      initials: '—',
      owner: 'Owner unavailable',
      stage: item.stage,
      value: money(item.amount, item.currency),
    })) || [];
  data.pipeline = Array.isArray(pipeline?.stages)
    ? pipeline.stages.map((item) => ({
        id: item.stage,
        stage: item.stage,
        count: item.opportunityCount,
        totals: Object.entries(item.totalsByCurrency || {}).flatMap(
          ([currency, amount]) => {
            const value = money(amount, currency);
            return value ? [value] : [];
          },
        ),
      }))
    : [];
  data.tasks =
    tasks?.map((item) => ({
      id: item.id,
      title: item.title,
      detail: `${item.status}${item.dueAt ? ' · Due ' + new Date(item.dueAt).toLocaleDateString() : ''}`,
      initials: '—',
      completed: item.status === 'COMPLETED',
    })) || [];
  data.activities =
    activities?.map((item) => ({
      id: item.id,
      text: item.subject,
      timeLabel: new Date(item.occurredAt).toLocaleString(),
    })) || [];
  data.notifications = Array.isArray(notifications?.content)
    ? notifications.content.map((item) => ({
        id: item.id,
        title: item.title,
        detail: item.message,
        read: item.readAt !== null,
      }))
    : [];
  if (Number.isSafeInteger(count?.count) && count!.count >= 0)
    data.unreadNotificationCount = count!.count;
  data.priorities =
    tasks
      ?.filter((item) => item.overdue)
      .map((item) => ({
        id: item.id,
        title: item.title,
        description: 'Overdue task reported by the backend',
        icon: 'Tasks',
        target: 'Tasks' as const,
      })) || [];
  if (results.some((r) => r.status === 'fulfilled'))
    data.provenance = {
      kind: 'verified',
      label: 'Current authorized snapshot; historical analytics unavailable',
      asOf: new Date().toISOString(),
    };
  return { data, failures };
}
