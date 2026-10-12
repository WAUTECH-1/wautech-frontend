import type { FeatureModule, FeatureRoute } from './contract';

export function collectFeatures(modules: readonly FeatureModule[]) {
  const ids = new Set<string>();
  const paths = new Set<string>();
  return modules.flatMap((module) => {
    if (!module.id || ids.has(module.id))
      throw new Error('Duplicate feature ID');
    ids.add(module.id);
    return module.routes.map((route) => {
      if (!/^\/[a-z0-9/-]+$/.test(route.path) || paths.has(route.path))
        throw new Error('Invalid or duplicate feature path');
      if (route.roles && route.access !== 'tenant')
        throw new Error('Role restrictions require tenant access');
      paths.add(route.path);
      return { ...route, module: module.id };
    });
  });
}
const manifests = import.meta.glob<{ default: FeatureModule }>(
  './*/feature.ts',
  { eager: true },
);
export const featureRoutes = collectFeatures(
  Object.entries(manifests)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, m]) => m.default),
);
export function featureAt(path: string): FeatureRoute | undefined {
  return featureRoutes.find((route) => route.path === path);
}
