import type { FeatureModule } from '../contract';
export default {
  id: 'business',
  routes: [
    {
      path: '/business-onboarding',
      title: 'Business onboarding',
      access: 'tenant',
      navigation: { label: 'Business onboarding', order: 6 },
      load: () => import('./Onboarding'),
    },
    {
      path: '/business-profile',
      title: 'Business profile',
      access: 'tenant',
      navigation: { label: 'Business profile', order: 7 },
      load: () => import('./Profile'),
    },
    {
      path: '/business-goals',
      title: 'Goals and action plans',
      access: 'tenant',
      navigation: { label: 'Business goals', order: 8 },
      load: () => import('./Goals'),
    },
  ],
} satisfies FeatureModule;
