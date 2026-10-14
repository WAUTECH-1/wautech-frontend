import { useCallback, useState } from 'react';
import { useOperations } from '../operations/hooks';
import { useLoad, useWorkflowSearch } from '../workflows/hooks';
import { WorkflowFrame, LoadState, Confirmation } from '../workflows/ui';
import { object } from '../operations/api';
import { uuid } from '../workflows/contracts';
import { navigate } from '../../routing/history';
import { goal, goalInput } from './api';
import type { Goal, GoalInput, Milestone } from './api';
import './business.css';
const blank: GoalInput = {
  version: 0,
  title: '',
  description: null,
  dueDate: null,
  status: 'ACTIVE',
  milestones: [],
};
function GoalForm({
  initial,
  busy,
  onSave,
  onCancel,
}: {
  initial: GoalInput;
  busy: boolean;
  onSave: (value: GoalInput) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  function milestone(index: number, field: string, value: unknown) {
    setDraft((d) => ({
      ...d,
      milestones: d.milestones.map((m, i) =>
        i === index ? { ...m, [field]: value } : m,
      ),
    }));
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(draft);
      }}
    >
      <fieldset disabled={busy}>
        <legend>
          {draft.version ? 'Correct this goal' : 'Create a reviewed goal'}
        </legend>
        <label>
          Goal title
          <input
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            required
            maxLength={200}
          />
        </label>
        <label>
          Why this goal matters (optional)
          <textarea
            value={draft.description || ''}
            onChange={(e) =>
              setDraft((d) => ({ ...d, description: e.target.value || null }))
            }
            maxLength={2000}
          />
        </label>
        <label>
          Target date (optional)
          <input
            type="date"
            value={draft.dueDate || ''}
            min="1900-01-01"
            max="9998-12-31"
            onChange={(e) =>
              setDraft((d) => ({ ...d, dueDate: e.target.value || null }))
            }
          />
        </label>
        <label>
          Goal state
          <select
            value={draft.status}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                status: e.target.value as Goal['status'],
              }))
            }
          >
            <option>ACTIVE</option>
            <option>COMPLETED</option>
            <option>CANCELLED</option>
          </select>
        </label>
        <p>
          Milestone completion is your declared progress. Linked task status is
          shown separately; changing this plan does not complete CRM tasks.
        </p>
        {draft.milestones.map((m, i) => (
          <div className="milestone-row" key={m.id || i}>
            <label>
              Milestone {i + 1}
              <input
                value={m.title}
                required
                maxLength={200}
                onChange={(e) => milestone(i, 'title', e.target.value)}
              />
            </label>
            <label>
              Milestone target (optional)
              <input
                type="date"
                min="1900-01-01"
                max="9998-12-31"
                value={m.dueDate || ''}
                onChange={(e) =>
                  milestone(i, 'dueDate', e.target.value || null)
                }
              />
            </label>
            <label className="business-check">
              <input
                type="checkbox"
                checked={m.completed}
                onChange={(e) => milestone(i, 'completed', e.target.checked)}
              />
              Milestone complete
            </label>
            <label>
              Link an existing CRM task ID (optional)
              <input
                maxLength={36}
                value={m.taskId || ''}
                onChange={(e) => milestone(i, 'taskId', e.target.value || null)}
              />
            </label>
            <button
              type="button"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  milestones: d.milestones.filter((_, index) => index !== i),
                }))
              }
            >
              Remove milestone {i + 1} from plan
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={draft.milestones.length >= 20}
          onClick={() =>
            setDraft((d) => ({
              ...d,
              milestones: [
                ...d.milestones,
                { title: '', dueDate: null, completed: false, taskId: null },
              ],
            }))
          }
        >
          Add milestone
        </button>
        <p>
          Goals and plans are shared with organization members. AI suggestions
          are hypotheses: review their evidence and edit before saving.
        </p>
        <button>Review goal before saving</button>
        <button type="button" onClick={onCancel}>
          Cancel goal edit
        </button>
      </fieldset>
    </form>
  );
}
function TaskForm({
  milestone,
  busy,
  onPreview,
  onCancel,
}: {
  milestone: Milestone;
  busy: boolean;
  onPreview: (request: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget),
          parent = String(d.get('parent')),
          id = String(d.get('parentId')),
          time = String(d.get('dueAt') || '');
        onPreview({
          companyId: parent === 'companyId' ? id : null,
          contactId: parent === 'contactId' ? id : null,
          leadId: parent === 'leadId' ? id : null,
          opportunityId: parent === 'opportunityId' ? id : null,
          title: String(d.get('title')),
          description: String(d.get('description') || '') || null,
          priority: String(d.get('priority')),
          dueAt: time ? new Date(time).toISOString() : null,
        });
      }}
    >
      <fieldset disabled={busy}>
        <legend>Prepare a task for {milestone.title}</legend>
        <label>
          Task title
          <input
            name="title"
            defaultValue={milestone.title}
            maxLength={200}
            required
          />
        </label>
        <label>
          Task description (optional)
          <textarea name="description" maxLength={10000} />
        </label>
        <label>
          CRM parent type
          <select name="parent">
            <option value="companyId">Company</option>
            <option value="contactId">Contact</option>
            <option value="leadId">Lead</option>
            <option value="opportunityId">Opportunity</option>
          </select>
        </label>
        <label>
          CRM parent ID
          <input name="parentId" required maxLength={36} />
        </label>
        <label>
          Priority
          <select name="priority">
            <option>NORMAL</option>
            <option>LOW</option>
            <option>HIGH</option>
            <option>URGENT</option>
          </select>
        </label>
        <label>
          Due at (your local time, optional)
          <input name="dueAt" type="datetime-local" />
        </label>
        <p>
          This form creates nothing until you review the server preview and
          confirm. The goal is a planning record, not a CRM parent.
        </p>
        <button>Review task preview</button>
        <button type="button" onClick={onCancel}>
          Cancel task draft
        </button>
      </fieldset>
    </form>
  );
}
export default function Goals() {
  const api = useOperations(),
    search = useWorkflowSearch(),
    [revision, setRevision] = useState(0);
  const loader = useCallback(
    async (signal: AbortSignal) => {
      const p = new URLSearchParams(search),
        selected = p.get('id'),
        index = Number(p.get('page') || 0);
      if (selected && !uuid(selected)) throw Error('Invalid goal ID.');
      const raw = object(
        await api.read(
          '/business/goals?' +
            new URLSearchParams({
              page: String(index),
              search: p.get('search') || '',
            }),
          signal,
        ),
      );
      if (
        !Array.isArray(raw.content) ||
        raw.content.length > 25 ||
        !Number.isSafeInteger(raw.totalElements) ||
        !Number.isSafeInteger(raw.totalPages)
      )
        throw Error('Invalid goal collection.');
      return {
        content: raw.content.map(goal),
        totalElements: Number(raw.totalElements),
        totalPages: Number(raw.totalPages),
        page: index,
        selected: selected
          ? goal(await api.read('/business/goals/' + selected, signal))
          : null,
      };
    },
    [api, search],
  );
  const state = useLoad(search + ':' + revision, loader);
  const [creating, setCreating] = useState(false),
    [pendingGoal, setPendingGoal] = useState<GoalInput | null>(null),
    [deleting, setDeleting] = useState<Goal | null>(null);
  const [taskFor, setTaskFor] = useState<{
    goal: Goal;
    milestone: Milestone;
  } | null>(null);
  const [preview, setPreview] = useState<{
    token: string;
    request: Record<string, unknown>;
    expiresAt: string;
  } | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function save() {
    if (!pendingGoal) return;
    setBusy(true);
    setError('');
    try {
      for (const m of pendingGoal.milestones)
        if (m.taskId && !uuid(m.taskId))
          throw Error('Use a valid linked task ID.');
      const current = state.data?.selected;
      const saved = goal(
        await api.write(
          '/business/goals' + (current ? '/' + current.id : ''),
          current ? 'PUT' : 'POST',
          pendingGoal,
        ),
      );
      if (api.active()) {
        setPendingGoal(null);
        setCreating(false);
        setRevision((v) => v + 1);
        navigate(`/business-goals?id=${saved.id}`);
      }
    } catch (e) {
      if (api.active())
        setError(e instanceof Error ? e.message : 'Could not save goal.');
    } finally {
      if (api.active()) setBusy(false);
    }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    setError('');
    try {
      await api.write(
        '/business/goals/' + deleting.id + '?version=' + deleting.version,
        'DELETE',
      );
      if (api.active()) {
        setDeleting(null);
        setTaskFor(null);
        setPreview(null);
        setCreating(false);
        navigate('/business-goals');
        setRevision((v) => v + 1);
      }
    } catch (e) {
      if (api.active())
        setError(e instanceof Error ? e.message : 'Could not delete goal.');
    } finally {
      if (api.active()) setBusy(false);
    }
  }
  async function taskPreview(request: Record<string, unknown>) {
    if (!taskFor) return;
    setBusy(true);
    setError('');
    try {
      const parent = Object.values({
        company: request.companyId,
        contact: request.contactId,
        lead: request.leadId,
        opportunity: request.opportunityId,
      }).find(Boolean);
      if (typeof parent !== 'string' || !uuid(parent))
        throw Error('Use a valid CRM parent ID.');
      const result = object(
        await api.write(
          '/business/goals/' +
            taskFor.goal.id +
            '/milestones/' +
            taskFor.milestone.id +
            '/task-preview',
          'POST',
          { version: taskFor.goal.version, request },
        ),
      );
      if (
        typeof result.token !== 'string' ||
        !uuid(result.token) ||
        typeof result.expiresAt !== 'string'
      )
        throw Error('Invalid task preview.');
      if (api.active())
        setPreview({
          token: result.token,
          request: object(result.request),
          expiresAt: result.expiresAt,
        });
    } catch (e) {
      if (api.active())
        setError(e instanceof Error ? e.message : 'Task preview unavailable.');
    } finally {
      if (api.active()) setBusy(false);
    }
  }
  async function confirmTask() {
    if (!preview) return;
    setBusy(true);
    setError('');
    try {
      await api.write('/business/task-confirmation', 'POST', {
        token: preview.token,
      });
      if (api.active()) {
        setPreview(null);
        setTaskFor(null);
        setRevision((v) => v + 1);
      }
    } catch (e) {
      if (api.active()) {
        setPreview(null);
        setError(
          e instanceof Error
            ? e.message
            : 'Confirmation failed. Refresh goal before making another preview.',
        );
      }
    } finally {
      if (api.active()) setBusy(false);
    }
  }
  const selected = state.data?.selected;
  return (
    <WorkflowFrame
      title="Goals into action"
      busy={busy}
      onRefresh={() => {
        setTaskFor(null);
        setRevision((v) => v + 1);
      }}
    >
      <div className="business-content">
        <p>
          Persisted organization goals, reviewable milestones and actual CRM
          task links. Progress is declared milestone completion, not a
          prediction of business success.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigate(
              `/business-goals?search=${encodeURIComponent(String(new FormData(e.currentTarget).get('search') || ''))}`,
            );
          }}
        >
          <label>
            Search goals
            <input
              name="search"
              type="search"
              maxLength={200}
              defaultValue={new URLSearchParams(search).get('search') || ''}
            />
          </label>
          <button>Search goals</button>
        </form>
        <LoadState
          error={state.error}
          loading={!state.data && !state.error}
          onRetry={() => setRevision((v) => v + 1)}
        />
        {error && <p role="alert">{error}</p>}
        {!api.canWrite && (
          <p role="status">
            Read-only membership: goals and task links are visible; planning and
            task creation require write permission.
          </p>
        )}
        <div className="business-actions">
          <button
            disabled={busy || !api.canWrite}
            onClick={() => {
              navigate('/business-goals');
              setCreating(true);
            }}
          >
            New goal
          </button>
          <button onClick={() => navigate('/assistant')}>
            Review business advisor suggestions
          </button>
        </div>
        {(creating || selected) && api.canWrite && (
          <GoalForm
            key={selected ? selected.id + ':' + selected.version : 'new'}
            initial={selected ? goalInput(selected) : blank}
            busy={busy}
            onSave={setPendingGoal}
            onCancel={() => {
              setCreating(false);
              navigate('/business-goals');
            }}
          />
        )}
        {taskFor && (
          <TaskForm
            key={taskFor.milestone.id}
            milestone={taskFor.milestone}
            busy={busy}
            onPreview={(request) => void taskPreview(request)}
            onCancel={() => setTaskFor(null)}
          />
        )}
        {state.data && (
          <>
            <p>
              {state.data.totalElements} goals · This page shows{' '}
              {state.data.content.length} of them.
            </p>
            {(selected ? [selected] : state.data.content).map((g) => (
              <article key={g.id}>
                <h3>{g.title}</h3>
                <p>{g.description}</p>
                <p>
                  {g.status} · Target: {g.dueDate || 'Not set'}
                </p>
                <p>
                  {g.milestones.length
                    ? g.milestones.filter((m) => m.completed).length +
                      ' of ' +
                      g.milestones.length +
                      ' milestones complete'
                    : 'No milestones yet'}
                </p>
                {g.milestones.map((m) => (
                  <section key={m.id}>
                    <h4>{m.title}</h4>
                    <p>
                      {m.completed ? 'Milestone complete' : 'Milestone pending'}{' '}
                      · Target: {m.dueDate || 'Not set'}
                    </p>
                    {m.taskId ? (
                      <>
                        <p>
                          Linked task:{' '}
                          {m.taskStatus || 'Archived or unavailable'}{' '}
                          (independent of milestone progress)
                        </p>
                        <button
                          disabled={!m.taskStatus}
                          onClick={() =>
                            navigate(
                              `/record-context?resource=tasks&id=${m.taskId}`,
                            )
                          }
                        >
                          Open linked CRM task
                        </button>
                      </>
                    ) : (
                      <button
                        disabled={
                          busy || !api.canWrite || g.status !== 'ACTIVE'
                        }
                        onClick={() => setTaskFor({ goal: g, milestone: m })}
                      >
                        Prepare task for this milestone
                      </button>
                    )}
                  </section>
                ))}
                <button
                  onClick={() => {
                    setCreating(false);
                    navigate(`/business-goals?id=${g.id}`);
                  }}
                >
                  View or correct goal
                </button>
                <button
                  disabled={busy || !api.canWrite}
                  onClick={() => setDeleting(g)}
                >
                  Delete goal and planning links
                </button>
              </article>
            ))}
            {!state.data.totalElements && (
              <p>
                No goals saved. Start with one outcome and a reviewable
                milestone.
              </p>
            )}
            <div className="business-actions">
              <button
                disabled={busy || state.data.page === 0}
                onClick={() =>
                  navigate(
                    `/business-goals?page=${state.data!.page - 1}&search=${encodeURIComponent(new URLSearchParams(search).get('search') || '')}`,
                  )
                }
              >
                Previous goals
              </button>
              <button
                disabled={busy || state.data.page + 1 >= state.data.totalPages}
                onClick={() =>
                  navigate(
                    `/business-goals?page=${state.data!.page + 1}&search=${encodeURIComponent(new URLSearchParams(search).get('search') || '')}`,
                  )
                }
              >
                Next goals
              </button>
            </div>
          </>
        )}
        {pendingGoal && (
          <Confirmation
            message={`Save this organization-visible ${pendingGoal.status} goal: ${pendingGoal.title}; target ${pendingGoal.dueDate || 'not set'}; milestones: ${pendingGoal.milestones.map((m) => m.title + (m.completed ? ' (complete)' : ' (pending)') + (m.taskId ? ' linked to ' + m.taskId : '')).join('; ') || 'none'}? CRM tasks will not be changed.`}
            onCancel={() => setPendingGoal(null)}
            onConfirm={() => void save()}
          />
        )}
        {deleting && (
          <Confirmation
            message={
              'Delete ' +
              deleting.title +
              ' and its milestones/planning links? Existing CRM tasks remain. This planning deletion cannot be undone.'
            }
            onCancel={() => setDeleting(null)}
            onConfirm={() => void remove()}
          />
        )}
        {preview && (
          <Confirmation
            message={`Create exactly this server-previewed CRM task: ${String(preview.request.title)}; priority ${String(preview.request.priority || 'NORMAL')}; UTC due ${String(preview.request.dueAt || 'not set')}; parent ${String(preview.request.companyId || preview.request.contactId || preview.request.leadId || preview.request.opportunityId)}. Preview expires ${preview.expiresAt}. It will link to the selected milestone.`}
            onCancel={() => setPreview(null)}
            onConfirm={() => void confirmTask()}
          />
        )}
      </div>
    </WorkflowFrame>
  );
}
