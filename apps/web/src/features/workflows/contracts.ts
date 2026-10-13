export const taskStatuses = [
  'OPEN',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;
export const priorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export const activityTypes = ['CALL', 'EMAIL', 'MEETING', 'NOTE'] as const;
export type Status = (typeof taskStatuses)[number];
export type Priority = (typeof priorities)[number];
export type ActivityType = (typeof activityTypes)[number];
export type Kind = 'tasks' | 'activities';
export const relationshipFields = [
  'companyId',
  'contactId',
  'leadId',
  'opportunityId',
] as const;
export type Relationship = (typeof relationshipFields)[number];
export type Links = Record<Relationship, string | null>;
export interface WorkRecord {
  id: string;
  kind: Kind;
  label: string;
  description: string | null;
  links: Links;
  createdAt: string;
  updatedAt: string;
  task?: {
    status: Status;
    priority: Priority;
    dueAt: string | null;
    completedAt: string | null;
    overdue: boolean;
  };
  activity?: { type: ActivityType; occurredAt: string };
}
export interface TaskInput extends Links {
  title: string;
  description: string | null;
  priority: Priority;
  dueAt: string | null;
}
export interface ActivityInput extends Links {
  subject: string;
  description: string | null;
  type: ActivityType;
  occurredAt: string;
}
export type Input = TaskInput | ActivityInput;
export interface Filters {
  search?: string;
  status?: string;
  priority?: string;
  type?: string;
  sortBy?: string;
  sortDirection?: string;
  overdue?: string;
  dueAfter?: string;
  dueBefore?: string;
  companyId?: string;
  contactId?: string;
  leadId?: string;
  opportunityId?: string;
}
export interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  targetType: string;
  targetId: string | null;
}
export interface NotificationPage {
  content: Notification[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}
export const transitions: Record<Status, readonly Status[]> = {
  OPEN: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  IN_PROGRESS: ['OPEN', 'COMPLETED', 'CANCELLED'],
  COMPLETED: ['OPEN'],
  CANCELLED: ['OPEN'],
};
export const emptyLinks = (): Links => ({
  companyId: null,
  contactId: null,
  leadId: null,
  opportunityId: null,
});
export const canWrite = (role: unknown) =>
  ['OWNER', 'ADMIN', 'SALES_USER'].includes(String(role));
export const uuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function instant(value: string, required = false) {
  if (!value) {
    if (required) throw new Error('A date and time is required.');
    return null;
  }
  const date = new Date(value);
  const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (
    !parts ||
    Number(parts[4]) > 23 ||
    Number(parts[5]) > 59 ||
    new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])))
      .toISOString()
      .slice(0, 10) !== value.slice(0, 10)
  )
    throw new Error('Enter a valid date and time.');
  if (!Number.isFinite(date.getTime()))
    throw new Error('Enter a valid date and time.');
  return date.toISOString();
}
export function validateInput(kind: Kind, input: Input) {
  const label = 'title' in input ? input.title : input.subject;
  if (!label.trim() || label.trim().length > 200)
    throw new Error('Title/subject must contain 1–200 characters.');
  if (input.description && input.description.length > 10000)
    throw new Error('Description must not exceed 10,000 characters.');
  const ids = relationshipFields.map((field) => input[field]);
  if (!ids.some(Boolean))
    throw new Error('Choose at least one related CRM record.');
  if (ids.some((value) => value !== null && !uuid(value)))
    throw new Error('Every related record ID must be a valid UUID.');
  if (kind === 'tasks') {
    if (!('title' in input) || !priorities.includes(input.priority))
      throw new Error('Invalid task priority.');
    if (input.dueAt) instant(input.dueAt, true);
  } else {
    if (!('subject' in input) || !activityTypes.includes(input.type))
      throw new Error('Invalid activity type.');
    instant(input.occurredAt, true);
  }
}
export function queryString(kind: Kind, filters: Filters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (!value) continue;
    const allowed = [
      ...relationshipFields,
      'search',
      'sortBy',
      'sortDirection',
      ...(kind === 'tasks'
        ? ['status', 'priority', 'overdue', 'dueAfter', 'dueBefore']
        : ['type']),
    ];
    if (!allowed.includes(key)) throw new Error('Unsupported workflow filter.');
    if (relationshipFields.includes(key as Relationship) && !uuid(value))
      throw new Error('Invalid related record filter.');
    if (key === 'search' && value.length > 200)
      throw new Error('Search must not exceed 200 characters.');
    if (key === 'status' && !taskStatuses.includes(value as Status))
      throw new Error('Invalid task status filter.');
    if (key === 'priority' && !priorities.includes(value as Priority))
      throw new Error('Invalid priority filter.');
    if (key === 'type' && !activityTypes.includes(value as ActivityType))
      throw new Error('Invalid activity type filter.');
    if (key === 'sortDirection' && !['asc', 'desc'].includes(value))
      throw new Error('Invalid sort direction.');
    if (
      key === 'sortBy' &&
      !(
        kind === 'tasks'
          ? ['createdAt', 'title', 'dueAt', 'priority', 'status']
          : ['createdAt', 'subject', 'occurredAt', 'type']
      ).includes(value)
    )
      throw new Error('Invalid sort field.');
    if (key === 'dueAfter' || key === 'dueBefore') instant(value, true);
    if (key === 'overdue' && value !== 'true' && value !== 'false')
      throw new Error('Invalid overdue filter.');
    params.set(key, value);
  }
  if (
    filters.dueAfter &&
    filters.dueBefore &&
    Date.parse(filters.dueAfter) > Date.parse(filters.dueBefore)
  )
    throw new Error('Due date range is reversed.');
  return params.size ? '?' + params.toString() : '';
}
export function workflowLink(
  kind: Kind,
  links: Partial<Links>,
  id?: string,
): `/${string}` {
  const params = new URLSearchParams();
  if (id && uuid(id)) params.set('id', id);
  for (const field of relationshipFields)
    if (links[field] && uuid(links[field]!)) params.set(field, links[field]!);
  return `/${kind}${params.size ? '?' + params : ''}`;
}
