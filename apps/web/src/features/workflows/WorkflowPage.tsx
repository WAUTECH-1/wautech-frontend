import { useCallback, useState } from 'react';
import { useLoad, useWorkflowApi, useWorkflowSearch } from './hooks';
import {
  activityTypes,
  priorities,
  taskStatuses,
  relationshipFields,
  transitions,
  workflowLink,
} from './contracts';
import type { Kind, WorkRecord, Input, Filters } from './contracts';
import { RecordForm } from './RecordForm';
import { RecordDetails } from './RecordDetails';
import { WorkflowFrame, LoadState, Confirmation } from './ui';
import { navigate } from '../../routing/history';
export default function WorkflowPage({ kind }: { kind: Kind }) {
  const api = useWorkflowApi(),
    search = useWorkflowSearch();
  const params = new URLSearchParams(search);
  const target = new URLSearchParams(search).get('id') ?? '';
  const [revision, setRevision] = useState(0),
    [filters, setFilters] = useState<Filters>({
      sortBy: kind === 'tasks' ? 'dueAt' : 'occurredAt',
      sortDirection: kind === 'tasks' ? 'asc' : 'desc',
    }),
    [view, setView] = useState('all');
  const [form, setForm] = useState<{ record?: WorkRecord }>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [page, setPage] = useState(1);
  const [pending, setPending] = useState<{
    message: string;
    action: () => Promise<unknown>;
  }>();
  const loader = useCallback(
    async (signal: AbortSignal) => {
      if (target)
        return { detail: await api.get(kind, target, signal), rows: [] };
      const links = Object.fromEntries(
        relationshipFields
          .filter((field) => new URLSearchParams(search).get(field))
          .map((field) => [field, new URLSearchParams(search).get(field)!]),
      );
      const query = { ...filters, ...links };
      if (kind === 'tasks' && view === 'overdue') query.overdue = 'true';
      if (kind === 'tasks' && view === 'upcoming') {
        query.dueAfter = new Date().toISOString();
        query.dueBefore = new Date(Date.now() + 7 * 86400000).toISOString();
      }
      const rows = await api.list(kind, query, signal);
      return {
        rows:
          kind === 'tasks' && view === 'upcoming'
            ? rows.filter(
                (row) =>
                  row.task?.status === 'OPEN' ||
                  row.task?.status === 'IN_PROGRESS',
              )
            : rows,
      };
    },
    [api, kind, filters, view, target, search],
  );
  const data = useLoad(
    JSON.stringify([kind, filters, view, target, search, revision]),
    loader,
  );
  const refresh = () => {
    setRevision((v) => v + 1);
    setPage(1);
  };
  async function perform(action: () => Promise<unknown>) {
    setPending(undefined);
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      if (api.active()) {
        setNotice('Workflow action confirmed.');
        refresh();
      }
    } catch (e) {
      if (api.active())
        setError(e instanceof Error ? e.message : 'Workflow action failed.');
    } finally {
      if (api.active()) setBusy(false);
    }
  }
  async function save(input: Input) {
    setBusy(true);
    setError('');
    try {
      const saved = await api.save(kind, input, form?.record?.id);
      if (api.active()) {
        setForm(undefined);
        setNotice('Workflow saved.');
        navigate(workflowLink(kind, {}, saved.id), true);
        refresh();
      }
    } finally {
      if (api.active()) setBusy(false);
    }
  }
  const detail = data.data?.detail;
  return (
    <WorkflowFrame
      title={kind === 'tasks' ? 'Task management' : 'Activity management'}
      busy={busy}
      onRefresh={refresh}
    >
      {!api.canWrite && (
        <p role="status">
          VIEWER/read-only membership: creating, editing, status changes and
          archiving are unavailable.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!form && api.canWrite && (
        <button disabled={busy} onClick={() => setForm({})}>
          Create {kind === 'tasks' ? 'task' : 'activity'}
        </button>
      )}
      {form && (
        <RecordForm
          key={form.record?.id || 'new'}
          kind={kind}
          record={form.record}
          api={api}
          busy={busy}
          onSave={save}
          onCancel={() => setForm(undefined)}
        />
      )}
      {!form && (
        <>
          <LoadState
            error={data.error}
            loading={!data.data && !data.error}
            onRetry={refresh}
          />
          {target && (
            <button onClick={() => navigate(`/${kind}`)}>Back to {kind}</button>
          )}
          {detail ? (
            <>
              <RecordDetails record={detail} api={api} />
              {api.canWrite && (
                <div className="workflow-actions">
                  <button
                    disabled={busy}
                    onClick={() => setForm({ record: detail })}
                  >
                    Edit workflow
                  </button>
                  {detail.task &&
                    transitions[detail.task.status].map((status) => (
                      <button
                        key={status}
                        disabled={busy}
                        onClick={() =>
                          setPending({
                            message: `Change ${detail.label} from ${detail.task!.status} to ${status}?`,
                            action: () => api.status(detail, status),
                          })
                        }
                      >
                        {status === 'COMPLETED'
                          ? 'Complete task'
                          : status === 'OPEN'
                            ? 'Reopen task'
                            : status === 'CANCELLED'
                              ? 'Cancel task'
                              : 'Start task'}
                      </button>
                    ))}
                  <button
                    disabled={busy}
                    onClick={() =>
                      setPending({
                        message: `Archive ${detail.label}? It will be removed from active workflows.`,
                        action: async () => {
                          await api.archive(kind, detail.id);
                          navigate(`/${kind}`);
                        },
                      })
                    }
                  >
                    Archive workflow
                  </button>
                </div>
              )}
            </>
          ) : (
            !target && (
              <>
                <form
                  className="workflow-filters"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const fields = new FormData(event.currentTarget);
                    setFilters({
                      search: String(fields.get('search') || ''),
                      status: String(fields.get('status') || ''),
                      priority: String(fields.get('priority') || ''),
                      type: String(fields.get('type') || ''),
                      sortBy: String(fields.get('sortBy')),
                      sortDirection: String(fields.get('direction')),
                    });
                    setView(String(fields.get('view') || 'all'));
                    setPage(1);
                  }}
                >
                  <label>
                    Search {kind}
                    <input
                      name="search"
                      type="search"
                      maxLength={200}
                      defaultValue={filters.search || ''}
                    />
                  </label>
                  {kind === 'tasks' ? (
                    <>
                      <label>
                        Task status
                        <select
                          name="status"
                          defaultValue={filters.status || ''}
                        >
                          <option value="">All statuses</option>
                          {taskStatuses.map((value) => (
                            <option key={value}>{value}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Task priority
                        <select
                          name="priority"
                          defaultValue={filters.priority || ''}
                        >
                          <option value="">All priorities</option>
                          {priorities.map((value) => (
                            <option key={value}>{value}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Due view
                        <select name="view" defaultValue={view}>
                          <option value="all">All tasks</option>
                          <option value="overdue">Overdue</option>
                          <option value="upcoming">Upcoming seven days</option>
                        </select>
                      </label>
                    </>
                  ) : (
                    <label>
                      Activity type filter
                      <select name="type" defaultValue={filters.type || ''}>
                        <option value="">All types</option>
                        {activityTypes.map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label>
                    Sort workflows by
                    <select name="sortBy" defaultValue={filters.sortBy}>
                      {(kind === 'tasks'
                        ? ['dueAt', 'priority', 'status', 'title', 'createdAt']
                        : ['occurredAt', 'type', 'subject', 'createdAt']
                      ).map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Sort direction
                    <select
                      name="direction"
                      defaultValue={filters.sortDirection}
                    >
                      <option value="asc">Ascending</option>
                      <option value="desc">Descending</option>
                    </select>
                  </label>
                  <button>Apply workflow filters</button>
                </form>
                {relationshipFields.some((field) => params.get(field)) && (
                  <p>
                    Showing workflows for the related record IDs in this link.{' '}
                    <button onClick={() => navigate(`/${kind}`)}>
                      Clear relationship filters
                    </button>
                  </p>
                )}
                {data.data &&
                  (data.data.rows.length ? (
                    <>
                      <p>
                        {data.data.rows.length} matching {kind} · Page {page}
                      </p>
                      <ul className="workflow-records">
                        {data.data.rows
                          .slice((page - 1) * 25, page * 25)
                          .map((row) => (
                            <li key={row.id}>
                              <button
                                onClick={() =>
                                  navigate(workflowLink(kind, {}, row.id))
                                }
                              >
                                {row.label}
                              </button>
                              <p>
                                {row.task
                                  ? `${row.task.status} · ${row.task.priority}${row.task.overdue ? ' · Overdue' : ''}`
                                  : `${row.activity!.type} · ${new Date(row.activity!.occurredAt).toLocaleString()}`}
                              </p>
                              {row.task?.dueAt && (
                                <p>
                                  Due{' '}
                                  {new Date(row.task.dueAt).toLocaleString()}
                                </p>
                              )}
                            </li>
                          ))}
                      </ul>
                      <div className="workflow-actions">
                        <button
                          disabled={page <= 1}
                          onClick={() => setPage((v) => v - 1)}
                        >
                          Previous workflows
                        </button>
                        <button
                          disabled={page * 25 >= data.data.rows.length}
                          onClick={() => setPage((v) => v + 1)}
                        >
                          Next workflows
                        </button>
                      </div>
                    </>
                  ) : (
                    <p>No {kind} match the current filters.</p>
                  ))}
              </>
            )
          )}
        </>
      )}
      {pending && (
        <Confirmation
          message={pending.message}
          onCancel={() => setPending(undefined)}
          onConfirm={() => void perform(pending.action)}
        />
      )}
    </WorkflowFrame>
  );
}
