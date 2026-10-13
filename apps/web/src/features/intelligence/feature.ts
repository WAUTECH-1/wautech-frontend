import type { FeatureModule } from '../contract';
export const intelligenceRoutes = [
  {
    path: '/dashboard',
    title: 'Executive intelligence',
    access: 'tenant',
    load: () => import('./DashboardPage'),
  },
  {
    path: '/pipeline',
    title: 'Sales pipeline',
    access: 'tenant',
    load: () => import('./PipelinePage'),
  },
  {
    path: '/reports',
    title: 'Sales reports',
    access: 'tenant',
    navigation: { label: 'Reports', order: 10 },
    load: () => import('./ReportsPage'),
  },
] as const satisfies FeatureModule['routes'];
export const intelligenceNavigation = [
  { path: '/dashboard', label: 'Overview' },
  { path: '/pipeline', label: 'Sales pipeline' },
  { path: '/reports', label: 'Reports' },
] as const;
export const intelligencePermissions = {
  read: ['OWNER', 'ADMIN', 'SALES_USER', 'VIEWER'],
  write: ['OWNER', 'ADMIN', 'SALES_USER'],
} as const;
export default {
  id: 'intelligence',
  routes: intelligenceRoutes,
} satisfies FeatureModule;
