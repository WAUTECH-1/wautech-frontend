import { TenantLifecycle } from '../integrations/lifecycle';
import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AuthProvider,
  AuthSession,
  createAuthApi,
  useAuth,
  safeError,
} from '@wautech/wajahat';
import { unavailableTenant } from '../integrations/tenant';
import type { TenantState } from '../integrations/tenant';
import {
  discoverOrganizations,
  verifyMembership,
} from '../integrations/membership';
import type { Membership } from '../integrations/membership';
import { sessionTransport } from '../integrations/http';
import { apiConfiguration } from '../config';
import { ApplicationContext } from './context';
export function ApplicationProvider({ children }: { children: ReactNode }) {
  const [runtime] = useState(() => {
    const config = apiConfiguration(import.meta.env.VITE_API_BASE_URL);
    return { config, session: new AuthSession(createAuthApi(config.baseUrl)) };
  });
  return (
    <AuthProvider session={runtime.session}>
      <TenantProvider {...runtime}>{children}</TenantProvider>
    </AuthProvider>
  );
}
function TenantProvider({
  children,
  config,
  session,
}: {
  children: ReactNode;
  config: ReturnType<typeof apiConfiguration>;
  session: AuthSession;
}) {
  const { state: auth } = useAuth();
  const userId = auth.status === 'authenticated' ? auth.user.id : null;
  const sessionEpoch = session.getEpoch();
  const [selection, setSelection] = useState<{
    userId: string;
    epoch: number;
    tenant: TenantState;
  } | null>(null);
  const [discovery, setDiscovery] = useState<{
    userId: string | null;
    epoch: number;
    organizations: Membership[];
  }>({ userId: null, epoch: -1, organizations: [] });
  const organizations =
    discovery.userId === userId && discovery.epoch === sessionEpoch
      ? discovery.organizations
      : [];
  const [revision, setRevision] = useState(0);
  const [runtime] = useState(() => new TenantLifecycle());
  const tenant =
    selection?.userId === userId && selection?.epoch === sessionEpoch && userId
      ? selection.tenant
      : unavailableTenant;
  const selectOrganization = useCallback(
    async (id: string) => {
      const state = session.getSnapshot();
      if (state.status !== 'authenticated') return;
      const currentUser = state.user.id;
      const accountEpoch = session.getEpoch();
      const epoch = runtime.advance();
      runtime.abort?.abort();
      const controller = new AbortController();
      runtime.setAbort(controller);
      runtime.setTenant(unavailableTenant);
      setSelection({
        userId: currentUser,
        epoch: accountEpoch,
        tenant: {
          status: 'unavailable',
          message: 'Verifying organization access…',
        },
      });
      const active = () =>
        runtime.generation === epoch && session.getEpoch() === accountEpoch;
      try {
        const value = await verifyMembership(
          config.baseUrl,
          id,
          sessionTransport(session, active),
          controller.signal,
        );
        if (active()) {
          const verified: TenantState = {
            status: 'ready',
            organization: {
              id: value.organizationId,
              name: value.organizationName,
              membershipId: value.membershipId,
              generation: epoch,
              role: value.role,
              memberUserId: currentUser,
              source: 'backend-membership',
            },
          };
          runtime.setTenant(verified);
          setSelection({
            userId: currentUser,
            epoch: accountEpoch,
            tenant: verified,
          });
        }
      } catch (error) {
        if (runtime.generation === epoch && !controller.signal.aborted)
          setSelection({
            userId: currentUser,
            epoch: accountEpoch,
            tenant: { status: 'unavailable', message: safeError(error) },
          });
      }
    },
    [config.baseUrl, session, runtime],
  );
  useEffect(() => {
    const epoch = runtime.advance();
    runtime.abort?.abort();
    runtime.setTenant(unavailableTenant);
    const controller = new AbortController();
    queueMicrotask(() => {
      if (runtime.generation === epoch) {
        setSelection(null);
        setDiscovery({ userId: null, epoch: -1, organizations: [] });
      }
    });
    if (!userId) return () => controller.abort();
    const active = () =>
      runtime.generation === epoch && session.getEpoch() === sessionEpoch;
    void discoverOrganizations(
      config.baseUrl,
      sessionTransport(session, active),
      controller.signal,
    )
      .then(async (values) => {
        if (!active()) return;
        setDiscovery({ userId, epoch: sessionEpoch, organizations: values });
        if (values.length === 1)
          await selectOrganization(values[0].organizationId);
        else
          setSelection({
            userId,
            epoch: sessionEpoch,
            tenant: {
              status: 'unavailable',
              message: values.length
                ? 'Choose an organization to continue.'
                : 'No active organization memberships are available.',
            },
          });
      })
      .catch((error) => {
        if (active())
          setSelection({
            userId,
            epoch: sessionEpoch,
            tenant: { status: 'unavailable', message: safeError(error) },
          });
      });
    return () => {
      runtime.advance();
      controller.abort();
      runtime.abort?.abort();
    };
  }, [
    userId,
    sessionEpoch,
    revision,
    config.baseUrl,
    session,
    selectOrganization,
    runtime,
  ]);
  return (
    <ApplicationContext
      value={{
        config,
        session,
        auth,
        tenant,
        organizations: userId ? organizations : [],
        selectOrganization,
        reloadOrganizations: () => {
          runtime.setTenant(unavailableTenant);
          setSelection(null);
          setRevision((v) => v + 1);
        },
        current: () => ({
          auth: session.getSnapshot(),
          tenant: runtime.tenant,
          sessionEpoch: session.getEpoch(),
        }),
      }}
    >
      {children}
    </ApplicationContext>
  );
}
