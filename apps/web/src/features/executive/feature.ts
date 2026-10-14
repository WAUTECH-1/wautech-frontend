import type { FeatureModule } from '../contract';
export default {
  id: 'executive-productivity',
  routes: [
    {
      path: '/search',
      title: 'Global CRM search',
      access: 'tenant',
      navigation: { label: 'Search CRM', order: 14 },
      load: () => import('./SearchPage'),
    },
  ],
} satisfies FeatureModule;
