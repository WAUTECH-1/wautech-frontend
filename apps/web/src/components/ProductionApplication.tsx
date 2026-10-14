import { RequestLease } from '../integrations/lifecycle';
import { useEffect, useMemo, useState } from 'react';
import { DashboardApplication, PipelineWidget, Card } from '@wautech/asad';
import type { Page, DashboardData } from '@wautech/asad';
import { CrmContent } from '@wautech/umer';
import type { Resource } from '@wautech/umer/contracts';
import { safeError } from '@wautech/wajahat';
import { useApplication } from '../providers/context';
import type { ApplicationContextValue } from '../providers/context';
import { createCrmAdapter } from '../integrations/crm';
import {
  sessionTransport,
  organizationTransport,
  mutation,
} from '../integrations/http';
import { emptyOverview } from '../integrations/overview';
import { loadAggregateOverview } from '../integrations/aggregate-overview';
import type { AppPath } from '../routing/routes';
import { navigate } from '../routing/history';
import { featureAt, featureRoutes } from '../features/registry';
import { FeatureView } from '../features/FeatureView';
import { routeAccess } from '../routing/access';
const pagePaths: Record<Page, AppPath> = {
  Overview: '/dashboard',
  Companies: '/companies',
  Contacts: '/contacts',
  Leads: '/leads',
  Opportunities: '/opportunities',
  'Sales pipeline': '/pipeline',
  Activities: '/activities',
  Tasks: '/tasks',
  Settings: '/settings',
};
export function ProductionApplication({ path }: { path: AppPath }) {
  const app = useApplication();
  if (
    app.auth.status !== 'authenticated' ||
    app.tenant.status !== 'ready' ||
    app.tenant.organization.memberUserId !== app.auth.user.id
  )
    return null;
  return (
    <TenantApplication
      key={`${app.auth.user.id}:${app.tenant.organization.id}:${app.tenant.organization.generation}`}
      path={path}
      app={app}
    />
  );
}
function TenantApplication({
  path,
  app,
}: {
  path: AppPath;
  app: ApplicationContextValue;
}) {
  const { config, session, auth, tenant } = app;
  const feature = featureAt(path);
  const [data, setData] = useState<DashboardData>(emptyOverview);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [failures, setFailures] = useState<string[]>([]);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision((v) => v + 1);
    window.addEventListener('wautech:records-changed', refresh);
    return () => window.removeEventListener('wautech:records-changed', refresh);
  }, []);
  const [busy, setBusy] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [scope] = useState(() => {
    const captured = tenant.status === 'ready' ? tenant.organization : null;
    const userId = auth.status === 'authenticated' ? auth.user.id : '';
    const sessionEpoch = session.getEpoch();
    const controller = new AbortController();
    const active = () => {
      const current = app.current();
      return (
        !controller.signal.aborted &&
        session.getEpoch() === sessionEpoch &&
        current.auth.status === 'authenticated' &&
        current.auth.user.id === userId &&
        current.tenant.status === 'ready' &&
        current.tenant.organization === captured
      );
    };
    const transport = sessionTransport(session, active);
    const tenantTransport = organizationTransport(
      transport,
      captured!.id,
      controller.signal,
    );
    return { controller, active, transport: tenantTransport };
  });
  const [getContext] = useState(() => app.current);
  const crm = useMemo(
    () => createCrmAdapter(config, getContext, scope.transport),
    [config, scope, getContext],
  );
  const [mounts] = useState(() => new RequestLease());
  useEffect(() => {
    const generation = mounts.enter();
    return () => {
      mounts.leave(generation, () => {
        scope.controller.abort();
        crm.dispose();
      });
    };
  }, [scope, crm, mounts]);
  useEffect(() => {
    const controller = new AbortController();
    void loadAggregateOverview(
      config.baseUrl,
      scope.transport,
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted && scope.active()) {
          setData(result.data);
          setFailures(result.failures);
          setState(result.failures.length === 3 ? 'error' : 'ready');
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted && scope.active()) {
          setError(safeError(e));
          setState('error');
        }
      });
    return () => controller.abort();
  }, [config.baseUrl, scope, revision]);
  if (auth.status !== 'authenticated' || tenant.status !== 'ready') return null;
  async function mutate(pathname: string, body?: unknown) {
    setBusy(true);
    setError('');
    try {
      await mutation(config.baseUrl, pathname, scope.transport, body);
      if (scope.active()) setRevision((v) => v + 1);
    } catch (e) {
      if (scope.active()) setError(safeError(e));
    } finally {
      if (scope.active()) setBusy(false);
    }
  }
  async function logout() {
    setLogoutBusy(true);
    setLogoutError('');
    try {
      await session.logout();
      navigate('/login');
    } catch (e) {
      setLogoutError(safeError(e));
      setLogoutBusy(false);
    }
  }
  const page =
    (Object.keys(pagePaths) as Page[]).find((key) => pagePaths[key] === path) ||
    'Overview';
  const resources = {
    '/companies': 'companies',
    '/contacts': 'contacts',
    '/leads': 'leads',
    '/opportunities': 'opportunities',
  } as const;
  const resource = resources[path as keyof typeof resources] as
    Resource | undefined;
  return (
    <>
      <DashboardApplication
        onAssistant={() => navigate('/assistant')}
        data={data}
        user={{
          name: `${auth.user.firstName} ${auth.user.lastName}`,
          initials: `${auth.user.firstName.slice(0, 1)}${auth.user.lastName.slice(0, 1)}`,
          roleLabel: tenant.organization.role || 'Role unavailable',
          workspaceName: tenant.organization.name || 'Organization',
          authenticated: true,
        }}
        page={page}
        notificationState={
          state === 'loading'
            ? 'loading'
            : failures.includes('/notifications')
              ? 'unavailable'
              : 'ready'
        }
        pageTitle={
          feature
            ? feature.title
            : path === '/profile'
              ? 'Profile'
              : path === '/organizations'
                ? 'Organizations'
                : undefined
        }
        period="Current snapshot"
        periods={['Current snapshot']}
        onPeriodChange={() => {}}
        state={
          feature ||
          resource ||
          path === '/profile' ||
          path === '/organizations'
            ? 'ready'
            : state
        }
        errorMessage={error}
        onRetry={() => setRevision((v) => v + 1)}
        onNavigate={(page) => navigate(pagePaths[page])}
        onLogout={() => void logout()}
        logoutBusy={logoutBusy}
        logoutError={logoutError}
        hostControls={
          <div className="production-controls">
            {featureRoutes
              .filter(
                (route) =>
                  route.navigation &&
                  routeAccess(route, auth, tenant) === 'allowed',
              )
              .sort(
                (a, b) =>
                  (a.navigation?.order ?? 0) - (b.navigation?.order ?? 0),
              )
              .map((route) => (
                <button
                  key={route.path}
                  aria-current={route.path === path ? 'page' : undefined}
                  onClick={() => navigate(route.path)}
                >
                  {route.navigation!.label}
                </button>
              ))}
            <button
              onClick={() => navigate('/organizations')}
              aria-label="Switch organization"
            >
              Organization
            </button>
            <button onClick={() => navigate('/profile')}>Profile</button>
          </div>
        }
        renderProfile={() => <p>{auth.user.email}</p>}
        onTaskToggle={
          tenant.organization.role === 'VIEWER' || busy
            ? undefined
            : (id, completed) =>
                void mutate(`/tasks/${encodeURIComponent(id)}/status`, {
                  status: completed ? 'COMPLETED' : 'OPEN',
                })
        }
        onMarkNotificationsRead={
          busy ? undefined : () => void mutate('/notifications/read-all')
        }
        renderPage={() =>
          feature ? (
            <FeatureView route={feature} />
          ) : resource ? (
            <CrmContent
              key={resource}
              resource={resource}
              api={crm.operations}
              user={auth.user}
              organization={tenant.organization.id}
              readOnly={tenant.organization.role === 'VIEWER'}
              renderRecordActions={(record) => (
                <button
                  onClick={() =>
                    navigate(
                      `/record-context?resource=${resource}&id=${record.id}`,
                    )
                  }
                >
                  Related records, ownership and workflows
                </button>
              )}
            />
          ) : path === '/pipeline' ? (
            <Card title="Sales pipeline">
              <PipelineWidget stages={data.pipeline} />
            </Card>
          ) : path === '/profile' ? (
            <Card title="Your profile">
              <p>
                {auth.user.firstName} {auth.user.lastName}
              </p>
              <p>{auth.user.email}</p>
              <p>
                {tenant.organization.name} · {tenant.organization.role}
              </p>
              <button disabled={logoutBusy} onClick={() => void logout()}>
                Sign out
              </button>
              {logoutError && <p role="alert">{logoutError}</p>}
            </Card>
          ) : path === '/organizations' ? (
            <Card title="Organization">
              <label>
                Switch organization
                <select
                  aria-label="Organization"
                  value={tenant.organization.id}
                  onChange={(e) => void app.selectOrganization(e.target.value)}
                >
                  {app.organizations.map((item) => (
                    <option
                      key={item.organizationId}
                      value={item.organizationId}
                    >
                      {item.organizationName} · {item.role}
                    </option>
                  ))}
                </select>
              </label>
            </Card>
          ) : undefined
        }
        preferenceKey="wautech-production"
      />
      {(error || failures.length > 0) && (
        <div className="production-notice" role="alert">
          {error ||
            `Some data is unavailable: ${failures.map((p) => p.slice(1)).join(', ')}.`}
          <button onClick={() => setRevision((v) => v + 1)}>Retry data</button>
        </div>
      )}
    </>
  );
}
