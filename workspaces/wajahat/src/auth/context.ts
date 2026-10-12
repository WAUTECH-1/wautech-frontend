import { createContext, useContext, useSyncExternalStore } from 'react';
import { AuthSession } from './session';
import type { AuthState } from './types';
export const SessionContext = createContext<AuthSession | null>(null);
const serverSnapshot: AuthState = { status: 'checking' };
export const getServerSnapshot = () => serverSnapshot;
export function useAuth() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useAuth requires AuthProvider');
  const state = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    getServerSnapshot,
  );
  return {
    state,
    status: state.status,
    user: state.status === 'authenticated' ? state.user : null,
    verifySession: () => session.restore(),
    login: (input: Parameters<AuthSession['login']>[0]) => session.login(input),
    logout: () => session.logout(),
    handleApiError: (error: unknown) => session.handleApiError(error),
  };
}
