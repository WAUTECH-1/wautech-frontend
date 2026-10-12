export const themes = [
  'Midnight Glass',
  'Arctic Light',
  'Cyber Command',
  'Executive Gold',
] as const;
export type Theme = (typeof themes)[number];
export const navigation = [
  'Overview',
  'Companies',
  'Contacts',
  'Leads',
  'Opportunities',
  'Sales pipeline',
  'Activities',
  'Tasks',
  'Settings',
] as const;
export type Page = (typeof navigation)[number];
export type DataState = 'ready' | 'loading' | 'empty' | 'error';
export interface Money {
  amount: number;
  currency: string;
}
export interface Metric {
  id: string;
  label: string;
  value: string;
  change?: string;
  detail?: string;
  icon: string;
  trend?: readonly number[];
}
export interface Opportunity {
  id: string;
  company: string;
  initials: string;
  name: string;
  value: Money | null;
  stage: string;
  owner: string;
}
export interface PipelineStage {
  id: string;
  stage: string;
  count: number;
  totals: readonly Money[];
}
export interface DashboardTask {
  id: string;
  title: string;
  detail: string;
  initials: string;
  completed: boolean;
}
export interface Activity {
  id: string;
  text: string;
  timeLabel: string;
}
export interface PriorityAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  target: Page;
}
export interface Notification {
  id: string;
  title: string;
  detail: string;
  read: boolean;
}
export interface ChartPoint {
  label: string;
  current: number;
  previous?: number;
}
export interface PerformanceSeries {
  currency: string;
  points: readonly ChartPoint[];
  summary?: Money;
  change?: string;
  description: string;
}
export type Provenance =
  | { kind: 'unavailable'; label: string }
  | { kind: 'demo'; label: string }
  | { kind: 'verified'; label: string; asOf: string };
export interface DashboardData {
  provenance: Provenance;
  metrics: readonly Metric[];
  performance: PerformanceSeries;
  pipeline: readonly PipelineStage[];
  opportunities: readonly Opportunity[];
  tasks: readonly DashboardTask[];
  priorities: readonly PriorityAction[];
  activities: readonly Activity[];
  notifications: readonly Notification[];
  /** Optional global count from the verified unread-count endpoint; absent means loaded records only. */
  unreadNotificationCount?: number;
}
export interface WorkspaceUser {
  name: string;
  initials: string;
  roleLabel: string;
  workspaceName: string;
  authenticated: boolean;
}
export interface DashboardActions {
  onNavigate?: (page: Page) => void;
  onTaskToggle?: (id: string, completed: boolean) => void;
  onOpenNotifications?: () => void;
}
