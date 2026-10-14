import type { FeatureModule } from '../contract';
export default {
  id: 'operations',
  routes: [
    {
      path: '/sales-pipelines',
      title: 'Configured pipelines',
      access: 'tenant',
      navigation: { label: 'Pipelines', order: 18 },
      load: () => import('./PipelinesPage'),
    },
    {
      path: '/notes',
      title: 'CRM notes',
      access: 'tenant',
      navigation: { label: 'Notes', order: 16 },
      load: () => import('./NotesPage'),
    },
    {
      path: '/saved-views',
      title: 'Saved views',
      access: 'tenant',
      navigation: { label: 'Saved views', order: 17 },
      load: () => import('./ViewsPage'),
    },
    {
      path: '/data-transfer',
      title: 'Import and export',
      access: 'tenant',
      navigation: { label: 'Import / export', order: 19 },
      load: () => import('./TransferPage'),
    },
    {
      path: '/record-context',
      title: 'Related CRM records',
      access: 'tenant',
      load: () => import('./RecordPage'),
    },
  ],
} satisfies FeatureModule;
