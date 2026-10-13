import type { ComponentType, ReactNode } from 'react';
import type { ApplicationContextValue } from '../providers/context';

/** Stable host boundary. Feature manifests must not start another router or root. */
export interface FeatureRoute {
  path: `/${string}`;
  title: string;
  access: 'session' | 'tenant';
  roles?: readonly ('OWNER' | 'ADMIN' | 'SALES_USER' | 'VIEWER')[];
  navigation?: { label: string; order?: number };
  load: () => Promise<{ default: ComponentType }>;
  Provider?: ComponentType<{ children: ReactNode }>;
  loading?: ReactNode;
  error?: ReactNode;
}
export interface FeatureModule {
  id: string;
  routes: readonly FeatureRoute[];
}
export type FeatureApplication = ApplicationContextValue;
export { useApplication as useFeatureApplication } from '../providers/context';
