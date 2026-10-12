import { useEffect, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { createSessionAdapter } from '../integrations/auth';
import { unavailableTenant } from '../integrations/tenant';
import { apiConfiguration } from '../config';
import { ApplicationContext } from './context';
export function ApplicationProvider({ children }: { children: ReactNode }) {
  const [runtime] = useState(() => {
    const config = apiConfiguration(import.meta.env.VITE_API_BASE_URL);
    return { config, session: createSessionAdapter(config.baseUrl) };
  });
  const auth = useSyncExternalStore(
    runtime.session.subscribe,
    runtime.session.getSnapshot,
    runtime.session.getSnapshot,
  );
  useEffect(() => {
    void runtime.session.restore();
  }, [runtime]);
  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    const refresh = () => {
      if (document.visibilityState === 'visible')
        void runtime.session.restore();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(timer);
    };
  }, [runtime, auth.status]);
  return (
    <ApplicationContext value={{ ...runtime, auth, tenant: unavailableTenant }}>
      {children}
    </ApplicationContext>
  );
}
