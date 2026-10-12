import { Icon } from './primitives';
import { formatMoney, pipelineTotals } from './preferences';
import type {
  Activity,
  DashboardTask,
  Opportunity,
  PipelineStage,
  PriorityAction,
  Page,
} from './contracts';
export function TaskList({
  tasks,
  onToggle,
}: {
  tasks: readonly DashboardTask[];
  onToggle?: (id: string, completed: boolean) => void;
}) {
  if (!tasks.length) return <p className="muted">No upcoming tasks.</p>;
  return (
    <div className="task-list">
      {tasks.map((task) => (
        <label key={task.id} className={task.completed ? 'done' : ''}>
          <input
            type="checkbox"
            checked={task.completed}
            disabled={!onToggle}
            onChange={() => onToggle?.(task.id, !task.completed)}
          />
          <span>
            <strong>{task.title}</strong>
            <small>{task.detail}</small>
          </span>
          <span className="task-avatar">{task.initials}</span>
        </label>
      ))}
    </div>
  );
}
export function OpportunityTable({
  opportunities,
}: {
  opportunities: readonly Opportunity[];
}) {
  if (!opportunities.length)
    return <p className="muted">No opportunities available.</p>;
  return (
    <div className="table-scroll">
      <table>
        <caption className="sr-only">Opportunity records</caption>
        <thead>
          <tr>
            <th>Company</th>
            <th>Opportunity</th>
            <th>Stage</th>
            <th>Value and currency</th>
            <th>Owner</th>
          </tr>
        </thead>
        <tbody>
          {opportunities.map((d) => (
            <tr key={d.id}>
              <td>
                <span className="company-cell">
                  <span className="company-avatar">{d.initials}</span>
                  <strong>{d.company}</strong>
                </span>
              </td>
              <td>{d.name}</td>
              <td>
                <span className={`stage-badge ${d.stage.toLowerCase()}`}>
                  {d.stage}
                </span>
              </td>
              <td className="table-value">
                {d.value
                  ? `${formatMoney(d.value)} ${d.value.currency}`
                  : 'Not provided'}
              </td>
              <td>{d.owner}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function PipelineWidget({
  stages,
  onNavigate,
}: {
  stages: readonly PipelineStage[];
  onNavigate?: (page: Page) => void;
}) {
  const totals = pipelineTotals(stages);
  if (!stages.length)
    return <p className="muted">No pipeline data available.</p>;
  return (
    <>
      <div className="pipeline-total">
        <strong>
          {totals.map((t) => `${formatMoney(t)} ${t.currency}`).join(' · ') ||
            'No monetary totals'}
        </strong>
        <span>
          {stages.reduce((sum, s) => sum + s.count, 0)} open opportunities
        </span>
      </div>
      {totals.map((total) => (
        <div key={total.currency}>
          <span className="sr-only">
            Pipeline distribution in {total.currency}
          </span>
          <div className="pipeline-segments" aria-hidden="true">
            {stages.map((stage, i) => {
              const value = stage.totals
                .filter((t) => t.currency === total.currency)
                .reduce((sum, t) => sum + t.amount, 0);
              return value > 0 ? (
                <span
                  key={stage.id}
                  className={`segment-${i % 4}`}
                  style={{ flex: value }}
                />
              ) : null;
            })}
          </div>
        </div>
      ))}
      <div className="pipeline-list">
        {stages.map((stage, i) => (
          <button
            key={stage.id}
            disabled={!onNavigate}
            onClick={() => onNavigate?.('Sales pipeline')}
          >
            <span className={`stage-dot segment-${i % 4}`} />
            <span>{stage.stage}</span>
            <small>
              {stage.count} {stage.count === 1 ? 'deal' : 'deals'}
            </small>
            <strong>
              {stage.totals
                .map((t) => `${formatMoney(t)} ${t.currency}`)
                .join(' · ') || 'No value'}
            </strong>
          </button>
        ))}
      </div>
    </>
  );
}
export function ActivityFeed({
  activities,
}: {
  activities: readonly Activity[];
}) {
  return activities.length ? (
    <div className="activity-list">
      {activities.map((a, i) => (
        <div key={a.id}>
          <span className={`activity-dot tone-${i % 4}`} />
          <div>
            <p>{a.text}</p>
            <small>{a.timeLabel}</small>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <p className="muted">No recent activities.</p>
  );
}
export function PriorityList({
  actions,
  onNavigate,
}: {
  actions: readonly PriorityAction[];
  onNavigate?: (page: Page) => void;
}) {
  return actions.length ? (
    <>
      {actions.map((a) => (
        <div className="priority-item" key={a.id}>
          <span className="priority-symbol">
            <Icon name={a.icon} />
          </span>
          <div>
            <strong>{a.title}</strong>
            <p>{a.description}</p>
          </div>
          <button
            className="text-button"
            disabled={!onNavigate}
            onClick={() => onNavigate?.(a.target)}
          >
            Review <Icon name="arrow" size={16} />
          </button>
        </div>
      ))}
    </>
  ) : (
    <p className="muted">No priority actions.</p>
  );
}
