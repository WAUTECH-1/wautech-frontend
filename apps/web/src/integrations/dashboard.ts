import type { ComponentType, ReactNode } from 'react';
import { themes } from '../../../../workspaces/asad/src/data';
import type { Theme } from '../../../../workspaces/asad/src/data';
import type { AuthenticatedUser } from './auth';
import type { AppPath } from '../routing/routes';
export { themes };
export type { Theme };
export interface DashboardNotification {
  id: string;
  title: string;
  read: boolean;
}
export type DashboardData<T> =
  | { status: 'loading' }
  | { status: 'unavailable'; message: string }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T; source: 'backend' };
export interface CurrencyTotal {
  currency: string;
  amount: string;
}
export interface DashboardOverview {
  companyCount: number;
  contactCount: number;
  leadCount: number;
  opportunityCount: number;
  opportunityValues: CurrencyTotal[];
}
// Host-facing interface, not a claim of an existing aggregate HTTP endpoint.
export interface DashboardServices {
  loadOverview(signal: AbortSignal): Promise<DashboardData<DashboardOverview>>;
  loadNotifications(
    signal: AbortSignal,
  ): Promise<DashboardData<DashboardNotification[]>>;
}
export interface DashboardShellProps {
  children: ReactNode;
  user: AuthenticatedUser;
  theme: Theme;
  path: AppPath;
  notifications: DashboardData<DashboardNotification[]>;
  onNavigate: (path: AppPath) => void;
  onLogout: () => Promise<void>;
  onThemeChange: (theme: Theme) => void;
}
export interface DashboardModule {
  Shell: ComponentType<DashboardShellProps>;
  Overview: ComponentType<{ services: DashboardServices }>;
}
export const dashboardCapability = {
  status: 'unavailable',
  message:
    'Reusable dashboard shell and widgets are awaiting their integration export. Demonstration metrics are not mounted.',
} as const;
