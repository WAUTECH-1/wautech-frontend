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
  const [pendingStage, setPendingStage] = useState<{
    pipelineId: string;
    stageKey: string;
    label: string;
  }>();
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
              .filter(
                ([k]) =>
                  ![
                    'id',
                    'archived',
                    'assigneeUserId',
                    'ownerUserId',
                    'companyId',
                    'contactId',
                    'leadId',
                    'opportunityId',
                    'pipelineId',
                    'pipelineStageKey',
                  ].includes(k),
              )
              .map(([k, v]) => (
                <div key={k}>
                  <dt>
                    {k
                      .replace(/([a-z])([A-Z])/g, '$1 $2')
                      .replace(/^./, (s) => s.toUpperCase())}
                  </dt>
                  <dd>
                    {v === null
                      ? 'None'
                      : typeof v === 'object'
                        ? JSON.stringify(v)
                        : typeof v === 'boolean'
                          ? v
                            ? 'Yes'
                            : 'No'
                          : k.endsWith('At') &&
                              typeof v === 'string' &&
                              Number.isFinite(Date.parse(v))
                            ? new Date(v).toLocaleString()
                            : String(v).replaceAll('_', ' ')}
                  </dd>
                </div>
              ))}
          </dl>
          <button onClick={() => navigate(`/${resource}`)}>
            Open {resource} workspace
          </button>
          {resource === 'opportunities' &&
            typeof state.data.record.pipelineId === 'string' && (
              <p>
                Configured pipeline:{' '}
                {String(
                  state.data.pipelines.find(
                    (p) => p.id === state.data!.record.pipelineId,
                  )?.name || 'Unavailable',
                )}{' '}
                ·{' '}
                {String(
                  (
                    state.data.pipelines.find(
                      (p) => p.id === state.data!.record.pipelineId,
                    )?.stages as { key: string; name: string }[] | undefined
                  )?.find((s) => s.key === state.data!.record.pipelineStageKey)
                    ?.name ||
                    state.data.record.pipelineStageKey ||
                    'Unavailable',
                )}
              </p>
            )}
          {resource === 'opportunities' && api.canWrite && (
            <section aria-label="Assign deal pipeline">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  const [pipelineId, stageKey] = String(
                    f.get('pipelineStage'),
                  ).split(':');
                  const selected =
                    e.currentTarget.querySelector<HTMLSelectElement>(
                      '[name=pipelineStage]',
                    );
                  setPendingStage({
                    pipelineId,
                    stageKey,
                    label:
                      selected?.selectedOptions[0]?.textContent || stageKey,
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
      {pendingStage && (
        <Confirmation
          message={`Move this opportunity to ${pendingStage.label}? Closed stages are terminal.`}
          onCancel={() => setPendingStage(undefined)}
          onConfirm={() => {
            const move = pendingStage;
            setPendingStage(undefined);
            setBusy(true);
            setError('');
            void api
              .write('/opportunities/' + id + '/pipeline-stage', 'PATCH', {
                pipelineId: move.pipelineId,
                stageKey: move.stageKey,
              })
              .then((value) => {
                const result = object(value);
                if (
                  result.id !== id ||
                  result.pipelineId !== move.pipelineId ||
                  result.pipelineStageKey !== move.stageKey
                )
                  throw Error(
                    'Stage change was not confirmed. Refresh the record before retrying.',
                  );
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
