import { ApiError, safeError, type AuthApi } from '../api/auth-api';
import type { AuthState, LoginInput, PortalRoute } from './types';

export class AuthSession {
  private state: AuthState = { status: 'checking' };
  private listeners = new Set<() => void>();
  private generation = 0;
  private mutating = false;
  private epoch = 0;
  getEpoch = () => this.epoch;
  constructor(private readonly api: AuthApi) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private set(state: AuthState) {
    if (
      state.status !== this.state.status ||
      (state.status === 'authenticated' &&
        this.state.status === 'authenticated' &&
        state.user.id !== this.state.user.id)
    )
      ++this.epoch;
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }
  /** Call for protected API failures; tenant 403 must not become a global logout. */
  handleApiError(error: unknown): boolean {
    if (!(error instanceof ApiError) || error.kind !== 'unauthorized')
      return false;
    ++this.generation;
    this.set({ status: 'anonymous', reason: 'expired' });
    return true;
  }
  async restore() {
    if (this.mutating) return;
    const generation = ++this.generation;
    const wasAuthenticated = this.state.status === 'authenticated';
    try {
      const user = await this.api.me();
      if (generation === this.generation)
        this.set({ status: 'authenticated', user });
    } catch (error) {
      if (generation !== this.generation) return;
      if (error instanceof ApiError && error.kind === 'unauthorized')
        this.set({
          status: 'anonymous',
          reason: wasAuthenticated ? 'expired' : 'signed-out',
        });
      else if (error instanceof ApiError && error.kind === 'forbidden')
        this.set({ status: 'denied' });
      else this.set({ status: 'unavailable', message: safeError(error) });
    }
  }
  async login(input: LoginInput) {
    if (this.mutating) return;
    this.mutating = true;
    const generation = ++this.generation;
    try {
      const user = await this.api.login(input);
      if (generation === this.generation) {
        ++this.epoch;
        this.set({ status: 'authenticated', user });
      }
    } finally {
      this.mutating = false;
    }
  }
  async logout() {
    if (this.mutating) return;
    this.mutating = true;
    const generation = ++this.generation;
    try {
      try {
        await this.api.logout();
      } catch (error) {
        if (!(error instanceof ApiError && error.kind === 'unauthorized'))
          throw error;
      }
      if (generation === this.generation)
        this.set({ status: 'anonymous', reason: 'logout' });
    } finally {
      this.mutating = false;
    }
  }
}

export function routeAccess(
  route: PortalRoute,
  state: AuthState,
): 'allow' | 'checking' | 'unavailable' | 'unauthorized' {
  if (route !== '/portal' && route !== '/organizations') return 'allow';
  if (state.status === 'checking') return 'checking';
  if (state.status === 'unavailable') return 'unavailable';
  return state.status === 'authenticated' ? 'allow' : 'unauthorized';
}

// There is no verified membership discovery/selection HTTP API in backend main.
export const organizationCapability = {
  available: false,
  message:
    'Organization selection is not available yet. Your account is signed in, but memberships and roles cannot be retrieved through the current backend API.',
} as const;
