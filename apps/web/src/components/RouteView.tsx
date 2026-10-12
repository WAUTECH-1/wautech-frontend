import LoginPage from '@wautech/wajahat/LoginPage';
import type { AuthState, LoginInput } from '../integrations/auth';
import type { TenantState } from '../integrations/tenant';
import type { Route } from '../routing/routes';
import { routeAccess } from '../routing/access';
import { StatusPanel } from './StatusPanel';
import type { ReactNode } from 'react';
export function RouteView({
  route,
  auth,
  tenant,
  onLogin,
  onRetry,
  renderProtected,
}: {
  route: Route | undefined;
  auth: AuthState;
  tenant: TenantState;
  onLogin: (input: LoginInput) => Promise<void>;
  onRetry: () => void;
  renderProtected?: () => ReactNode;
}) {
  if (!route) return <StatusPanel kind="not-found" />;
  if (route.path === '/unauthorized')
    return <StatusPanel kind="unauthorized" />;
  if (route.path === '/access-denied') return <StatusPanel kind="denied" />;
  if (route.path === '/login') {
    if (auth.status === 'checking') return <StatusPanel kind="checking" />;
    if (auth.status === 'authenticated')
      return <StatusPanel kind="organization" />;
    return (
      <div className="foundation-auth">
        <LoginPage
          reason={auth.status === 'anonymous' ? auth.reason : undefined}
          connectionMessage={
            auth.status === 'unavailable'
              ? auth.message
              : auth.status === 'denied'
                ? 'The server denied session access.'
                : undefined
          }
          onLogin={onLogin}
        />
      </div>
    );
  }
  const access = routeAccess(route, auth, tenant);
  if (access === 'checking') return <StatusPanel kind="checking" />;
  if (access === 'unavailable')
    return <StatusPanel kind="unavailable" onRetry={onRetry} />;
  if (access === 'unauthorized')
    return (
      <StatusPanel
        kind={
          auth.status === 'anonymous' && auth.reason === 'expired'
            ? 'expired'
            : 'unauthorized'
        }
      />
    );
  if (access === 'denied') return <StatusPanel kind="denied" />;
  if (access === 'organization-unavailable')
    return renderProtected ? (
      renderProtected()
    ) : (
      <StatusPanel kind="organization" />
    );
  return renderProtected ? (
    renderProtected()
  ) : (
    <section role="status">
      <h1>{route.title}</h1>
      <p>Integration unavailable</p>
    </section>
  );
}
