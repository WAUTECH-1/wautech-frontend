import { useCallback, useState } from 'react';
import { useOperations } from './hooks';
import { useLoad } from '../workflows/hooks';
import { WorkflowFrame, LoadState, Confirmation } from '../workflows/ui';
import { page, object, resources, resourceCode } from './api';
import type { Row, SavedView } from './api';
import { navigate } from '../../routing/history';
import { useUnsaved } from '../platform/useUnsaved';
export default function ViewsPage() {
  const api = useOperations();
  const [revision, setRevision] = useState(0),
    [editor, setEditor] = useState<{ record?: SavedView }>(),
    [applied, setApplied] = useState<SavedView>(),
    [currentPage, setPage] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [pending, setPending] = useState<string>(),
    [dirty, setDirty] = useState(false);
  useUnsaved(dirty);
  const loader = useCallback((s: AbortSignal) => api.views(s), [api]);
  const data = useLoad(String(revision), loader);
  const resource = applied
    ? resources.find((r) => resourceCode[r] === applied.resource)
    : undefined;
  const recordsLoader = useCallback(
    async (s: AbortSignal) => {
      if (!applied || !resource) return undefined;
      const c = applied.configuration;
      return page(
        await api.read(
          '/records/' +
            resource +
            '?' +
            new URLSearchParams({
              ...c.filters,
              ...(c.search ? { search: c.search } : {}),
              ...(c.sortBy
                ? { sortBy: c.sortBy, sortDirection: c.sortDirection || 'asc' }
                : {}),
              page: String(currentPage),
              size: '25',
            }),
          s,
        ),
        (v) => object(v) as Row,
      );
    },
    [api, applied, resource, currentPage],
  );
  const records = useLoad(
    JSON.stringify([applied?.id, currentPage, revision]),
    recordsLoader,
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
        setError(e instanceof Error ? e.message : 'View action failed.');
    } finally {
      if (api.active()) setBusy(false);
    }
  }
  return (
    <WorkflowFrame
      title="Saved views"
      busy={busy}
      onRefresh={() => setRevision((v) => v + 1)}
    >
      {error && <p role="alert">{error}</p>}
      {!editor && (
        <>
          {api.canWrite && (
            <button onClick={() => setEditor({})}>Create saved view</button>
          )}
          <LoadState
            error={data.error}
            loading={!data.data && !data.error}
            onRetry={() => setRevision((v) => v + 1)}
          />
          <ul className="workflow-records">
            {data.data?.map((v) => (
              <li key={v.id}>
                <h3>{v.name}</h3>
                <p>{v.resource}</p>
                <button
                  onClick={() => {
                    setApplied(v);
                    setPage(0);
                  }}
                >
                  Apply {v.name}
                </button>
                {api.canWrite && (
                  <>
                    <button onClick={() => setEditor({ record: v })}>
                      Edit {v.name}
                    </button>
                    <button onClick={() => setPending(v.id)}>
                      Archive {v.name}
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
          {data.data?.length === 0 && <p>No saved views.</p>}
        </>
      )}
      {editor && (
        <form
          className="workflow-form"
          onInput={() => setDirty(true)}
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void action(async () => {
              const filters = object(
                JSON.parse(String(f.get('filters') || '{}')),
              );
              if (Object.values(filters).some((v) => typeof v !== 'string'))
                throw Error('Filter values must be strings.');
              const search = String(f.get('search') || '').trim(),
                sortBy = String(f.get('sortBy') || '').trim();
              await api.saveView(
                {
                  name: String(f.get('name')),
                  resource: String(f.get('resource')),
                  configurationVersion: 1,
                  configuration: {
                    filters: filters as Record<string, string>,
                    ...(search ? { search } : {}),
                    ...(sortBy
                      ? {
                          sortBy,
                          sortDirection: String(f.get('sortDirection')),
                        }
                      : {}),
                  },
                } as Omit<SavedView, 'id'>,
                editor.record?.id,
              );
            });
          }}
        >
          <fieldset disabled={busy}>
            <label>
              View name
              <input
                name="name"
                required
                maxLength={200}
                defaultValue={editor.record?.name}
              />
            </label>
            <label>
              View resource
              <select
                name="resource"
                defaultValue={editor.record?.resource || 'COMPANY'}
              >
                {resources.map((r) => (
                  <option key={r} value={resourceCode[r]}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Saved search
              <input
                name="search"
                maxLength={200}
                defaultValue={editor.record?.configuration.search}
              />
            </label>
            <label>
              Filters (JSON object)
              <textarea
                name="filters"
                rows={4}
                defaultValue={JSON.stringify(
                  editor.record?.configuration.filters || {},
                )}
              />
            </label>
            <p>
              Use supported fields such as companyId, status, stage, type or
              priority. The server validates each resource's allowlist.
            </p>
            <label>
              Saved sort field
              <input
                name="sortBy"
                defaultValue={editor.record?.configuration.sortBy}
              />
            </label>
            <label>
              Saved sort direction
              <select
                name="sortDirection"
                defaultValue={
                  editor.record?.configuration.sortDirection || 'asc'
                }
              >
                <option>asc</option>
                <option>desc</option>
              </select>
            </label>
            <button>Save view</button>
            <button
              type="button"
              onClick={() => {
                if (!dirty || window.confirm('Discard unsaved view?')) {
                  setEditor(undefined);
                  setDirty(false);
                }
              }}
            >
              Cancel view editing
            </button>
          </fieldset>
        </form>
      )}
      {applied && (
        <section aria-label="Applied saved view">
          <h3>
            {applied.name} · {resource}
          </h3>
          <LoadState
            error={records.error}
            loading={!records.data && !records.error}
            onRetry={() => setRevision((v) => v + 1)}
          />
          {records.data && (
            <>
              <p>
                {records.data.totalElements} matching records · Page{' '}
                {currentPage + 1}
              </p>
              <ul className="workflow-records">
                {records.data.content.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() =>
                        navigate(
                          `/record-context?resource=${resource}&id=${r.id}`,
                        )
                      }
                    >
                      {String(
                        r.name ||
                          r.title ||
                          r.subject ||
                          [r.firstName, r.lastName].filter(Boolean).join(' ') ||
                          r.id,
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              {!records.data.content.length && (
                <p>No records match this saved view.</p>
              )}
              <button
                disabled={currentPage === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous view records
              </button>
              <button
                disabled={currentPage + 1 >= records.data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next view records
              </button>
            </>
          )}
        </section>
      )}
      {pending && (
        <Confirmation
          message="Archive this saved view?"
          onCancel={() => setPending(undefined)}
          onConfirm={() => {
            const id = pending;
            setPending(undefined);
            if (applied?.id === id) setApplied(undefined);
            void action(() => api.archiveView(id));
          }}
        />
      )}
    </WorkflowFrame>
  );
}
