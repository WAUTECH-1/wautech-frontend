import { lazy, Suspense } from 'react';
import type { FeatureRoute } from './contract';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { featureRoutes } from './registry';
const pages = Object.fromEntries(
  featureRoutes.map((route) => [route.path, lazy(route.load)]),
);

export function FeatureView({ route }: { route: FeatureRoute }) {
  const Page = pages[route.path];
  if (!Page) return <p role="alert">Feature is unavailable.</p>;
  const content = (
    <Suspense
      fallback={route.loading ?? <p role="status">Loading {route.title}…</p>}
    >
      <Page />
    </Suspense>
  );
  return (
    <ErrorBoundary fallback={route.error}>
      {route.Provider ? <route.Provider>{content}</route.Provider> : content}
    </ErrorBoundary>
  );
}
