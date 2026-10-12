import { useSyncExternalStore } from 'react';
import type { AppPath } from './routes';
function subscribe(listener: () => void) {
  window.addEventListener('popstate', listener);
  return () => window.removeEventListener('popstate', listener);
}
const snapshot = () => window.location.pathname;
export function usePath() {
  return useSyncExternalStore(subscribe, snapshot, () => '/');
}
export function navigate(path: AppPath, replace = false) {
  if (replace) window.history.replaceState(null, '', path);
  else window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo(0, 0);
}
