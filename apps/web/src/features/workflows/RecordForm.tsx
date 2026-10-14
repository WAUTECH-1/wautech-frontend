import { useCallback, useEffect, useState, useId } from 'react';
import type { WorkflowApi } from './api';
import {
  activityTypes,
  priorities,
  relationshipFields,
  emptyLinks,
  instant,
  validateInput,
} from './contracts';
import type { Kind, WorkRecord, Input, Links } from './contracts';
import { useLoad } from './hooks';
import { addNavigationGuard } from '../../routing/history';
function localDate(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, -1);
}
export function RecordForm({
  kind,
  record,
  initialLinks,
  api,
  busy,
  onSave,
  onCancel,
}: {
  kind: Kind;
  record?: WorkRecord;
  initialLinks?: Links;
  api: WorkflowApi;
  busy: boolean;
  onSave: (input: Input) => Promise<void>;
  onCancel: () => void;
}) {
  const token = useId();
  const [dirty, setDirty] = useState(false),
    [error, setError] = useState('');
  const loader = useCallback(
    (signal: AbortSignal) => api.suggestions(signal),
    [api],
  );
  const suggestions = useLoad('suggestions', loader);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', unload);
    const remove = addNavigationGuard(() =>
      window.confirm('Discard unsaved workflow changes?'),
    );
    return () => {
      remove();
      window.removeEventListener('beforeunload', unload);
    };
  }, [dirty]);
  const links = record?.links || initialLinks || emptyLinks();
  return (
    <form
      className="workflow-form"
      onInput={() => setDirty(true)}
      onSubmit={(event) => {
        event.preventDefault();
        setError('');
        const fields = new FormData(event.currentTarget);
        try {
          const related = Object.fromEntries(
            relationshipFields.map((field) => [
              field,
              String(fields.get(field) || '').trim() || null,
            ]),
          ) as Links;
          const common = {
            ...related,
            description: String(fields.get('description') || '').trim() || null,
          };
          const input: Input =
            kind === 'tasks'
              ? {
                  ...common,
                  title: String(fields.get('label') || '').trim(),
                  priority: String(
                    fields.get('priority'),
                  ) as (typeof priorities)[number],
                  dueAt: instant(String(fields.get('date') || '')),
                }
              : {
                  ...common,
                  subject: String(fields.get('label') || '').trim(),
                  type: String(
                    fields.get('type'),
                  ) as (typeof activityTypes)[number],
                  occurredAt: instant(String(fields.get('date') || ''), true)!,
                };
          validateInput(kind, input);
          void onSave(input)
            .then(() => setDirty(false))
            .catch((e) =>
              setError(
                e instanceof Error ? e.message : 'Unable to save workflow.',
              ),
            );
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Check entered values.');
        }
      }}
    >
      <h3>
        {record ? 'Edit' : 'Create'} {kind === 'tasks' ? 'task' : 'activity'}
      </h3>
      {error && <p role="alert">{error}</p>}
      <fieldset disabled={busy}>
        <label>
          {kind === 'tasks' ? 'Task title' : 'Activity subject'}
          <input
            name="label"
            required
            maxLength={200}
            defaultValue={record?.label || ''}
          />
        </label>
        <label>
          Description
          <textarea
            name="description"
            maxLength={10000}
            defaultValue={record?.description || ''}
          />
        </label>
        {kind === 'tasks' ? (
          <label>
            Priority
            <select
              name="priority"
              defaultValue={record?.task?.priority || 'NORMAL'}
            >
              {priorities.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        ) : (
          <label>
            Activity type
            <select name="type" defaultValue={record?.activity?.type || 'NOTE'}>
              {activityTypes.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        )}
        <label>
          {kind === 'tasks'
            ? 'Due date and time (local)'
            : 'Activity date and time (local)'}
          <input
            name="date"
            type="datetime-local"
            step="0.001"
            required={kind === 'activities'}
            defaultValue={localDate(
              record?.task?.dueAt ||
                record?.activity?.occurredAt ||
                (kind === 'activities' ? new Date().toISOString() : null),
            )}
          />
        </label>
        <p>
          At least one CRM association is required. Select a suggestion or enter
          an existing record ID. Every chosen record is revalidated with the
          server before saving.
        </p>
        {relationshipFields.map((field) => (
          <label key={field}>
            Related {field.replace('Id', '')} ID
            <input
              name={field}
              aria-label={`Related ${field.replace('Id', '')} ID`}
              list={token + field}
              maxLength={36}
              pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
              defaultValue={links[field] || ''}
            />
            <datalist id={token + field}>
              {suggestions.data?.[field].map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </datalist>
          </label>
        ))}
        <p>
          Suggestions show up to 500 records per resource. Save a task, then use
          Manage task assignment. Check your due-task reminders from
          Notifications.
        </p>
        <div className="workflow-actions">
          <button
            type="button"
            onClick={() => {
              if (!dirty || window.confirm('Discard unsaved workflow changes?'))
                onCancel();
            }}
          >
            Cancel editing
          </button>
          <button type="submit">{busy ? 'Saving…' : 'Save workflow'}</button>
        </div>
      </fieldset>
    </form>
  );
}
