import type { AuthState } from '../integrations/auth';
import type { TenantState } from '../integrations/tenant';
import type { Route } from './routes';
export type Access =
  | 'public'
  | 'checking'
  | 'unavailable'
  | 'unauthorized'
  | 'denied'
  | 'organization-unavailable'
  | 'allowed';
export function routeAccess(
  route: Route,
  state: AuthState,
  tenant: TenantState,
): Access {
  if (route.access === 'public') return 'public';
  if (state.status === 'checking') return 'checking';
  if (state.status === 'anonymous') return 'unauthorized';
  if (state.status === 'denied') return 'denied';
  if (state.status === 'unavailable') return 'unavailable';
  if (route.access === 'session') return 'allowed';
  if (tenant.status !== 'ready') return 'organization-unavailable';
  if (tenant.organization.memberUserId !== state.user.id) return 'denied';
  return 'allowed';
}
