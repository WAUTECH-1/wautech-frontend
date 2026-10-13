import { useState } from 'react';
import { Card } from '@wautech/asad';
import { leadStatuses } from '@wautech/umer/contracts';
import type { Snapshot, LeadRow } from './data';
import { filterLeads } from './data';
import { reportCsv, downloadCsv } from './csv';
import { useDataset, useIntelligence } from './hooks';
import {
  IntelligenceFrame,
  LoadBoundary,
  Source,
  MoneyTotals,
  UnavailableMetrics,
} from './ui';
export function ReportsContent({
  data,
  onExport,
}: {
  data: Snapshot;
  onExport?: (contents: string) => void;
}) {
  const [from, setFrom] = useState(''),
    [through, setThrough] = useState('');
  let error = '';
  let leads: LeadRow[] | undefined;
  try {
    if (data.leads.status === 'ready')
      leads = filterLeads(data.leads.value, from, through);
  } catch (e) {
    error = e instanceof Error ? e.message : 'Invalid date filter.';
  }
  const scope = `Lead creation dates in UTC: ${from || 'all dates'} through ${through || 'all dates'}`;
  const available = Object.values(data).some(
    (value) => typeof value === 'object' && value.status === 'ready',
  );
  return (
    <>
      <p>
        Current-state reporting · Retrieved{' '}
        {new Date(data.asOf).toLocaleString()}
      </p>
      <button
        disabled={!onExport || !available || !!error}
        onClick={() => onExport?.(reportCsv(data, leads, scope))}
      >
        Export authorized report CSV
      </button>
      <p>
        CSV includes current authorized datasets; unavailable datasets are
        marked. Amounts remain separated by currency.
      </p>
      <Card title="Lead qualification breakdown">
        <form
          className="intelligence-filters"
          onSubmit={(event) => {
            event.preventDefault();
            const fields = new FormData(event.currentTarget);
            setFrom(String(fields.get('from') || ''));
            setThrough(String(fields.get('through') || ''));
          }}
        >
          <label>
            Lead created from (UTC)
            <input type="date" name="from" />
          </label>
          <label>
            Lead created through (UTC)
            <input type="date" name="through" />
          </label>
          <button type="submit">Apply lead date filters</button>
          <button
            type="reset"
            onClick={() => {
              setFrom('');
              setThrough('');
            }}
          >
            Clear lead date filters
          </button>
        </form>
        <p>
          Date filters apply only to lead creation timestamps. All other
          summaries remain current snapshots.
        </p>
        {error ? (
          <p role="alert">{error}</p>
        ) : (
          <Source data={data.leads}>
            {() =>
              leads && (
                <>
                  <p>
                    {leads.length} leads in this creation cohort · Qualified
                    share:{' '}
                    {leads.length
                      ? (
                          (leads.filter((row) => row.status === 'QUALIFIED')
                            .length /
                            leads.length) *
                          100
                        ).toFixed(1) + '%'
                      : 'unavailable (no leads)'}
                  </p>
                  <ul>
                    {leadStatuses.map((status) => (
                      <li key={status}>
                        {status}:{' '}
                        {leads!.filter((row) => row.status === status).length}
                      </li>
                    ))}
                  </ul>
                  <p>
                    Qualified share means QUALIFIED / current leads in the
                    cohort. It does not measure opportunity conversion.
                  </p>
                </>
              )
            }
          </Source>
        )}
      </Card>
      <Card title="Pipeline by stage and currency">
        <Source data={data.pipeline}>
          {(stages) => (
            <div className="intelligence-table">
              <table>
                <caption>
                  Current opportunity counts and values; closed values are not
                  recognized revenue.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Stage</th>
                    <th scope="col">Count</th>
                    <th scope="col">Value by currency</th>
                  </tr>
                </thead>
                <tbody>
                  {stages.map((row) => (
                    <tr key={row.stage}>
                      <th scope="row">{row.stage}</th>
                      <td>{row.count}</td>
                      <td>
                        <MoneyTotals totals={row.totals} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Source>
        <p>
          Backend aggregate excludes records with missing amount/currency from
          financial totals.
        </p>
      </Card>
      <Card title="Task and activity summary">
        <Source data={data.tasks}>
          {(rows) => (
            <ul>
              {['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(
                (status) => (
                  <li key={status}>
                    {status}:{' '}
                    {rows.filter((row) => row.status === status).length}
                  </li>
                ),
              )}
            </ul>
          )}
        </Source>
        <Source data={data.activities}>
          {(rows) => (
            <p>
              {rows.length} recorded activities. Activities do not have a
              completion-state contract.
            </p>
          )}
        </Source>
      </Card>
      <UnavailableMetrics />
    </>
  );
}
export default function ReportsPage() {
  const runtime = useIntelligence(),
    state = useDataset(runtime.snapshot);
  return (
    <IntelligenceFrame
      title="Sales reports"
      busy={state.status === 'loading'}
      onRefresh={() => void runtime.snapshot.refresh()}
    >
      <LoadBoundary state={state}>
        {(data) => (
          <ReportsContent
            data={data}
            onExport={(contents) => {
              const current = runtime.snapshot.getSnapshot();
              if (
                runtime.active() &&
                current.status === 'ready' &&
                current.data === data
              )
                downloadCsv(contents);
            }}
          />
        )}
      </LoadBoundary>
    </IntelligenceFrame>
  );
}
