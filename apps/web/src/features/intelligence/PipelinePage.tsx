import { useEffect, useRef, useState } from 'react';
import { opportunityStages, stageTransitions } from '@wautech/umer/contracts';
import type { OpportunityStage } from '@wautech/umer/contracts';
import { filterOpportunities } from './data';
import type { OpportunityRow } from './data';
import { useDataset, useIntelligence } from './hooks';
import { canChangeStage } from './runtime';
import { moneyLabel, sumMoney } from './money';
import { IntelligenceFrame, LoadBoundary, MoneyTotals } from './ui';
import { navigate } from '../../routing/history';

function StageConfirmation({
  row,
  next,
  onConfirm,
  onCancel,
}: {
  row: OpportunityRow;
  next: OpportunityStage;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => previous?.focus();
  }, []);
  return (
    <dialog
      className="intelligence-dialog"
      ref={ref}
      aria-labelledby="stage-confirm-title"
      onCancel={onCancel}
    >
      <h2 id="stage-confirm-title">Confirm stage change</h2>
      <p>
        Move {row.name} from {row.stage} to {next}?
      </p>
      <p>The server must confirm this change. Closed stages are terminal.</p>
      <div className="intelligence-actions">
        <button autoFocus onClick={onCancel}>
          Cancel
        </button>
        <button onClick={onConfirm}>Confirm stage change</button>
      </div>
    </dialog>
  );
}
export default function PipelinePage() {
  const runtime = useIntelligence(),
    state = useDataset(runtime.opportunities);
  const [search, setSearch] = useState(''),
    [stage, setStage] = useState(''),
    [currency, setCurrency] = useState(''),
    [page, setPage] = useState(1);
  const [pending, setPending] = useState<{
    row: OpportunityRow;
    next: OpportunityStage;
  }>();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [selection, setSelection] = useState<string>(),
    [detail, setDetail] = useState<OpportunityRow>(),
    [detailError, setDetailError] = useState('');
  useEffect(() => {
    if (!selection) return;
    const controller = new AbortController();
    void runtime
      .detail(selection, controller.signal)
      .then((row) => {
        if (!controller.signal.aborted && runtime.active()) setDetail(row);
      })
      .catch((e) => {
        if (!controller.signal.aborted && runtime.active())
          setDetailError(
            e instanceof Error ? e.message : 'Detail unavailable.',
          );
      });
    return () => controller.abort();
  }, [selection, runtime]);
  async function confirmStage() {
    if (!pending || busy) return;
    const action = pending;
    setPending(undefined);
    setBusy(true);
    setError('');
    setNotice('');
    setSelection(undefined);
    setDetail(undefined);
    try {
      await runtime.changeStage(action.row, action.next);
      if (runtime.active()) setNotice('Stage change confirmed by the server.');
    } catch (e) {
      if (runtime.active())
        setError(
          e instanceof Error
            ? e.message
            : 'Stage change failed. Refresh and retry.',
        );
    } finally {
      if (runtime.active()) setBusy(false);
    }
  }
  return (
    <IntelligenceFrame
      title="Sales pipeline"
      busy={busy || state.status === 'loading'}
      onRefresh={() => {
        setPage(1);
        setError('');
        setSelection(undefined);
        setDetail(undefined);
        void runtime.opportunities.refresh();
      }}
    >
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <p>
        Non-archived opportunities, grouped by current stage. Stage values are
        separated by currency. No optimistic changes are applied.
      </p>
      {runtime.role === 'VIEWER' ? (
        <p role="status">VIEWER access: opportunity details are read-only.</p>
      ) : !['OWNER', 'ADMIN', 'SALES_USER'].includes(String(runtime.role)) ? (
        <p>
          Stage changes unavailable: verified write permissions are required.
        </p>
      ) : null}
      <LoadBoundary state={state}>
        {(rows) => {
          const filtered = filterOpportunities(rows, search, stage, currency),
            visible = filtered.slice((page - 1) * 30, page * 30);
          const currencies = [
            ...new Set(
              rows
                .map((row) => row.currency)
                .filter(
                  (value): value is string =>
                    typeof value === 'string' && /^[A-Z]{3}$/.test(value),
                ),
            ),
          ].sort();
          return (
            <>
              <div className="intelligence-filters">
                <label>
                  Search opportunities
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </label>
                <label>
                  Pipeline stage
                  <select
                    aria-label="Pipeline stage"
                    value={stage}
                    onChange={(e) => {
                      setStage(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">All stages</option>
                    {opportunityStages.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Pipeline currency
                  <select
                    aria-label="Pipeline currency"
                    value={currency}
                    onChange={(e) => {
                      setCurrency(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">All currencies</option>
                    {currencies.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
              </div>
              <p role="status">
                {filtered.length} opportunities match. Showing {visible.length}{' '}
                on page {page}. Stage counts and totals cover all matching
                records.
              </p>
              {!filtered.length && <p>No opportunities match these filters.</p>}
              <div className="intelligence-board">
                {opportunityStages
                  .filter((value) => !stage || stage === value)
                  .map((value) => {
                    const stageRows = filtered.filter(
                        (row) => row.stage === value,
                      ),
                      totals = sumMoney(stageRows);
                    return (
                      <section
                        key={value}
                        className="intelligence-stage"
                        aria-label={value}
                      >
                        <h3>{value}</h3>
                        <p>{stageRows.length} opportunities</p>
                        <MoneyTotals totals={totals.totals} />
                        {totals.unavailable > 0 && (
                          <p>
                            {totals.unavailable} values unavailable; excluded
                            from these totals.
                          </p>
                        )}
                        <ul>
                          {visible
                            .filter((row) => row.stage === value)
                            .map((row) => (
                              <li key={row.id}>
                                <button
                                  className="intelligence-detail-link"
                                  onClick={() => {
                                    setDetail(undefined);
                                    setDetailError('');
                                    setSelection(row.id);
                                  }}
                                >
                                  {row.name}
                                </button>
                                <p>{moneyLabel(row.amount, row.currency)}</p>
                                <label>
                                  Next stage for {row.name}
                                  <select
                                    aria-label={`Next stage for ${row.name}`}
                                    value=""
                                    disabled={
                                      busy ||
                                      !stageTransitions[row.stage].some(
                                        (next) =>
                                          canChangeStage(
                                            runtime.role,
                                            row.stage,
                                            next,
                                          ),
                                      )
                                    }
                                    onChange={(e) => {
                                      const next = e.target
                                        .value as OpportunityStage;
                                      if (
                                        canChangeStage(
                                          runtime.role,
                                          row.stage,
                                          next,
                                        )
                                      )
                                        setPending({ row, next });
                                    }}
                                  >
                                    <option value="">
                                      {stageTransitions[row.stage].length
                                        ? 'Choose stage'
                                        : 'Terminal stage'}
                                    </option>
                                    {stageTransitions[row.stage].map((next) => (
                                      <option key={next}>{next}</option>
                                    ))}
                                  </select>
                                </label>
                              </li>
                            ))}
                        </ul>
                      </section>
                    );
                  })}
              </div>
              <div className="intelligence-actions">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Previous opportunities
                </button>
                <button
                  disabled={page * 30 >= filtered.length}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next opportunities
                </button>
              </div>
            </>
          );
        }}
      </LoadBoundary>
      {selection && (
        <section
          className="intelligence-detail"
          aria-label="Opportunity details"
        >
          <div className="intelligence-heading">
            <h3>Opportunity details</h3>
            <button
              onClick={() => {
                setSelection(undefined);
                setDetail(undefined);
              }}
            >
              Close details
            </button>
          </div>
          {detailError ? (
            <p role="alert">{detailError}</p>
          ) : detail ? (
            <>
              <h4>{detail.name}</h4>
              <p>
                {detail.stage} · {moneyLabel(detail.amount, detail.currency)}
              </p>
              <p>Created {new Date(detail.createdAt).toLocaleString()}</p>
              <p>Company ID: {detail.companyId}</p>
              <button onClick={() => navigate('/opportunities')}>
                Open CRM opportunities workspace
              </button>
            </>
          ) : (
            <p role="status">Loading opportunity details…</p>
          )}
        </section>
      )}
      {pending && (
        <StageConfirmation
          row={pending.row}
          next={pending.next}
          onCancel={() => setPending(undefined)}
          onConfirm={() => void confirmStage()}
        />
      )}
    </IntelligenceFrame>
  );
}
