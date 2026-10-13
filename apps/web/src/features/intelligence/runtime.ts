import type { FeatureApplication } from '../contract';
import type { CrmContext } from '../../integrations/crm';
import { createCrmAdapter } from '../../integrations/crm';
import {
  organizationTransport,
  sessionTransport,
} from '../../integrations/http';
import { loadSnapshot, exactRequest, parseOpportunities } from './data';
import type { OpportunityRow, Snapshot } from './data';
import { stageTransitions } from '@wautech/umer/contracts';
import type { OpportunityStage } from '@wautech/umer/contracts';
export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; message: string };
/** Tenant/account-scoped cache with request coalescing, expiry, abort and generation checks. */
export class ScopedStore<T> {
  private state: LoadState<T> = { status: 'loading' };
  private listeners = new Set<() => void>();
  private pending: AbortController | undefined;
  private sequence = 0;
  private users = 0;
  private loadedAt = 0;
  constructor(
    private load: (signal: AbortSignal) => Promise<T>,
    private active: () => boolean,
  ) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(state: LoadState<T>) {
    this.state = state;
    for (const listener of this.listeners) listener();
  }
  acquire() {
    this.users++;
    if (
      !this.pending &&
      (this.state.status !== 'ready' || Date.now() - this.loadedAt > 30000)
    )
      void this.refresh();
    return () => {
      this.users--;
      queueMicrotask(() => {
        if (!this.users && this.pending) {
          this.pending.abort();
          this.pending = undefined;
          this.sequence++;
          this.state = { status: 'loading' };
        }
      });
    };
  }
  async refresh() {
    this.pending?.abort();
    const controller = new AbortController(),
      generation = ++this.sequence;
    this.pending = controller;
    this.publish({ status: 'loading' });
    try {
      if (!this.active()) throw new Error('Account or organization changed.');
      const data = await this.load(controller.signal);
      if (
        !controller.signal.aborted &&
        this.active() &&
        this.sequence === generation
      ) {
        this.loadedAt = Date.now();
        this.publish({ status: 'ready', data });
      }
    } catch (error) {
      if (
        !controller.signal.aborted &&
        this.active() &&
        this.sequence === generation
      )
        this.publish({
          status: 'error',
          message:
            error instanceof Error ? error.message : 'Unable to load data.',
        });
    } finally {
      if (this.sequence === generation) this.pending = undefined;
    }
  }
}
export function sameContext(captured: CrmContext, current: CrmContext) {
  return (
    captured.auth.status === 'authenticated' &&
    current.auth.status === 'authenticated' &&
    captured.auth.user.id === current.auth.user.id &&
    captured.sessionEpoch === current.sessionEpoch &&
    captured.tenant.status === 'ready' &&
    current.tenant.status === 'ready' &&
    current.tenant.organization.id === captured.tenant.organization.id &&
    current.tenant.organization.memberUserId === current.auth.user.id &&
    current.tenant.organization.generation ===
      captured.tenant.organization.generation &&
    current.tenant.organization.source === 'backend-membership'
  );
}
export function canChangeStage(
  role: unknown,
  from: OpportunityStage,
  to: OpportunityStage,
) {
  return (
    ['OWNER', 'ADMIN', 'SALES_USER'].includes(String(role)) &&
    stageTransitions[from].includes(to)
  );
}
export function createIntelligenceRuntime(
  app: FeatureApplication,
  fetcher: typeof fetch = fetch,
) {
  const captured = app.current();
  if (
    captured.auth.status !== 'authenticated' ||
    captured.tenant.status !== 'ready' ||
    !sameContext(captured, captured)
  )
    throw new Error('Verified tenant context is required.');
  const active = () =>
    sameContext(captured, app.current()) &&
    app.session.getEpoch() === captured.sessionEpoch;
  const lifetime = new AbortController();
  const transport = organizationTransport(
    sessionTransport(app.session, active, fetcher),
    captured.tenant.organization.id,
    lifetime.signal,
  );
  const crm = createCrmAdapter(app.config, app.current, transport);
  const role = captured.tenant.organization.role;
  const snapshot = new ScopedStore<Snapshot>(
    (signal) => loadSnapshot(app.config.baseUrl, transport, signal),
    active,
  );
  const opportunities = new ScopedStore<OpportunityRow[]>(
    async (signal) =>
      parseOpportunities(
        await exactRequest(
          app.config.baseUrl,
          '/opportunities',
          transport,
          signal,
        ),
      ),
    active,
  );
  return {
    active,
    role,
    snapshot,
    opportunities,
    async detail(id: string, signal: AbortSignal) {
      if (!active()) throw new Error('Context changed.');
      const result = parseOpportunities([
        await exactRequest(
          app.config.baseUrl,
          `/opportunities/${encodeURIComponent(id)}`,
          transport,
          signal,
        ),
      ])[0];
      if (!active() || result.id !== id)
        throw new Error(
          'Detail response does not match the requested opportunity.',
        );
      return result;
    },
    async changeStage(row: OpportunityRow, next: OpportunityStage) {
      if (!active() || !canChangeStage(role, row.stage, next))
        throw new Error('This stage change is not permitted.');
      const result = await crm.operations.changeOpportunityStage(row.id, next);
      if (!active() || result.id !== row.id || result.stage !== next)
        throw new Error(
          'The server did not confirm this stage change. Refresh before retrying.',
        );
      await Promise.all([snapshot.refresh(), opportunities.refresh()]);
    },
  };
}
export type IntelligenceRuntime = ReturnType<typeof createIntelligenceRuntime>;
const runtimes = new WeakMap<object, IntelligenceRuntime>();
export function intelligenceRuntime(app: FeatureApplication) {
  if (app.tenant.status !== 'ready')
    throw new Error('Organization is unavailable.');
  const key = app.tenant.organization;
  let runtime = runtimes.get(key);
  if (!runtime || !runtime.active()) {
    runtime = createIntelligenceRuntime(app);
    runtimes.set(key, runtime);
  }
  return runtime;
}
