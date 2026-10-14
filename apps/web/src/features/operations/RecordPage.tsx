import { useCallback, useState } from 'react';
import { useOperations } from './hooks';
import { useLoad, useWorkflowSearch } from '../workflows/hooks';
import { WorkflowFrame, LoadState, Confirmation } from '../workflows/ui';
import { uuid, relationshipFields, workflowLink } from '../workflows/contracts';
import { object, resources, rows } from './api';
import { navigate } from '../../routing/history';
export default function RecordPage() {
  const api = useOperations(),
    search = useWorkflowSearch();
  const query = new URLSearchParams(search),
    resource = query.get('resource') || '',
    id = query.get('id') || '';
  const [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [pending, setPending] = useState<string | null | undefined>();
  const loader = useCallback(
    async (s: AbortSignal) => {
      if (
        !resources.includes(resource as (typeof resources)[number]) ||
        !uuid(id)
      )
        throw Error('Choose a valid CRM record link.');
      const r = object(await api.read('/' + resource + '/' + id, s));
      if (r.id !== id || r.archived !== false)
        throw Error('Record unavailable in this organization.');
      const members =
        resource === 'opportunities' || resource === 'tasks'
          ? await api.members(s)
          : [];
      const pipelines =
        resource === 'opportunities'
          ? rows(await api.read('/pipeline-definitions', s))
          : [];
      return { record: r, members, pipelines };
    },
    [api, resource, id],
  );
  const state = useLoad(JSON.stringify([resource, id, revision]), loader);
  const relation =
    resource === 'companies'
      ? 'companyId'
      : resource === 'contacts'
        ? 'contactId'
        : resource === 'leads'
          ? 'leadId'
          : resource === 'opportunities'
            ? 'opportunityId'
            : undefined;
  return (
    <WorkflowFrame
      title="Related CRM record"
      busy={busy}
      onRefresh={() => setRevision((v) => v + 1)}
    >
      {error && <p role="alert">{error}</p>}
      <LoadState
        error={state.error}
        loading={!state.data && !state.error}
        onRetry={() => setRevision((v) => v + 1)}
      />
      {state.data && (
        <>
          <h3>
            {String(
              state.data.record.name ||
                state.data.record.title ||
                state.data.record.subject ||
                [state.data.record.firstName, state.data.record.lastName]
                  .filter(Boolean)
                  .join(' '),
            )}
          </h3>
          <dl>
            {Object.entries(state.data.record)
              .filter(([k]) => !['id', 'archived'].includes(k))
              .map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>
                    {v === null
                      ? 'None'
                      : typeof v === 'object'
                        ? JSON.stringify(v)
                        : String(v)}
                  </dd>
                </div>
              ))}
          </dl>
          <button onClick={() => navigate(`/${resource}`)}>
            Open {resource} workspace
          </button>
          {resource === 'opportunities' && api.canWrite && (
            <section aria-label="Assign deal pipeline">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  const [pipelineId, stageKey] = String(
                    f.get('pipelineStage'),
                  ).split(':');
                  setBusy(true);
                  setError('');
                  void api
                    .write(
                      '/opportunities/' + id + '/pipeline-stage',
                      'PATCH',
                      { pipelineId, stageKey },
                    )
                    .then(() => {
                      if (api.active()) setRevision((v) => v + 1);
                    })
                    .catch((e) => {
                      if (api.active()) setError(e.message);
                    })
                    .finally(() => {
                      if (api.active()) setBusy(false);
                    });
                }}
              >
                <label>
                  Pipeline and stage
                  <select name="pipelineStage" required defaultValue="">
                    <option value="">Choose a configured stage</option>
                    {state.data.pipelines.flatMap((p) =>
                      (p.stages as { key: string; name: string }[]).map((s) => (
                        <option
                          key={p.id + ':' + s.key}
                          value={p.id + ':' + s.key}
                        >
                          {String(p.name)} · {s.name}
                        </option>
                      )),
                    )}
                  </select>
                </label>
                <p>
                  This is an explicit move into a configured pipeline. The
                  server enforces ordering and closed-state rules.
                </p>
                <button disabled={busy || !state.data.pipelines.length}>
                  Assign pipeline stage
                </button>
              </form>
              <button onClick={() => navigate('/sales-pipelines')}>
                Open configured pipelines
              </button>
            </section>
          )}
          {relation && (
            <>
              <button
                onClick={() =>
                  navigate(workflowLink('tasks', { [relation]: id }))
                }
              >
                Tasks for this record
              </button>
              <button
                onClick={() =>
                  navigate(workflowLink('activities', { [relation]: id }))
                }
              >
                Activities for this record
              </button>
              <button onClick={() => navigate(`/notes?${relation}=${id}`)}>
                Notes for this record
              </button>
            </>
          )}
          {relationshipFields
            .filter(
              (f) =>
                typeof state.data!.record[f] === 'string' &&
                uuid(String(state.data!.record[f])),
            )
            .map((f) => (
              <button
                key={f}
                onClick={() =>
                  navigate(
                    `/record-context?resource=${f === 'companyId' ? 'companies' : f === 'contactId' ? 'contacts' : f === 'leadId' ? 'leads' : 'opportunities'}&id=${state.data!.record[f]}`,
                  )
                }
              >
                Open related {f.replace('Id', '')}
              </button>
            ))}
          {(resource === 'tasks' || resource === 'opportunities') && (
            <section>
              <p>
                {resource === 'tasks' ? 'Assignee' : 'Owner'}:{' '}
                {state.data.members.find(
                  (m) =>
                    m.userId ===
                    state.data!.record[
                      resource === 'tasks' ? 'assigneeUserId' : 'ownerUserId'
                    ],
                )?.name ||
                  String(
                    state.data.record[
                      resource === 'tasks' ? 'assigneeUserId' : 'ownerUserId'
                    ] || 'Unassigned',
                  )}
              </p>
              {api.canWrite && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setPending(
                      String(new FormData(e.currentTarget).get('userId')) ||
                        null,
                    );
                  }}
                >
                  <label>
                    Assign active member
                    <select
                      name="userId"
                      defaultValue={String(
                        state.data.record[
                          resource === 'tasks'
                            ? 'assigneeUserId'
                            : 'ownerUserId'
                        ] || '',
                      )}
                    >
                      <option value="">Unassigned</option>
                      {state.data.members.map((m) => (
                        <option key={m.userId} value={m.userId}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p>
                    Inactive assignments are retained for history; select an
                    active member to reassign or clear them.
                  </p>
                  <button disabled={busy}>Save assignment</button>
                </form>
              )}
            </section>
          )}
        </>
      )}
      {pending !== undefined && (
        <Confirmation
          message="Confirm this assignment change?"
          onCancel={() => setPending(undefined)}
          onConfirm={() => {
            const userId = pending;
            setPending(undefined);
            setBusy(true);
            setError('');
            void api
              .assign(resource as 'tasks' | 'opportunities', id, userId)
              .then(() => {
                if (api.active()) setRevision((v) => v + 1);
              })
              .catch((e) => {
                if (api.active()) setError(e.message);
              })
              .finally(() => {
                if (api.active()) setBusy(false);
              });
          }}
        />
      )}
    </WorkflowFrame>
  );
}
