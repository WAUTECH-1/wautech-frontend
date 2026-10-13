import { Card } from '@wautech/asad';
import { leadStatuses } from '@wautech/umer/contracts';
import { useDataset, useIntelligence } from './hooks';
import {
  IntelligenceFrame,
  LoadBoundary,
  Source,
  MoneyTotals,
  UnavailableMetrics,
} from './ui';
import { pipelineTotals } from './data';
import { navigate } from '../../routing/history';
export default function DashboardPage() {
  const runtime = useIntelligence(),
    state = useDataset(runtime.snapshot);
  return (
    <IntelligenceFrame
      title="Executive sales command center"
      busy={state.status === 'loading'}
      onRefresh={() => void runtime.snapshot.refresh()}
    >
      <LoadBoundary state={state}>
        {(data) => (
          <>
            <p className="intelligence-provenance">
              Authorized current records · Retrieved{' '}
              {new Date(data.asOf).toLocaleString()}. Refresh to reconcile
              changes made elsewhere.
            </p>
            <div className="intelligence-grid">
              <Card title="Companies">
                <Source data={data.companies}>
                  {(count) => (
                    <>
                      <strong className="intelligence-number">{count}</strong>
                      <p>Non-archived company records</p>
                    </>
                  )}
                </Source>
              </Card>
              <Card title="Contacts">
                <Source data={data.contacts}>
                  {(count) => (
                    <>
                      <strong className="intelligence-number">{count}</strong>
                      <p>Non-archived contact records</p>
                    </>
                  )}
                </Source>
              </Card>
              <Card title="Leads">
                <Source data={data.leads}>
                  {(rows) => (
                    <>
                      <strong className="intelligence-number">
                        {rows.length}
                      </strong>
                      <p>Current non-archived leads</p>
                      <ul>
                        {leadStatuses.map((status) => (
                          <li key={status}>
                            {status}:{' '}
                            {rows.filter((row) => row.status === status).length}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </Source>
              </Card>
              <Card title="Opportunities">
                <Source data={data.pipeline}>
                  {(stages) => (
                    <>
                      <strong className="intelligence-number">
                        {stages.reduce((sum, row) => sum + row.count, 0)}
                      </strong>
                      <p>Current non-archived opportunities</p>
                      <p>
                        Won:{' '}
                        {
                          stages.find((row) => row.stage === 'CLOSED_WON')!
                            .count
                        }{' '}
                        · Lost:{' '}
                        {
                          stages.find((row) => row.stage === 'CLOSED_LOST')!
                            .count
                        }
                      </p>
                      <button onClick={() => navigate('/pipeline')}>
                        Explore sales pipeline
                      </button>
                    </>
                  )}
                </Source>
              </Card>
            </div>
            <div className="intelligence-grid">
              <Card title="Open pipeline value">
                <Source data={data.pipeline}>
                  {(stages) => (
                    <>
                      <MoneyTotals totals={pipelineTotals(stages, true)} />
                      <p>
                        Excludes closed stages. Backend totals omit records
                        without amount/currency.
                      </p>
                    </>
                  )}
                </Source>
              </Card>
              <Card title="Pending tasks">
                <Source data={data.tasks}>
                  {(rows) => (
                    <>
                      <strong className="intelligence-number">
                        {
                          rows.filter(
                            (row) =>
                              row.status === 'OPEN' ||
                              row.status === 'IN_PROGRESS',
                          ).length
                        }
                      </strong>
                      <p>
                        OPEN and IN_PROGRESS tasks ·{' '}
                        {rows.filter((row) => row.overdue).length} overdue
                      </p>
                      <p>
                        {
                          rows.filter((row) => row.status === 'COMPLETED')
                            .length
                        }{' '}
                        completed ·{' '}
                        {
                          rows.filter((row) => row.status === 'CANCELLED')
                            .length
                        }{' '}
                        cancelled
                      </p>
                    </>
                  )}
                </Source>
              </Card>
              <Card title="Opportunity stage distribution">
                <Source data={data.pipeline}>
                  {(stages) => (
                    <ul>
                      {stages.map((row) => (
                        <li key={row.stage}>
                          {row.stage}: {row.count}
                        </li>
                      ))}
                    </ul>
                  )}
                </Source>
              </Card>
              <Card title="Recent activity">
                <Source data={data.activities}>
                  {(rows) =>
                    rows.length ? (
                      <ol>
                        {rows.slice(0, 10).map((row) => (
                          <li key={row.id}>
                            {row.subject}
                            <br />
                            <time dateTime={row.occurredAt}>
                              {new Date(row.occurredAt).toLocaleString()}
                            </time>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p>No recent activities are available.</p>
                    )
                  }
                </Source>
              </Card>
            </div>
            <UnavailableMetrics />
          </>
        )}
      </LoadBoundary>
    </IntelligenceFrame>
  );
}
