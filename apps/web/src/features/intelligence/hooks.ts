import { useEffect, useState, useSyncExternalStore } from 'react';
import { useFeatureApplication } from '../contract';
import { intelligenceRuntime } from './runtime';
import type { ScopedStore } from './runtime';
export function useIntelligence() {
  const app = useFeatureApplication();
  const [runtime] = useState(() => intelligenceRuntime(app));
  return runtime;
}
export function useDataset<T>(store: ScopedStore<T>) {
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  useEffect(() => store.acquire(), [store]);
  useEffect(() => {
    const refresh = () => void store.refresh();
    window.addEventListener('wautech:records-changed', refresh);
    return () => window.removeEventListener('wautech:records-changed', refresh);
  }, [store]);
  return state;
}
