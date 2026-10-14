import type { FeatureApplication } from '../contract';
import { recordsChanged } from '../../integrations/refresh';
import {
  jsonRequest,
  sessionTransport,
  organizationTransport,
} from '../../integrations/http';
import {
  activityTypes,
  priorities,
  taskStatuses,
  relationshipFields,
  uuid,
  validateInput,
  queryString,
  canWrite,
  transitions,
} from './contracts';
import type {
  Kind,
  WorkRecord,
  Input,
  Filters,
  Status,
  Notification,
  NotificationPage,
  Relationship,
} from './contracts';
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Unexpected workflow response.');
  return value as Record<string, unknown>;
}
const text = (value: unknown) => {
  if (typeof value !== 'string') throw new Error('Invalid workflow text.');
  return value;
};
const id = (value: unknown) => {
  const result = text(value);
  if (!uuid(result)) throw new Error('Invalid record ID.');
  return result;
};
const date = (value: unknown) => {
  const result = text(value);
  if (!Number.isFinite(Date.parse(result)))
    throw new Error('Invalid workflow timestamp.');
  return result;
};
const nullableDate = (value: unknown) => (value === null ? null : date(value));
export function parseRecord(kind: Kind, value: unknown): WorkRecord {
  const row = object(value);
  if (row.archived !== false)
    throw new Error('This workflow record is archived or unavailable.');
  const links = Object.fromEntries(
    relationshipFields.map((field) => [
      field,
      row[field] === null ? null : id(row[field]),
    ]),
  ) as WorkRecord['links'];
  if (!Object.values(links).some(Boolean))
    throw new Error('Workflow has no verified CRM association.');
  const common = {
    kind,
    id: id(row.id),
    label: text(kind === 'tasks' ? row.title : row.subject),
    description: row.description === null ? null : text(row.description),
    links,
    createdAt: date(row.createdAt),
    updatedAt: date(row.updatedAt),
  };
  if (kind === 'tasks') {
    if (
      !taskStatuses.includes(row.status as Status) ||
      !priorities.includes(row.priority as (typeof priorities)[number]) ||
      typeof row.overdue !== 'boolean'
    )
      throw new Error('Invalid task response.');
    return {
      ...common,
      task: {
        assigneeUserId:
          row.assigneeUserId === undefined || row.assigneeUserId === null
            ? null
            : id(row.assigneeUserId),
        status: row.status as Status,
        priority: row.priority as (typeof priorities)[number],
        dueAt: nullableDate(row.dueAt),
        completedAt: nullableDate(row.completedAt),
        overdue: row.overdue,
      },
    };
  }
  if (!activityTypes.includes(row.type as (typeof activityTypes)[number]))
    throw new Error('Invalid activity response.');
  return {
    ...common,
    activity: {
      type: row.type as (typeof activityTypes)[number],
      occurredAt: date(row.occurredAt),
    },
  };
}
export function parseNotification(value: unknown): Notification {
  const row = object(value);
  return {
    id: id(row.id),
    title: text(row.title),
    message: text(row.message),
    targetType: text(row.targetType),
    targetId: row.targetId === null ? null : id(row.targetId),
    createdAt: date(row.createdAt),
    readAt: nullableDate(row.readAt),
  };
}
export function parseNotificationPage(value: unknown): NotificationPage {
  const row = object(value);
  if (!Array.isArray(row.content) || row.content.length > 100)
    throw new Error('Invalid notification page.');
  for (const key of ['page', 'size', 'totalElements', 'totalPages'])
    if (!Number.isSafeInteger(row[key]) || Number(row[key]) < 0)
      throw new Error('Invalid notification pagination.');
  if (typeof row.first !== 'boolean' || typeof row.last !== 'boolean')
    throw new Error('Invalid notification pagination.');
  return {
    content: row.content.map(parseNotification),
    page: row.page as number,
    size: row.size as number,
    totalElements: row.totalElements as number,
    totalPages: row.totalPages as number,
    first: row.first,
    last: row.last,
  };
}
export const relationshipResources: Record<Relationship, string> = {
  companyId: 'companies',
  contactId: 'contacts',
  leadId: 'leads',
  opportunityId: 'opportunities',
};
export function createWorkflowApi(
  app: FeatureApplication,
  fetcher: typeof fetch = fetch,
) {
  const captured = app.current(),
    epoch = app.session.getEpoch();
  if (
    captured.auth.status !== 'authenticated' ||
    captured.tenant.status !== 'ready' ||
    captured.tenant.organization.source !== 'backend-membership' ||
    !uuid(captured.tenant.organization.id) ||
    captured.tenant.organization.memberUserId !== captured.auth.user.id
  )
    throw new Error('Verified tenant context is required.');
  const user = captured.auth.user.id,
    tenant = captured.tenant.organization,
    controller = new AbortController();
  const active = () => {
    const value = app.current();
    return (
      !controller.signal.aborted &&
      app.session.getEpoch() === epoch &&
      value.auth.status === 'authenticated' &&
      value.auth.user.id === user &&
      value.sessionEpoch === captured.sessionEpoch &&
      value.tenant.status === 'ready' &&
      value.tenant.organization.id === tenant.id &&
      value.tenant.organization.memberUserId === user &&
      value.tenant.organization.source === 'backend-membership' &&
      value.tenant.organization.role === tenant.role &&
      value.tenant.organization.generation === tenant.generation
    );
  };
  const transport = organizationTransport(
    sessionTransport(app.session, active, fetcher),
    tenant.id,
    controller.signal,
  );
  async function read(path: string, signal?: AbortSignal) {
    const value = await jsonRequest<unknown>(
      app.config.baseUrl,
      path,
      transport,
      { signal },
    );
    if (!active()) throw new Error('Account or organization changed.');
    return value;
  }
  async function write(
    path: string,
    method: string,
    body?: unknown,
    workflow = true,
  ) {
    if (!active() || (workflow && !canWrite(tenant.role)))
      throw new Error('This workflow is read-only for your membership.');
    const csrf = object(await read('/auth/csrf'));
    if (
      csrf.headerName !== 'X-CSRF-TOKEN' ||
      typeof csrf.token !== 'string' ||
      !csrf.token ||
      /[\r\n]/.test(csrf.token)
    )
      throw new Error('Unable to verify request security.');
    const value = await jsonRequest<unknown>(
      app.config.baseUrl,
      path,
      transport,
      {
        method,
        headers: {
          'X-CSRF-TOKEN': csrf.token,
          'Content-Type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      },
    );
    if (!active()) throw new Error('Account or organization changed.');
    recordsChanged();
    return value;
  }
  async function related(
    field: Relationship,
    target: string,
    signal?: AbortSignal,
  ) {
    if (!uuid(target)) throw new Error('Invalid related record ID.');
    const row = object(
      await read(
        `/${relationshipResources[field]}/${encodeURIComponent(target)}`,
        signal,
      ),
    );
    if (id(row.id) !== target || row.archived !== false)
      throw new Error('Related record is unavailable in this organization.');
    return {
      name:
        typeof row.name === 'string'
          ? row.name
          : [row.firstName, row.lastName]
              .filter((v) => typeof v === 'string')
              .join(' ') || target,
      id: target,
    };
  }
  return {
    active,
    read,
    write,
    transport,
    canWrite: canWrite(tenant.role),
    role: tenant.role,
    dispose: () => controller.abort(),
    async list(kind: Kind, filters: Filters, signal: AbortSignal) {
      const rows = await read(`/${kind}${queryString(kind, filters)}`, signal);
      if (!Array.isArray(rows) || rows.length > 5000)
        throw new Error(
          'The unpaged workflow response exceeds supported limits. Narrow filters or request backend pagination.',
        );
      const result = rows.map((row) => parseRecord(kind, row));
      if (new Set(result.map((r) => r.id)).size !== result.length)
        throw new Error('Duplicate workflow IDs.');
      return result;
    },
    async get(kind: Kind, target: string, signal?: AbortSignal) {
      if (!uuid(target)) throw new Error('Invalid workflow ID.');
      const row = parseRecord(kind, await read(`/${kind}/${target}`, signal));
      if (row.id !== target)
        throw new Error(
          'Workflow response does not match the requested record.',
        );
      return row;
    },
    async listPage(
      kind: Kind,
      filters: Filters,
      signal: AbortSignal,
      page: number,
      pendingOnly = false,
    ) {
      const query = new URLSearchParams(queryString(kind, filters));
      query.set('page', String(page));
      query.set('size', '25');
      if (pendingOnly) query.set('pendingOnly', 'true');
      const raw = object(await read('/records/' + kind + '?' + query, signal));
      if (
        !Array.isArray(raw.content) ||
        raw.content.length > 25 ||
        raw.page !== page ||
        !Number.isSafeInteger(raw.totalElements) ||
        Number(raw.totalElements) < 0 ||
        !Number.isSafeInteger(raw.totalPages) ||
        Number(raw.totalPages) < 0
      )
        throw Error('Invalid workflow page.');
      return {
        rows: raw.content.map((row) => parseRecord(kind, row)),
        total: Number(raw.totalElements),
        pages: Number(raw.totalPages),
      };
    },
    async save(kind: Kind, input: Input, target?: string) {
      validateInput(kind, input);
      if (!canWrite(tenant.role))
        throw new Error('This workflow is read-only for your membership.');
      if (target && !uuid(target)) throw new Error('Invalid workflow ID.');
      await Promise.all(
        relationshipFields
          .filter((field) => input[field])
          .map((field) => related(field, input[field]!)),
      );
      const record = parseRecord(
        kind,
        await write(
          `/${kind}${target ? '/' + target : ''}`,
          target ? 'PUT' : 'POST',
          input,
        ),
      );
      if (target && record.id !== target)
        throw new Error('Workflow response ID mismatch.');
      return record;
    },
    async status(row: WorkRecord, next: Status) {
      if (!uuid(row.id)) throw new Error('Invalid task ID.');
      if (!row.task || !transitions[row.task.status].includes(next))
        throw new Error('Task transition is not allowed.');
      const result = parseRecord(
        'tasks',
        await write(`/tasks/${row.id}/status`, 'PATCH', { status: next }),
      );
      if (result.id !== row.id || result.task?.status !== next)
        throw new Error('The server did not confirm the task status.');
      return result;
    },
    async archive(kind: Kind, target: string) {
      if (!uuid(target)) throw new Error('Invalid workflow ID.');
      await write(`/${kind}/${target}`, 'DELETE');
    },
    related,
    async suggestions(signal: AbortSignal) {
      const results = await Promise.allSettled(
        relationshipFields.map(async (field) => {
          const rows = await read('/' + relationshipResources[field], signal);
          if (!Array.isArray(rows))
            throw new Error('Related records unavailable.');
          return rows.slice(0, 500).map((value) => {
            const row = object(value);
            return {
              id: id(row.id),
              name:
                typeof row.name === 'string'
                  ? row.name
                  : [row.firstName, row.lastName]
                      .filter((v) => typeof v === 'string')
                      .join(' ') || String(row.id),
            };
          });
        }),
      );
      return Object.fromEntries(
        results.map((result, index) => [
          relationshipFields[index],
          result.status === 'fulfilled' ? result.value : [],
        ]),
      ) as Record<Relationship, { id: string; name: string }[]>;
    },
    async notifications(page: number, signal: AbortSignal) {
      if (!Number.isInteger(page) || page < 0)
        throw new Error('Invalid notification page.');
      const result = parseNotificationPage(
        await read(`/notifications?page=${page}&size=20`, signal),
      );
      if (result.page !== page) throw new Error('Notification page mismatch.');
      return result;
    },
    async unread(signal: AbortSignal) {
      const row = object(await read('/notifications/unread-count', signal));
      if (!Number.isSafeInteger(row.count) || Number(row.count) < 0)
        throw new Error('Invalid unread count.');
      return row.count as number;
    },
    async markRead(target: string) {
      if (!uuid(target)) throw new Error('Invalid notification ID.');
      const result = parseNotification(
        await write(`/notifications/${target}/read`, 'PATCH', undefined, false),
      );
      if (result.id !== target || !result.readAt)
        throw new Error('Read action was not confirmed.');
      return result;
    },
    async markAllRead() {
      const value = object(
        await write('/notifications/read-all', 'PATCH', undefined, false),
      );
      if (
        !Number.isSafeInteger(value.updatedCount) ||
        Number(value.updatedCount) < 0
      )
        throw new Error('Read-all action was not confirmed.');
      return value.updatedCount as number;
    },
    async markUnread(target: string) {
      if (!uuid(target)) throw Error('Invalid notification ID.');
      const result = parseNotification(
        await write(
          '/notifications/' + target + '/unread',
          'PATCH',
          undefined,
          false,
        ),
      );
      if (result.id !== target || result.readAt !== null)
        throw Error('Unread action was not confirmed.');
      return result;
    },
    async checkReminders() {
      const value = object(
        await write('/tasks/reminders/check', 'POST', undefined, false),
      );
      if (
        !Number.isSafeInteger(value.checkedCount) ||
        Number(value.checkedCount) < 0
      )
        throw Error('Reminder check was not confirmed.');
      return Number(value.checkedCount);
    },
    async notificationTarget(
      type: string,
      target: string,
    ): Promise<`/${string}`> {
      if (!uuid(target) || !['TASK', 'OPPORTUNITY'].includes(type))
        throw Error('Unsupported notification target.');
      const value = object(
        await read(
          '/' + (type === 'TASK' ? 'tasks' : 'opportunities') + '/' + target,
        ),
      );
      if (value.id !== target || value.archived !== false)
        throw Error('Related record unavailable.');
      return type === 'TASK'
        ? `/tasks?id=${target}`
        : `/record-context?resource=opportunities&id=${target}`;
    },
    async membershipTarget(target: string) {
      if (!['OWNER', 'ADMIN'].includes(String(tenant.role)))
        throw new Error(
          'Membership administration requires ADMIN or OWNER permission.',
        );
      const rows = await read('/organization/memberships');
      if (
        !Array.isArray(rows) ||
        !rows.some((value) => {
          const row = object(value);
          return row.id === target && row.organizationId === tenant.id;
        })
      )
        throw new Error('This notification target is unavailable.');
      return '/administration' as const;
    },
  };
}
export type WorkflowApi = ReturnType<typeof createWorkflowApi>;
