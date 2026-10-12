import { Card, PerformanceChart } from './presentation';
import { Icon } from './primitives';
import { MetricCards } from './MetricCards';
import {
  TaskList,
  OpportunityTable,
  PipelineWidget,
  ActivityFeed,
  PriorityList,
} from './widgets';
import { formatMoney } from './preferences';
import type { DashboardData, DashboardActions } from './contracts';
export interface DashboardViewProps extends DashboardActions {
  data: DashboardData;
  period: string;
  showProvenance?: boolean;
}
export function DashboardView({
  data,
  period,
  onNavigate,
  onTaskToggle,
  onOpenNotifications,
  showProvenance = true,
}: DashboardViewProps) {
  const navigate = (
    page: Parameters<NonNullable<DashboardActions['onNavigate']>>[0],
  ) => onNavigate?.(page);
  const demo = data.provenance.kind === 'demo';
  const unread =
    data.unreadNotificationCount ??
    data.notifications.filter((n) => !n.read).length;
  return (
    <>
      {showProvenance && (
        <div className="demo-banner">
          <span>
            {demo ? 'Demonstration data' : 'Verified data'} ·{' '}
            {data.provenance.label}
          </span>
        </div>
      )}
      <MetricCards metrics={data.metrics} />
      <div className="dashboard-grid">
        <Card
          title="Opportunity performance"
          subtitle={data.performance.description}
          className="performance"
          action={<span className="badge">{period}</span>}
        >
          <div className="chart-summary">
            {data.performance.summary &&
              data.performance.summary.currency ===
                data.performance.currency && (
                <strong>{formatMoney(data.performance.summary)}</strong>
              )}
            {data.performance.change && (
              <span className="positive">{data.performance.change}</span>
            )}
            <div className="legend">
              <span>
                <i />
                Current period
              </span>
              {data.performance.points.some(
                (p) => p.previous !== undefined,
              ) && (
                <span>
                  <i />
                  Previous period
                </span>
              )}
            </div>
          </div>
          <PerformanceChart series={data.performance} />
        </Card>
        <Card
          title="Sales pipeline"
          subtitle="Where the next opportunity lives"
          action={
            <button
              className="text-button"
              disabled={!onNavigate}
              onClick={() => navigate('Sales pipeline')}
              aria-label="View sales pipeline"
            >
              <Icon name="arrow" />
            </button>
          }
        >
          <PipelineWidget stages={data.pipeline} onNavigate={onNavigate} />
        </Card>
        <Card
          title="Priority actions"
          subtitle="Small steps. Meaningful progress."
          className="priority-card"
          action={
            <span className="badge">{data.priorities.length} to review</span>
          }
        >
          <PriorityList actions={data.priorities} onNavigate={onNavigate} />
        </Card>
        <Card
          title="Upcoming tasks"
          subtitle={`${data.tasks.filter((t) => !t.completed).length} remaining${demo ? ' · local demo' : ''}`}
          action={
            <button
              className="text-button"
              disabled={!onNavigate}
              onClick={() => navigate('Tasks')}
            >
              View all <Icon name="arrow" size={16} />
            </button>
          }
        >
          <TaskList tasks={data.tasks} onToggle={onTaskToggle} />
        </Card>
        <Card
          title="Recent opportunities"
          subtitle="Your most promising conversations"
          className="opportunities-card"
          action={
            <button
              className="text-button"
              disabled={!onNavigate}
              onClick={() => navigate('Opportunities')}
            >
              View all <Icon name="arrow" size={16} />
            </button>
          }
        >
          <OpportunityTable opportunities={data.opportunities} />
        </Card>
        <Card title="Activity feed" subtitle="The latest across your workspace">
          <ActivityFeed activities={data.activities} />
          <button
            className="text-button"
            disabled={!onNavigate}
            onClick={() => navigate('Activities')}
          >
            Explore activities <Icon name="arrow" size={16} />
          </button>
        </Card>
        <Card
          title="Notifications summary"
          subtitle="Your attention, thoughtfully directed"
          className="notification-summary"
        >
          <div>
            <strong>
              {unread
                ? `${unread} ${data.unreadNotificationCount === undefined && !demo ? 'loaded updates' : 'updates'} to review`
                : demo || data.unreadNotificationCount === 0
                  ? 'You’re all caught up'
                  : 'No unread updates in this view'}
            </strong>
            <p>
              {demo
                ? 'Demonstration notifications for this workspace.'
                : data.provenance.label}
            </p>
          </div>
          <button
            className="text-button"
            disabled={!onOpenNotifications}
            onClick={() => onOpenNotifications?.()}
          >
            Open inbox <Icon name="arrow" size={16} />
          </button>
        </Card>
      </div>
    </>
  );
}
