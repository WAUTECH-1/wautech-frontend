import type { FeatureModule } from '../contract';
export const workflowRoutes = [
  {
    path: '/tasks',
    title: 'Task management',
    access: 'tenant',
    load: () => import('./TaskPage'),
  },
  {
    path: '/activities',
    title: 'Activity management',
    access: 'tenant',
    load: () => import('./ActivityPage'),
  },
  {
    path: '/notifications',
    title: 'Notifications',
    access: 'tenant',
    navigation: { label: 'Notifications', order: 15 },
    load: () => import('./NotificationPage'),
  },
] as const satisfies FeatureModule['routes'];
export const workflowNavigation = [
  { path: '/tasks', label: 'Tasks' },
  { path: '/activities', label: 'Activities' },
  { path: '/notifications', label: 'Notifications' },
] as const;
export const workflowPermissions = {
  read: ['OWNER', 'ADMIN', 'SALES_USER', 'VIEWER'],
  write: ['OWNER', 'ADMIN', 'SALES_USER'],
  notificationReadActions: ['OWNER', 'ADMIN', 'SALES_USER', 'VIEWER'],
} as const;
export default {
  id: 'workflows',
  routes: workflowRoutes,
} satisfies FeatureModule;
