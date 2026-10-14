import type { FeatureModule } from '../contract';
export default {
  id: 'copilot',
  routes: [
    {
      path: '/assistant',
      title: 'WAUTECH Intelligence assistant',
      access: 'tenant',
      navigation: { label: 'Intelligence assistant', order: 9 },
      load: () => import('./Assistant'),
    },
  ],
} satisfies FeatureModule;
