import { useCallback, useState } from 'react';
import { useOperations } from './hooks';
import { useLoad } from '../workflows/hooks';
import { WorkflowFrame, LoadState, Confirmation } from '../workflows/ui';
import { object, rows, page } from './api';
import type { Row } from './api';
import { navigate } from '../../routing/history';
import { useUnsaved } from '../platform/useUnsaved';
interface Stage {
  key: string;
  name: string;
  outcome: 'OPEN' | 'WON' | 'LOST';
}
interface Pipeline {
  id: string;
  name: string;
  stages: Stage[];
}
const startingStages: Stage[] = [
  { key: 'new', name: 'New', outcome: 'OPEN' },
  { key: 'won', name: 'Won', outcome: 'WON' },
  { key: 'lost', name: 'Lost', outcome: 'LOST' },
];
function parsePipelines(value: unknown): Pipeline[] {
  return rows(value).map((r) => {
    if (
      typeof r.name !== 'string' ||
      !Array.isArray(r.stages) ||
      r.stages.length < 3 ||
      r.stages.length > 30
    )
      throw Error('Invalid pipeline definition.');
    const stages = r.stages.map((v) => {
      const s = object(v);
      if (
        typeof s.key !== 'string' ||
        typeof s.name !== 'string' ||
        !['OPEN', 'WON', 'LOST'].includes(String(s.outcome))
      )
        throw Error('Invalid pipeline stage.');
      return s as unknown as Stage;
    });
    if (new Set(stages.map((s) => s.key)).size !== stages.length)
      throw Error('Duplicate stages.');
    return { id: r.id, name: r.name, stages };
  });
}
export default function PipelinesPage() {
  const api = useOperations();
  const [revision, setRevision] = useState(0),
    [selected, setSelected] = useState(''),
    [currentPage, setPage] = useState(0),
    [editor, setEditor] = useState<{
      id?: string;
      name: string;
      stages: Stage[];
    }>(),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [pending, setPending] = useState<() => Promise<unknown>>();
  useUnsaved(dirty);
  const loader = useCallback(
    async (s: AbortSignal) =>
      parsePipelines(await api.read('/pipeline-definitions', s)),
    [api],
  );
  const state = useLoad(String(revision), loader);
  const definition = state.data?.find((p) => p.id === selected);
  const dealLoader = useCallback(
    async (s: AbortSignal) =>
      selected
        ? page(
            await api.read(
              '/records/opportunities?' +
                new URLSearchParams({
                  pipelineId: selected,
                  page: String(currentPage),
                  size: '50',
                  sortBy: 'updatedAt',
                  sortDirection: 'desc',
                }),
              s,
            ),
            (r) => object(r) as Row,
          )
        : undefined,
    [api, selected, currentPage],
  );
  const deals = useLoad(
    JSON.stringify([selected, currentPage, revision]),
    dealLoader,
  );
  async function action(work: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await work();
      if (api.active()) {
        setEditor(undefined);
        setDirty(false);
        setRevision((v) => v + 1);
      }
    } catch (e) {
      if (api.active())
        setError(e instanceof Error ? e.message : 'Pipeline change failed.');
    } finally {
      if (api.active()) setBusy(false);
    }
  }
  function change(index: number, patch: Partial<Stage>) {
    setDirty(true);
    setEditor((v) =>
      v
        ? {
            ...v,
            stages: v.stages.map((s, i) =>
              i === index ? { ...s, ...patch } : s,
            ),
          }
        : v,
    );
  }
  return (
    <WorkflowFrame
      title="Configured sales pipelines"
      busy={busy}
      onRefresh={() => setRevision((v) => v + 1)}
    >
      <p>
        Legacy deals keep their fixed stages until explicitly assigned to a
        configured pipeline from their related-record page. Open stages move in
        order; closed deals cannot reopen. Move or archive deals before removing
        an occupied stage or pipeline.
      </p>
      {error && <p role="alert">{error}</p>}
      {!editor && (
        <>
          <LoadState
            error={state.error}
            loading={!state.data && !state.error}
            onRetry={() => setRevision((v) => v + 1)}
          />
          {api.admin && (
            <button
              onClick={() =>
                setEditor({
                  name: '',
                  stages: startingStages.map((s) => ({ ...s })),
                })
              }
            >
              Create pipeline
            </button>
          )}
          <ul className="workflow-records">
            {state.data?.map((p) => (
              <li key={p.id}>
                <h3>{p.name}</h3>
                <p>{p.stages.map((s) => s.name).join(' → ')}</p>
                <button
                  onClick={() => {
                    setSelected(p.id);
                    setPage(0);
                  }}
                >
                  View {p.name}
                </button>
                {api.admin && (
                  <>
                    <button
                      onClick={() =>
                        setEditor({ id: p.id, name: p.name, stages: p.stages })
                      }
                    >
                      Configure {p.name}
                    </button>
                    <button
                      onClick={() =>
                        setPending(
                          () => () =>
                            api.write(
                              '/pipeline-definitions/' + p.id,
                              'DELETE',
                            ),
                        )
                      }
                    >
                      Archive {p.name}
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
          {state.data?.length === 0 && (
            <p>No configured pipelines. An administrator can create one.</p>
          )}
        </>
      )}
      {editor && (
        <form
          className="workflow-form"
          onSubmit={(e) => {
            e.preventDefault();
            void action(async () => {
              const result = object(
                await api.write(
                  '/pipeline-definitions' + (editor.id ? '/' + editor.id : ''),
                  editor.id ? 'PUT' : 'POST',
                  { name: editor.name, stages: editor.stages },
                ),
              );
              if (typeof result.id !== 'string')
                throw Error('Pipeline save was not confirmed.');
              setSelected(result.id);
            });
          }}
        >
          <fieldset disabled={busy}>
            <label>
              Pipeline name
              <input
                required
                maxLength={200}
                value={editor.name}
                onChange={(e) => {
                  setDirty(true);
                  setEditor({ ...editor, name: e.target.value });
                }}
              />
            </label>
            <p>
              Stable keys identify stages. Rename labels freely; changing
              occupied keys/outcomes is rejected by the server. Include exactly
              one WON and one LOST stage.
            </p>
            {editor.stages.map((s, i) => (
              <div key={i}>
                <label>
                  Stage {i + 1} key
                  <input
                    required
                    pattern="[a-z][a-z0-9_-]{0,49}"
                    maxLength={50}
                    value={s.key}
                    onChange={(e) => change(i, { key: e.target.value })}
                  />
                </label>
                <label>
                  Stage {i + 1} name
                  <input
                    required
                    maxLength={100}
                    value={s.name}
                    onChange={(e) => change(i, { name: e.target.value })}
                  />
                </label>
                <label>
                  Stage {i + 1} outcome
                  <select
                    value={s.outcome}
                    onChange={(e) =>
                      change(i, { outcome: e.target.value as Stage['outcome'] })
                    }
                  >
                    <option>OPEN</option>
                    <option>WON</option>
                    <option>LOST</option>
                  </select>
                </label>
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => {
                    const stages = [...editor.stages];
                    [stages[i - 1], stages[i]] = [stages[i], stages[i - 1]];
                    setEditor({ ...editor, stages });
                    setDirty(true);
                  }}
                >
                  Move stage {i + 1} up
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditor({
                      ...editor,
                      stages: editor.stages.filter((_, n) => n !== i),
                    });
                    setDirty(true);
                  }}
                >
                  Remove stage {i + 1}
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={editor.stages.length >= 30}
              onClick={() => {
                setEditor({
                  ...editor,
                  stages: [
                    ...editor.stages,
                    { key: '', name: '', outcome: 'OPEN' },
                  ],
                });
                setDirty(true);
              }}
            >
              Add stage
            </button>
            <button>Save pipeline</button>
            <button
              type="button"
              onClick={() => {
                if (!dirty || window.confirm('Discard pipeline edits?')) {
                  setEditor(undefined);
                  setDirty(false);
                }
              }}
            >
              Cancel pipeline editing
            </button>
          </fieldset>
        </form>
      )}
      {definition && !editor && (
        <section aria-label="Configured pipeline deals">
          <h3>{definition.name}</h3>
          <LoadState
            error={deals.error}
            loading={!deals.data && !deals.error}
            onRetry={() => setRevision((v) => v + 1)}
          />
          {deals.data && (
            <>
              <p>
                {deals.data.totalElements} deals · Page {currentPage + 1}
              </p>
              {definition.stages.map((s) => (
                <section key={s.key}>
                  <h4>
                    {s.name} · {s.outcome}
                  </h4>
                  <ul className="workflow-records">
                    {deals
                      .data!.content.filter((r) => r.pipelineStageKey === s.key)
                      .map((r) => (
                        <li key={r.id}>
                          <button
                            onClick={() =>
                              navigate(
                                `/record-context?resource=opportunities&id=${r.id}`,
                              )
                            }
                          >
                            {String(r.name)}
                          </button>
                          <p>
                            {String(r.currency || '')}{' '}
                            {String(r.amount ?? 'Value unavailable')}
                          </p>
                          {api.canWrite && (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                const key = String(
                                  new FormData(e.currentTarget).get('stageKey'),
                                );
                                setPending(
                                  () => () =>
                                    api.write(
                                      '/opportunities/' +
                                        r.id +
                                        '/pipeline-stage',
                                      'PATCH',
                                      {
                                        pipelineId: definition.id,
                                        stageKey: key,
                                      },
                                    ),
                                );
                              }}
                            >
                              <label>
                                Move {String(r.name)} to
                                <select name="stageKey" defaultValue={s.key}>
                                  {definition.stages.map((next) => (
                                    <option key={next.key} value={next.key}>
                                      {next.name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <button disabled={busy}>Move deal</button>
                            </form>
                          )}
                        </li>
                      ))}
                  </ul>
                </section>
              ))}
              <button
                disabled={currentPage === 0}
                onClick={() => setPage((v) => v - 1)}
              >
                Previous pipeline deals
              </button>
              <button
                disabled={currentPage + 1 >= deals.data.totalPages}
                onClick={() => setPage((v) => v + 1)}
              >
                Next pipeline deals
              </button>
            </>
          )}
        </section>
      )}
      {pending && (
        <Confirmation
          message="Confirm this pipeline change? Occupied stage and terminal-state rules are checked by the server."
          onCancel={() => setPending(undefined)}
          onConfirm={() => {
            const work = pending;
            setPending(undefined);
            void action(work);
          }}
        />
      )}
    </WorkflowFrame>
  );
}
