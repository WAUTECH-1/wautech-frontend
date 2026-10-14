import { jsonRequest } from './http';
import { emptyOverview } from './overview';
import { parseSummary } from '../features/executive/contracts';
export async function loadAggregateOverview(
  base: string,
  transport: typeof fetch,
  signal: AbortSignal,
) {
  const data = emptyOverview(),
    failures: string[] = [];
  const paths = [
    '/reports/summary',
    '/notifications?page=0&size=20',
    '/notifications/unread-count',
  ];
  const values = await Promise.allSettled(
    paths.map((path) =>
      jsonRequest<unknown>(base, path, transport, { signal }),
    ),
  );
  if (signal.aborted) throw new DOMException('Context changed', 'AbortError');
  if (values[0].status === 'fulfilled')
    try {
      const s = parseSummary(values[0].value);
      data.metrics = ['company', 'contact', 'lead', 'opportunity'].map(
        (key, i) => ({
          id: key,
          label: ['Companies', 'Contacts', 'Leads', 'Opportunities'][i],
          value: String(s.counts[key]),
          icon: key,
          detail: 'Complete current authorized count',
        }),
      );
      data.provenance = {
        kind: 'verified',
        label: 'Current database aggregates; historical analytics unavailable',
        asOf: s.asOf,
      };
    } catch {
      failures.push(paths[0]);
    }
  else failures.push(paths[0]);
  if (values[1].status === 'fulfilled')
    try {
      const r = values[1].value as {
        content: {
          id: string;
          title: string;
          message: string;
          readAt: string | null;
        }[];
      };
      if (
        !Array.isArray(r.content) ||
        r.content.length > 20 ||
        r.content.some(
          (n) =>
            typeof n.id !== 'string' ||
            typeof n.title !== 'string' ||
            typeof n.message !== 'string' ||
            !(n.readAt === null || typeof n.readAt === 'string'),
        )
      )
        throw Error('Invalid notifications');
      data.notifications = r.content.map((n) => ({
        id: n.id,
        title: n.title,
        detail: n.message,
        read: n.readAt !== null,
      }));
    } catch {
      failures.push(paths[1]);
    }
  else failures.push(paths[1]);
  if (values[2].status === 'fulfilled') {
    const n = (values[2].value as { count: number }).count;
    if (Number.isSafeInteger(n) && n >= 0) data.unreadNotificationCount = n;
    else failures.push('/notifications');
  } else failures.push('/notifications');
  return { data, failures };
}
