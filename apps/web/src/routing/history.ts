import { useSyncExternalStore } from 'react';
import type { AppPath } from './routes';
function subscribe(listener: () => void) {
  window.addEventListener('popstate', listener);
  return () => window.removeEventListener('popstate', listener);
}
const snapshot = () => window.location.pathname;
const guards = new Set<() => boolean>();
export function addNavigationGuard(guard: () => boolean) {
  guards.add(guard);
  return () => {
    guards.delete(guard);
  };
}
export function usePath() {
  return useSyncExternalStore(subscribe, snapshot, () => '/');
}
export function navigate(path: AppPath, replace = false) {
  if (!replace && [...guards].some((guard) => !guard())) return;
  if (replace) window.history.replaceState(null, '', path);
  else window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo(0, 0);
}
