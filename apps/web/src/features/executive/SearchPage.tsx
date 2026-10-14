import { useCallback, useState } from 'react';
import { useOperations } from '../operations/hooks';
import { useLoad, useWorkflowSearch } from '../workflows/hooks';
import { WorkflowFrame, LoadState } from '../workflows/ui';
import { resources, page, rows } from '../operations/api';
import { navigate } from '../../routing/history';
export default function SearchPage() {
  const api = useOperations(),
    search = useWorkflowSearch(),
    q = new URLSearchParams(search).get('q') || '';
  const [revision, setRevision] = useState(0);
  const loader = useCallback(
    async (signal: AbortSignal) => {
      if (!q.trim()) return [];
      if (q.length > 200) throw Error('Search must be at most 200 characters.');
      return Promise.all(
        resources.map(async (resource) => {
          try {
            const result = page(
              await api.read(
                '/records/' +
                  resource +
                  '?size=10&search=' +
                  encodeURIComponent(q),
                signal,
              ),
              (v) => rows([v])[0],
            );
            return { resource, result, error: '' };
          } catch (e) {
            if (signal.aborted) throw e;
            return {
              resource,
              result: undefined,
              error: e instanceof Error ? e.message : 'Search unavailable.',
            };
          }
        }),
      );
    },
    [api, q],
  );
  const state = useLoad(q + ':' + revision, loader);
  return (
    <WorkflowFrame
      title="Search your CRM"
      onRefresh={() => setRevision((v) => v + 1)}
    >
      <form
        className="intelligence-filters"
        key={q}
        onSubmit={(e) => {
          e.preventDefault();
          navigate(
            `/search?q=${encodeURIComponent(String(new FormData(e.currentTarget).get('q') || ''))}`,
          );
        }}
      >
        <label>
          Search business records
          <input type="search" name="q" maxLength={200} defaultValue={q} />
        </label>
        <button>Search CRM</button>
      </form>
      <p>
        Search permitted active companies, contacts, leads, opportunities,
        tasks, activities and notes. Each section shows up to 10 matches with
        its server count.
      </p>
      <LoadState
        error={state.error}
        loading={!state.data && !state.error}
        onRetry={() => setRevision((v) => v + 1)}
      />
      {!q && <p>Enter a name, email, subject or note text to begin.</p>}
      {state.data?.map((group) => (
        <section key={group.resource}>
          <h3>{group.resource}</h3>
          {group.error ? (
            <p role="alert">{group.error}</p>
          ) : (
            group.result && (
              <>
                <p>
                  {group.result.totalElements} matches · Showing{' '}
                  {group.result.content.length}
                </p>
                {group.result.content.map((r) => (
                  <p key={r.id}>
                    <button
                      onClick={() =>
                        navigate(
                          `/record-context?resource=${group.resource}&id=${r.id}`,
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
                  </p>
                ))}
                {!group.result.totalElements && <p>No matches.</p>}
              </>
            )
          )}
        </section>
      ))}
    </WorkflowFrame>
  );
}
