import type { FeatureModule } from '../contract';
export default {
  id: 'example',
  routes: [
    {
      path: '/feature-example',
      title: 'Feature contract example',
      access: 'tenant',
      load: () => import('./Page'),
    },
  ],
} satisfies FeatureModule;
