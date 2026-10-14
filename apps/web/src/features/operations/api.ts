import type { FeatureApplication } from '../contract';
import { createWorkflowApi } from '../workflows/api';
import { relationshipFields, uuid } from '../workflows/contracts';
import { recordsChanged } from '../../integrations/refresh';
export type Resource =
  | 'companies'
  | 'contacts'
  | 'leads'
  | 'opportunities'
  | 'tasks'
  | 'activities'
  | 'notes';
export const resources: Resource[] = [
  'companies',
  'contacts',
  'leads',
  'opportunities',
  'tasks',
  'activities',
  'notes',
];
export const resourceCode = {
  companies: 'COMPANY',
  contacts: 'CONTACT',
  leads: 'LEAD',
  opportunities: 'OPPORTUNITY',
  tasks: 'TASK',
  activities: 'ACTIVITY',
  notes: 'NOTE',
} as const;
export type Row = Record<string, unknown> & { id: string };
export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
export interface Note extends Row {
  title: string;
  body: string;
  companyId: string | null;
  contactId: string | null;
  leadId: string | null;
  opportunityId: string | null;
}
export interface SavedView extends Row {
  name: string;
  resource: string;
  configurationVersion: number;
  configuration: {
    search?: string;
    filters?: Record<string, string>;
    sortBy?: string;
    sortDirection?: string;
  };
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('Unexpected service response.');
  return value as Record<string, unknown>;
}
export function rows(value: unknown): Row[] {
  if (!Array.isArray(value)) throw Error('Expected record list.');
  return value.map((v) => {
    const r = object(v);
    if (typeof r.id !== 'string' || !uuid(r.id))
      throw Error('Invalid record ID.');
    return r as Row;
  });
}
export function page<T>(value: unknown, parse: (v: unknown) => T): Page<T> {
  const p = object(value);
  if (
    !Array.isArray(p.content) ||
    p.content.length > 100 ||
    !Number.isSafeInteger(p.page) ||
    !Number.isSafeInteger(p.size) ||
    Number(p.page) < 0 ||
    Number(p.size) < 1 ||
    Number(p.size) > 100 ||
    !Number.isSafeInteger(p.totalElements) ||
    Number(p.totalElements) < 0 ||
    !Number.isSafeInteger(p.totalPages) ||
    Number(p.totalPages) < 0
  )
    throw Error('Invalid page response.');
  return { ...p, content: p.content.map(parse) } as unknown as Page<T>;
}
export function note(value: unknown): Note {
  const r = rows([value])[0];
  if (
    r.archived !== false ||
    typeof r.title !== 'string' ||
    typeof r.body !== 'string' ||
    relationshipFields.filter((f) => r[f] !== null).length !== 1 ||
    relationshipFields.some(
      (f) => r[f] !== null && (typeof r[f] !== 'string' || !uuid(String(r[f]))),
    )
  )
    throw Error('Invalid note response.');
  return r as Note;
}
export function savedView(value: unknown): SavedView {
  const r = rows([value])[0];
  if (
    r.archived === true ||
    typeof r.name !== 'string' ||
    !Object.values(resourceCode).includes(
      r.resource as (typeof resourceCode)[Resource],
    ) ||
    r.configurationVersion !== 1
  )
    throw Error('Invalid saved view.');
  object(r.configuration);
  return r as SavedView;
}
export function createOperationsApi(
  app: FeatureApplication,
  fetcher: typeof fetch = fetch,
) {
  const scope = createWorkflowApi(app, fetcher),
    admin = ['OWNER', 'ADMIN'].includes(String(scope.role));
  const base = app.config.baseUrl;
  async function csrf() {
    const token = object(await scope.read('/auth/csrf'));
    if (
      token.headerName !== 'X-CSRF-TOKEN' ||
      typeof token.token !== 'string' ||
      !token.token ||
      /[\r\n]/.test(token.token)
    )
      throw Error('Request security unavailable.');
    return token.token;
  }
  async function transfer(path: string, method: string, body?: FormData) {
    if (!scope.active()) throw Error('Organization changed.');
    if (method !== 'GET' && !admin)
      throw Error('Import requires ADMIN or OWNER.');
    const response = await scope.transport(base + '/api' + path, {
      method,
      body,
      headers: method === 'GET' ? {} : { 'X-CSRF-TOKEN': await csrf() },
    });
    if (!response.ok)
      throw Error(
        response.status === 403
          ? 'You do not have access.'
          : 'Transfer failed. Check validation and confirm the saved state before retrying.',
      );
    return response;
  }
  return {
    ...scope,
    admin,
    async notes(filters: Record<string, string>, signal: AbortSignal) {
      return page(
        await scope.read(
          '/records/notes?' +
            new URLSearchParams({ page: '0', size: '25', ...filters }),
          signal,
        ),
        note,
      );
    },
    async saveNote(input: Omit<Note, 'id'>, id?: string) {
      if (!scope.canWrite) throw Error('Read-only membership.');
      if (
        !String(input.title).trim() ||
        String(input.title).length > 200 ||
        !String(input.body).trim() ||
        String(input.body).length > 10000 ||
        relationshipFields.filter((f) => input[f]).length !== 1
      )
        throw Error(
          'A title, body and exactly one related record are required.',
        );
      for (const f of relationshipFields)
        if (input[f]) await scope.related(f, String(input[f]));
      return note(
        await scope.write(
          '/notes' + (id ? '/' + id : ''),
          id ? 'PUT' : 'POST',
          input,
        ),
      );
    },
    async archiveNote(id: string) {
      if (!uuid(id)) throw Error('Invalid note ID.');
      await scope.write('/notes/' + id, 'DELETE');
    },
    async views(signal: AbortSignal) {
      return rows(await scope.read('/saved-views', signal)).map(savedView);
    },
    async saveView(input: Omit<SavedView, 'id'>, id?: string) {
      if (!String(input.name).trim() || String(input.name).length > 200)
        throw Error('Enter a view name.');
      return savedView(
        await scope.write(
          '/saved-views' + (id ? '/' + id : ''),
          id ? 'PUT' : 'POST',
          input,
        ),
      );
    },
    async archiveView(id: string) {
      if (!uuid(id)) throw Error('Invalid view ID.');
      await scope.write('/saved-views/' + id, 'DELETE');
    },
    async preview(resource: string, file: File) {
      if (
        !['companies', 'contacts', 'leads', 'opportunities'].includes(
          resource,
        ) ||
        !file.name.toLowerCase().endsWith('.csv') ||
        file.size > 5 * 1024 * 1024
      )
        throw Error('Choose a supported CSV file up to 5 MiB.');
      const form = new FormData();
      form.set('file', file);
      const result = object(
        await (
          await transfer('/imports/' + resource + '/validate', 'POST', form)
        ).json(),
      );
      if (
        !Number.isSafeInteger(result.invalidRows) ||
        !Number.isSafeInteger(result.validRows) ||
        !Array.isArray(result.errors)
      )
        throw Error('Invalid import preview.');
      return result;
    },
    async importCsv(resource: string, file: File) {
      const form = new FormData();
      form.set('file', file);
      const result = object(
        await (await transfer('/imports/' + resource, 'POST', form)).json(),
      );
      if (
        !Number.isSafeInteger(result.createdRecords) ||
        !Number.isSafeInteger(result.processedRows)
      )
        throw Error(
          'Import confirmation unavailable. Check records before retrying.',
        );
      recordsChanged();
      return result;
    },
    async exportCsv(resource: string) {
      if (
        !['companies', 'contacts', 'leads', 'opportunities'].includes(resource)
      )
        throw Error('Unsupported export.');
      const response = await transfer('/exports/' + resource, 'GET');
      if (!response.headers.get('content-type')?.includes('text/csv'))
        throw Error('Unexpected export response.');
      return response.blob();
    },
    async members(signal?: AbortSignal) {
      const result = await scope.read('/organization/eligible-members', signal);
      if (!Array.isArray(result)) throw Error('Member list unavailable.');
      return result.map((v) => {
        const row = object(v);
        if (!uuid(String(row.userId)) || typeof row.name !== 'string')
          throw Error('Invalid member.');
        return { userId: String(row.userId), name: row.name };
      });
    },
    async assign(
      kind: 'tasks' | 'opportunities',
      id: string,
      userId: string | null,
    ) {
      if (!uuid(id) || (userId && !uuid(userId)))
        throw Error('Invalid assignment.');
      const result = object(
        await scope.write(
          '/' + kind + '/' + id + (kind === 'tasks' ? '/assignee' : '/owner'),
          'PATCH',
          { userId },
        ),
      );
      if (
        result.id !== id ||
        result[kind === 'tasks' ? 'assigneeUserId' : 'ownerUserId'] !== userId
      )
        throw Error('Server did not confirm assignment.');
      return result;
    },
  };
}
export type OperationsApi = ReturnType<typeof createOperationsApi>;
