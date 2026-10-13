import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useFeatureApplication } from '../contract';
import { RequestLease } from '../../integrations/lifecycle';
import { createWorkflowApi } from './api';
export function useWorkflowApi() {
  const app = useFeatureApplication();
  const [api] = useState(() => createWorkflowApi(app));
  const [lease] = useState(() => new RequestLease());
  useEffect(() => {
    const generation = lease.enter();
    return () => lease.leave(generation, api.dispose);
  }, [api, lease]);
  return api;
}
export function useLoad<T>(
  key: string,
  loader: (signal: AbortSignal) => Promise<T>,
) {
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>(
    { key: '' },
  );
  useEffect(() => {
    const controller = new AbortController();
    void loader(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ key, data });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            key,
            error:
              error instanceof Error ? error.message : 'Workflow unavailable.',
          });
      });
    return () => controller.abort();
  }, [key, loader]);
  return state.key === key ? state : { key };
}
const searchSnapshot = () => window.location.search;
function subscribe(listener: () => void) {
  window.addEventListener('popstate', listener);
  return () => window.removeEventListener('popstate', listener);
}
export function useWorkflowSearch() {
  return useSyncExternalStore(subscribe, searchSnapshot, () => '');
}
export function useRelated(
  api: ReturnType<typeof useWorkflowApi>,
  links: import('./contracts').Links,
) {
  const key = JSON.stringify(links);
  const load = useCallback(
    async (signal: AbortSignal) => {
      const values = await Promise.allSettled(
        Object.entries(links)
          .filter(([, id]) => id)
          .map(async ([field, id]) => ({
            field,
            ...(await api.related(
              field as import('./contracts').Relationship,
              id!,
              signal,
            )),
          })),
      );
      return values.map((value) =>
        value.status === 'fulfilled'
          ? value.value
          : {
              field: 'unavailable',
              name: 'Related record is unavailable in this organization.',
              id: '',
            },
      );
    },
    [api, links],
  );
  return useLoad(key, load);
}
