import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { AuthSession } from './session';
import type { AuthState } from './types';

import { SessionContext, getServerSnapshot, useAuth } from './context';
/** Own one session per browser application (or per request for SSR). */
export function AuthProvider({
  session,
  children,
}: {
  session: AuthSession;
  children: ReactNode;
}) {
  const state = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    getServerSnapshot,
  );
  useEffect(() => {
    void session.restore();
  }, [session]);
  useEffect(() => {
    if (state.status !== 'authenticated') return;
    const refresh = () => {
      if (document.visibilityState === 'visible') void session.restore();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(timer);
    };
  }, [state.status, session]);
  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}

export type ProtectedFallbackState = Exclude<
  AuthState,
  { status: 'authenticated' }
>;

/** Router-neutral, fail-closed guard. The host owns fallback UI and navigation. */
export function ProtectedRoute({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: (state: ProtectedFallbackState) => ReactNode;
}) {
  const { state } = useAuth();
  return state.status === 'authenticated' ? children : fallback(state);
}
