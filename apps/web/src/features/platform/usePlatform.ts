import { useEffect, useState } from 'react';
import { useFeatureApplication } from '../contract';
import {
  sessionTransport,
  organizationTransport,
} from '../../integrations/http';
import { RequestLease } from '../../integrations/lifecycle';
import { createPlatformApi } from './api';
export function usePlatform() {
  const app = useFeatureApplication();
  const [scope] = useState(() => {
    const epoch = app.session.getEpoch();
    const tenant = app.tenant;
    const controller = new AbortController();
    const active = () =>
      !controller.signal.aborted &&
      app.session.getEpoch() === epoch &&
      (tenant.status !== 'ready' || app.current().tenant === tenant);
    const transport = sessionTransport(app.session, active);
    const scoped =
      tenant.status === 'ready'
        ? organizationTransport(
            transport,
            tenant.organization.id,
            controller.signal,
          )
        : (((input, init) =>
            transport(input, {
              ...init,
              signal: init?.signal
                ? AbortSignal.any([init.signal, controller.signal])
                : controller.signal,
            })) as typeof fetch);
    return {
      active,
      controller,
      api: createPlatformApi(
        app.config.baseUrl,
        scoped,
        tenant.status === 'ready' ? tenant.organization.id : undefined,
        app.auth.status === 'authenticated' ? app.auth.user.id : undefined,
      ),
    };
  });
  const [lease] = useState(() => new RequestLease());
  useEffect(() => {
    const generation = lease.enter();
    return () => lease.leave(generation, () => scope.controller.abort());
  }, [lease, scope]);
  return { ...scope, app };
}
