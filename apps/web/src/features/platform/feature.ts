import type { FeatureModule } from '../contract';
export default {
  id: 'platform',
  routes: [
    {
      path: '/administration',
      title: 'Organization administration',
      access: 'tenant',
      roles: ['OWNER', 'ADMIN'],
      navigation: { label: 'Administration', order: 20 },
      load: () => import('./Administration'),
    },
    {
      path: '/profile',
      title: 'Your profile',
      access: 'session',
      load: () => import('./Profile'),
    },
    {
      path: '/account',
      title: 'Account settings',
      access: 'session',
      navigation: { label: 'Account', order: 30 },
      load: () => import('./Account'),
    },
  ],
} satisfies FeatureModule;
