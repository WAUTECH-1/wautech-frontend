import { unavailableTenant } from './tenant';
import type { TenantState } from './tenant';
/** Mutable request lifecycle lives outside React render state. */
export class TenantLifecycle {
  generation = 0;
  abort: AbortController | null = null;
  tenant: TenantState = unavailableTenant;
  advance() {
    return ++this.generation;
  }
  setAbort(controller: AbortController) {
    this.abort = controller;
  }
  setTenant(tenant: TenantState) {
    this.tenant = tenant;
  }
}
/** StrictMode's immediate effect re-mount retains the lease; real unmount disposes it. */
export class RequestLease {
  private generation = 0;
  enter() {
    return ++this.generation;
  }
  leave(generation: number, dispose: () => void) {
    queueMicrotask(() => {
      if (this.generation === generation) dispose();
    });
  }
}
