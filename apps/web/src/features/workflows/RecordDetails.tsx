import type { WorkflowApi } from './api';
import type { WorkRecord } from './contracts';
import { workflowLink } from './contracts';
import { useRelated } from './hooks';
import { navigate } from '../../routing/history';
export function RecordDetails({
  record,
  api,
}: {
  record: WorkRecord;
  api: WorkflowApi;
}) {
  const related = useRelated(api, record.links);
  return (
    <section className="workflow-details" aria-label="Workflow details">
      <h3>{record.label}</h3>
      <p>{record.description || 'No description.'}</p>
      {record.task ? (
        <>
          <p>
            Status: {record.task.status} · Priority: {record.task.priority}
          </p>
          <p>
            Due:{' '}
            {record.task.dueAt
              ? new Date(record.task.dueAt).toLocaleString()
              : 'No due date'}
          </p>
          <p>
            {record.task.overdue ? 'Overdue' : 'Not overdue'}
            {record.task.completedAt
              ? ' · Completed ' +
                new Date(record.task.completedAt).toLocaleString()
              : ''}
          </p>
          <p>Assignee and reminders are unavailable.</p>
        </>
      ) : (
        <p>
          {record.activity?.type} ·{' '}
          {new Date(record.activity!.occurredAt).toLocaleString()} · User
          attribution unavailable.
        </p>
      )}
      <h4>Related CRM context</h4>
      {!related.data && !related.error && (
        <p role="status">Verifying related records…</p>
      )}
      {related.error && <p role="alert">{related.error}</p>}
      <ul>
        {related.data?.map((item, index) => (
          <li key={item.field + index}>
            {item.field.replace('Id', '')}: {item.name}
          </li>
        ))}
      </ul>
      <button onClick={() => navigate(workflowLink('tasks', record.links))}>
        View related tasks
      </button>
      <button
        onClick={() => navigate(workflowLink('activities', record.links))}
      >
        View related activities
      </button>
    </section>
  );
}
