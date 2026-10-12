import { lazy, Suspense, useMemo } from 'react';
import type { FeatureRoute } from './contract';
import { ErrorBoundary } from '../components/ErrorBoundary';

export function FeatureView({ route }: { route: FeatureRoute }) {
  const Page = useMemo(() => lazy(route.load), [route]);
  const content = (
    <Suspense
      fallback={route.loading ?? <p role="status">Loading {route.title}…</p>}
    >
      <Page />
    </Suspense>
  );
  return (
    <ErrorBoundary>
      {route.Provider ? <route.Provider>{content}</route.Provider> : content}
    </ErrorBoundary>
  );
}
