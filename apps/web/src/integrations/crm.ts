import { CrmApi } from '../../../../workspaces/umer/src/api';
import type {
  Resource,
  Requests,
} from '../../../../workspaces/umer/src/contracts';
import type { ListQuery } from '../../../../workspaces/umer/src/api';
import type { AuthState } from './auth';
import type { TenantState } from './tenant';
import type { ApiConfiguration } from '../config';
export type {
  Requests,
  Resources,
  Resource,
  LeadStatus,
  OpportunityStage,
} from '../../../../workspaces/umer/src/contracts';
export type { ListQuery } from '../../../../workspaces/umer/src/api';
export const crmRoutes = {
  companies: '/companies',
  contacts: '/contacts',
  leads: '/leads',
  opportunities: '/opportunities',
} as const satisfies Record<Resource, string>;
export interface CrmContext {
  auth: AuthState;
  tenant: TenantState;
}
export type CrmOperations = Pick<
  CrmApi,
  | 'list'
  | 'get'
  | 'create'
  | 'update'
  | 'archive'
  | 'changeLeadStatus'
  | 'changeOpportunityStage'
>;
export class IntegrationBlocked extends Error {
  constructor(public reason: 'session' | 'organization' | 'changed') {
    super(
      'CRM integration requires a verified session and backend-confirmed organization membership.',
    );
  }
}
// Prepared boundary only. The production provider exposes no ready organization.
export function createCrmAdapter(
  config: ApiConfiguration,
  current: () => CrmContext,
  transport: typeof fetch = fetch,
): { operations: CrmOperations; dispose: () => void } {
  const context = current();
  if (context.auth.status !== 'authenticated')
    throw new IntegrationBlocked('session');
  if (
    context.tenant.status !== 'ready' ||
    context.tenant.organization.memberUserId !== context.auth.user.id ||
    context.tenant.organization.source !== 'backend-membership' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      context.tenant.organization.id,
    )
  )
    throw new IntegrationBlocked('organization');
  const userId = context.auth.user.id,
    organizationId = context.tenant.organization.id;
  const lifecycle = new AbortController();
  function verify() {
    const value = current();
    if (
      lifecycle.signal.aborted ||
      value.auth.status !== 'authenticated' ||
      value.auth.user.id !== userId ||
      value.tenant.status !== 'ready' ||
      value.tenant.organization.id !== organizationId ||
      value.tenant.organization.memberUserId !== userId ||
      value.tenant.organization.source !== 'backend-membership'
    )
      throw new IntegrationBlocked('changed');
  }
  const guarded: typeof fetch = async (input, init) => {
    verify();
    const signal = init?.signal
      ? AbortSignal.any([init.signal, lifecycle.signal])
      : lifecycle.signal;
    const response = await transport(input, {
      ...init,
      credentials: 'include',
      cache: 'no-store',
      redirect: 'error',
      signal,
    });
    verify();
    return response;
  };
  const client = new CrmApi(config.baseUrl, organizationId, guarded);
  // Keep auth methods outside CRM's public integration interface.
  async function scoped<T>(action: () => Promise<T>): Promise<T> {
    verify();
    const result = await action();
    verify();
    return result;
  }
  const operations: CrmOperations = {
    list<K extends Resource>(
      resource: K,
      query?: ListQuery,
      signal?: AbortSignal,
    ) {
      return scoped(() => client.list(resource, query, signal));
    },
    get<K extends Resource>(resource: K, id: string, signal?: AbortSignal) {
      return scoped(() => client.get(resource, id, signal));
    },
    create<K extends Resource>(resource: K, body: Requests[K]) {
      return scoped(() => client.create(resource, body));
    },
    update<K extends Resource>(resource: K, id: string, body: Requests[K]) {
      return scoped(() => client.update(resource, id, body));
    },
    archive: (resource, id) => scoped(() => client.archive(resource, id)),
    changeLeadStatus: (id, status) =>
      scoped(() => client.changeLeadStatus(id, status)),
    changeOpportunityStage: (id, stage) =>
      scoped(() => client.changeOpportunityStage(id, stage)),
  };
  return { operations, dispose: () => lifecycle.abort() };
}
