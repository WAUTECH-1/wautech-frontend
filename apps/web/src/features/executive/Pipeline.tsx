import { useCallback, useState } from 'react';
import { opportunityStages, stageTransitions } from '@wautech/umer/contracts';
import type { OpportunityStage } from '@wautech/umer/contracts';
import { useOperations } from '../operations/hooks';
import { useLoad, useWorkflowSearch } from '../workflows/hooks';
import { LoadState, Confirmation } from '../workflows/ui';
import { IntelligenceFrame, MoneyTotals } from '../intelligence/ui';
import { rows, page, object } from '../operations/api';
import type { Row } from '../operations/api';
import { parseSummary } from './contracts';
import { addDecimals, moneyLabel } from '../intelligence/money';
import { navigate } from '../../routing/history';
import './executive.css';
interface Definition {
  id: string;
  name: string;
  stages: { key: string; name: string; outcome: string }[];
}
export default function Pipeline() {
  const api = useOperations(),
    search = useWorkflowSearch(),
    params = new URLSearchParams(search);
  const [revision, setRevision] = useState(0),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState<{
      row: Row;
      key: string;
      label: string;
    }>();
  const currentPage = Math.max(0, Number(params.get('page') || 0)),
    pipelineId = params.get('pipelineId') || '',
    selectedStage = params.get('stage') || '';
  const loader = useCallback(
    async (signal: AbortSignal) => {
      const params = new URLSearchParams(search);
      const currentPage = Math.max(0, Number(params.get('page') || 0)),
        pipelineId = params.get('pipelineId') || '',
        selectedStage = params.get('stage') || '';
      if (!Number.isSafeInteger(currentPage) || currentPage > 100000)
        throw Error('Invalid page.');
      const aggregate = new URLSearchParams(),
        filters = new URLSearchParams({
          size: '25',
          page: String(currentPage),
          sortBy: 'updatedAt',
          sortDirection: 'desc',
        });
      for (const key of ['search', 'currency', 'pipelineId'])
        if (params.get(key)) {
          aggregate.set(key, params.get(key)!);
          filters.set(key, params.get(key)!);
        }
      if (params.get('memberId')) {
        aggregate.set('memberId', params.get('memberId')!);
        filters.set('ownerUserId', params.get('memberId')!);
      }
      if (selectedStage)
        filters.set(pipelineId ? 'pipelineStageKey' : 'stage', selectedStage);
      const [summary, records, definitions, members] = await Promise.all([
        api.read('/reports/summary?' + aggregate, signal),
        api.read('/records/opportunities?' + filters, signal),
        api.read('/pipeline-definitions', signal),
        api.members(signal),
      ]);
      const defs = rows(definitions).map((r) => {
        if (typeof r.name !== 'string' || !Array.isArray(r.stages))
          throw Error('Invalid pipeline definition.');
        return r as unknown as Definition;
      });
      return {
        summary: parseSummary(summary),
        records: page(records, (v) => rows([v])[0]),
        definitions: defs,
        members,
      };
      // URL is the source of truth, including browser Back/Forward and direct links.
    },
    [api, search],
  );
  const state = useLoad(search + ':' + revision, loader),
    definition = state.data?.definitions.find((p) => p.id === pipelineId);
  const stages = definition
    ? definition.stages
    : opportunityStages.map((key) => ({
        key,
        name: key.replaceAll('_', ' '),
        outcome:
          key === 'CLOSED_WON'
            ? 'WON'
            : key === 'CLOSED_LOST'
              ? 'LOST'
              : 'OPEN',
      }));
  const move = async () => {
    if (!pending) return;
    const action = pending;
    setPending(undefined);
    setBusy(true);
    setError('');
    try {
      const configured = action.row.pipelineId;
      const response = object(
        await api.write(
          '/opportunities/' +
            action.row.id +
            (configured ? '/pipeline-stage' : '/stage'),
          'PATCH',
          configured
            ? { pipelineId: configured, stageKey: action.key }
            : { stage: action.key },
        ),
      );
      if (
        response.id !== action.row.id ||
        response[configured ? 'pipelineStageKey' : 'stage'] !== action.key
      )
        throw Error('Stage change was not confirmed.');
      if (api.active()) setRevision((v) => v + 1);
    } catch (e) {
      if (api.active())
        setError(e instanceof Error ? e.message : 'Stage change failed.');
    } finally {
      if (api.active()) setBusy(false);
    }
  };
  function linkPage(page: number) {
    const q = new URLSearchParams(search);
    q.set('page', String(page));
    navigate(`/pipeline?${q}`);
  }
  return (
    <IntelligenceFrame
      title="Opportunity pipeline"
      busy={busy}
      onRefresh={() => setRevision((v) => v + 1)}
    >
      <form
        key={search}
        className="intelligence-filters"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget),
            q = new URLSearchParams();
          for (const key of [
            'search',
            'currency',
            'memberId',
            'pipelineId',
            'stage',
          ])
            if (form.get(key)) q.set(key, String(form.get(key)));
          navigate(`/pipeline?${q}`);
        }}
      >
        <label>
          Search opportunities
          <input
            name="search"
            maxLength={200}
            defaultValue={params.get('search') || ''}
          />
        </label>
        <label>
          Currency
          <input
            name="currency"
            pattern="[A-Z]{3}"
            maxLength={3}
            defaultValue={params.get('currency') || ''}
          />
        </label>
        <label>
          Pipeline
          <select
            aria-label="Pipeline filter"
            name="pipelineId"
            key={pipelineId + ':' + (state.data?.definitions.length || 0)}
            defaultValue={pipelineId}
            onChange={(event) => {
              const select = event.currentTarget.form?.elements.namedItem(
                'stage',
              ) as HTMLSelectElement | null;
              if (select) select.value = '';
            }}
          >
            <option value="">All pipelines (shared outcome stages)</option>
            {pipelineId &&
              !state.data?.definitions.some((d) => d.id === pipelineId) && (
                <option value={pipelineId}>Selected pipeline</option>
              )}
            {state.data?.definitions.map((d) => (
              <option value={d.id} key={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Stage
          <select
            aria-label="Stage filter"
            name="stage"
            key={pipelineId + ':' + stages.map((s) => s.key).join(',')}
            defaultValue={selectedStage}
          >
            <option value="">All stages</option>
            {stages.map((s) => (
              <option value={s.key} key={s.key}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Owner
          <select
            aria-label="Owner filter"
            name="memberId"
            key={
              (params.get('memberId') || '') +
              ':' +
              (state.data?.members.length || 0)
            }
            defaultValue={params.get('memberId') || ''}
          >
            <option value="">All owners</option>
            {params.get('memberId') &&
              !state.data?.members.some(
                (m) => m.userId === params.get('memberId'),
              ) && (
                <option value={params.get('memberId')!}>
                  Selected or former owner
                </option>
              )}
            {state.data?.members.map((m) => (
              <option value={m.userId} key={m.userId}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <button disabled={busy}>Apply pipeline filters</button>
        <button type="button" onClick={() => navigate('/pipeline')}>
          Clear filters
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      <LoadState
        error={state.error}
        loading={!state.data && !state.error}
        onRetry={() => setRevision((v) => v + 1)}
      />
      {!api.canWrite && (
        <p>
          Read-only membership: stage changes require OWNER, ADMIN or
          SALES_USER.
        </p>
      )}
      {state.data && (
        <>
          <p>
            Complete server stage counts and currency values for the
            search/owner/pipeline scope. Stage filter affects the detail page
            only. Cards show up to 25 opportunities from page {currentPage + 1};
            they are not complete stage collections. Pipeline value is not
            revenue.
          </p>
          <p>
            {state.data.records.totalElements} matching opportunities · Page{' '}
            {currentPage + 1} of {Math.max(1, state.data.records.totalPages)}
          </p>
          <div className="executive-board">
            {stages.map((s) => {
              const grouped = pipelineId
                ? state.data!.summary.pipelineStages.filter(
                    (b) => b.category === s.key,
                  )
                : state.data!.summary.currencyTotals.filter(
                    (b) => b.category === s.key,
                  );
              const count = pipelineId
                ? grouped.reduce((n, b) => n + b.count, 0)
                : state.data!.summary.opportunityStages.find(
                    (b) => b.category === s.key,
                  )?.count || 0;
              const totals: Record<string, string> = {};
              for (const b of grouped)
                if (b.currency && b.amount)
                  totals[b.currency] = addDecimals(
                    totals[b.currency] || '0',
                    b.amount,
                  );
              const records = state.data!.records.content.filter(
                (r) => (pipelineId ? r.pipelineStageKey : r.stage) === s.key,
              );
              return (
                <section key={s.key} className="executive-stage">
                  <h3>{s.name}</h3>
                  {pipelineId && state.data!.summary.pipelineStagesTruncated ? (
                    <p role="alert">
                      Stage totals unavailable: grouped response is limited.
                      Refine filters.
                    </p>
                  ) : (
                    <>
                      <p>{count} opportunities in scope</p>
                      <MoneyTotals totals={totals} />
                    </>
                  )}
                  {records.map((r) => {
                    const ownDefinition = state.data!.definitions.find(
                        (d) => d.id === r.pipelineId,
                      ),
                      open =
                        ownDefinition?.stages.filter(
                          (s) => s.outcome === 'OPEN',
                        ) || [],
                      index = open.findIndex(
                        (s) => s.key === r.pipelineStageKey,
                      );
                    const choices = r.pipelineId
                      ? String(r.stage).startsWith('CLOSED_')
                        ? []
                        : ownDefinition?.stages.filter(
                            (s) =>
                              s.outcome !== 'OPEN' ||
                              s.key === open[index + 1]?.key,
                          ) || []
                      : (
                          stageTransitions[r.stage as OpportunityStage] || []
                        ).map((key) => ({ key, name: key }));
                    return (
                      <article key={r.id}>
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
                          {r.amount == null
                            ? 'Value not set'
                            : moneyLabel(r.amount, r.currency)}
                        </p>
                        <p>
                          Owner:{' '}
                          {state.data!.members.find(
                            (m) => m.userId === r.ownerUserId,
                          )?.name ||
                            (r.ownerUserId ? 'Former member' : 'Unassigned')}
                        </p>
                        {api.canWrite &&
                          choices.map((next) => (
                            <button
                              key={next.key}
                              disabled={busy}
                              onClick={() =>
                                setPending({
                                  row: r,
                                  key: next.key,
                                  label: next.name,
                                })
                              }
                            >
                              Move {String(r.name)} to {next.name}
                            </button>
                          ))}
                      </article>
                    );
                  })}
                  {!records.length && (
                    <p>No opportunities from this page in this stage.</p>
                  )}
                </section>
              );
            })}
          </div>
          <button
            disabled={currentPage === 0 || busy}
            onClick={() => linkPage(currentPage - 1)}
          >
            Previous opportunities
          </button>
          <button
            disabled={currentPage + 1 >= state.data.records.totalPages || busy}
            onClick={() => linkPage(currentPage + 1)}
          >
            Next opportunities
          </button>
          <button onClick={() => navigate('/sales-pipelines')}>
            Configure pipelines
          </button>
        </>
      )}
      {pending && (
        <Confirmation
          message={
            'Move ' +
            String(pending.row.name) +
            ' to ' +
            pending.label +
            '? Closed stages are terminal.'
          }
          onCancel={() => setPending(undefined)}
          onConfirm={() => void move()}
        />
      )}
    </IntelligenceFrame>
  );
}
