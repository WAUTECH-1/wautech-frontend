/** Host-safe entry: no demo fixtures, CSS side effects, DOM startup, auth or network clients. */
export { DashboardApplication } from './DashboardApplication';
export type { DashboardApplicationProps } from './DashboardApplication';
export { DashboardView } from './DashboardView';
export type { DashboardViewProps } from './DashboardView';
export { Card, Icon } from './primitives';
export { PerformanceChart, DataBoundary } from './presentation';
export {
  TaskList,
  OpportunityTable,
  PipelineWidget,
  ActivityFeed,
  PriorityList,
} from './widgets';
export { themes, navigation } from './contracts';
export type * from './contracts';
export {
  formatMoney,
  pipelineTotals,
  resolveTheme,
  readPreference,
  savePreference,
} from './preferences';

export { MetricCards } from './MetricCards';
export { ThemeScope } from './ThemeScope';
export { useDashboardTheme } from './theme';
