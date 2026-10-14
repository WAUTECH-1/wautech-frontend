import { useCallback, useState } from 'react';
import { Card } from '@wautech/asad';
import { useOperations } from '../operations/hooks';
import { useLoad, useWorkflowSearch } from '../workflows/hooks';
import { useFeatureApplication } from '../contract';
import { IntelligenceFrame, MoneyTotals } from '../intelligence/ui';
import { LoadState } from '../workflows/ui';
import { downloadCsv } from '../intelligence/csv';
import {
  parseSummary,
  openValues,
  percentage,
  validateDates,
} from './contracts';
import type { Bucket } from './contracts';
import { navigate } from '../../routing/history';
import { moneyLabel } from '../intelligence/money';
export default function ExecutivePage({
  reports = false,
}: {
  reports?: boolean;
}) {
  const api = useOperations(),
    app = useFeatureApplication(),
    search = useWorkflowSearch();
  const [revision, setRevision] = useState(0),
    [error, setError] = useState(''),
    [exporting, setExporting] = useState(false);
  const params = new URLSearchParams(search);
  const serialized = reports ? search.replace(/^\?/, '') : '';
  const loader = useCallback(
    async (signal: AbortSignal) => {
      const dates = new URLSearchParams(serialized);
      validateDates(dates.get('from') || '', dates.get('through') || '');
      return parseSummary(
        await api.read('/reports/summary?' + serialized, signal),
      );
    },
    [api, serialized],
  );
  const state = useLoad(serialized + ':' + revision, loader);
  const namesLoader = useCallback(
    (signal: AbortSignal) => api.members(signal),
    [api],
  );
  const names = useLoad('report-members', namesLoader);
  const notificationLoader = useCallback(
    (signal: AbortSignal) => api.unread(signal),
    [api],
  );
  const notifications = useLoad(
    'executive-notifications:' + revision,
    notificationLoader,
  );
  async function exportReport() {
    setExporting(true);
    setError('');
    try {
      const response = await api.transport(
        app.config.baseUrl + '/api/reports/export?' + serialized,
        { headers: { Accept: 'text/csv' } },
      );
      if (!api.active()) throw Error('Organization changed.');
      if (
        !response.ok ||
        !response.headers.get('content-type')?.includes('text/csv')
      )
        throw Error(
          'Report export unavailable. Check your session and permissions.',
        );
      const text = await response.text();
      if (!api.active()) throw Error('Organization changed.');
      downloadCsv(text);
    } catch (e) {
      if (api.active())
        setError(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      if (api.active()) setExporting(false);
    }
  }
  const memberName = (id?: string | null) =>
    !id
      ? 'Unassigned'
      : names.data?.find((m) => m.userId === id)?.name ||
        'Former or unavailable member · ' + id;
  return (
    <IntelligenceFrame
      title={reports ? 'Operational reports' : 'Executive command center'}
      busy={exporting}
      onRefresh={() => setRevision((v) => v + 1)}
    >
      {reports && (
        <form
          key={search}
          className="intelligence-filters"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            try {
              validateDates(
                String(form.get('from') || ''),
                String(form.get('through') || ''),
              );
              setError('');
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Check dates.');
              return;
            }
            const q = new URLSearchParams();
            for (const key of ['from', 'through', 'memberId'])
              if (form.get(key)) q.set(key, String(form.get(key)));
            navigate(`/reports?${q}`);
          }}
        >
          <label>
            From (UTC)
            <input
              name="from"
              type="date"
              defaultValue={params.get('from') || ''}
            />
          </label>
          <label>
            Through (UTC)
            <input
              name="through"
              type="date"
              defaultValue={params.get('through') || ''}
            />
          </label>
          <label>
            Owner / assignee
            <select
              name="memberId"
              aria-label="Owner / assignee"
              defaultValue={params.get('memberId') || ''}
            >
              <option value="">All members</option>
              {params.get('memberId') &&
                !names.data?.some(
                  (m) => m.userId === params.get('memberId'),
                ) && (
                  <option value={params.get('memberId')!}>
                    Selected member
                  </option>
                )}
              {names.data?.map((m) => (
                <option value={m.userId} key={m.userId}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <button>Apply report filters</button>
          <button type="button" onClick={() => navigate('/reports')}>
            Clear filters
          </button>
        </form>
      )}
      <p>
        Current non-archived records. UTC dates select
        company/contact/lead/opportunity/task creation cohorts and activity
        occurrence dates. Owner filters affect opportunities and task assignees
        only. Pipeline, currency and search filters affect opportunities only.
        Completed in period uses task completion dates independently. Current
        statuses are not historical transitions.
      </p>
      {error && <p role="alert">{error}</p>}
      <LoadState
        error={state.error}
        loading={!state.data && !state.error}
        onRetry={() => setRevision((v) => v + 1)}
      />
      {state.data && (
        <>
          <p>
            Verified database aggregates · As of{' '}
            {new Date(state.data.asOf).toLocaleString()}
          </p>
          <p>
            Applied UTC dates:{' '}
            {reports
              ? `${params.get('from') || 'All dates'} through ${params.get('through') || 'All dates'}`
              : 'Unfiltered current snapshot'}
          </p>
          <button
            disabled={exporting || !!error}
            onClick={() => void exportReport()}
          >
            Export authorized report CSV
          </button>
          <div className="intelligence-grid">
            {(['company', 'contact', 'lead', 'opportunity'] as const).map(
              (key) => (
                <Card
                  key={key}
                  title={
                    key === 'company'
                      ? 'Companies'
                      : key === 'opportunity'
                        ? 'Opportunities'
                        : key === 'contact'
                          ? 'Contacts'
                          : 'Leads'
                  }
                >
                  <strong className="intelligence-number">
                    {state.data!.counts[key]}
                  </strong>
                  <p>Complete count in the selected scope</p>
                </Card>
              ),
            )}
          </div>
          <div className="intelligence-grid">
            <Card title="Open pipeline value">
              <MoneyTotals totals={openValues(state.data)} />
              <p>
                Open opportunity amounts by currency. No currency conversion;
                pipeline value is not revenue.
              </p>
              <button onClick={() => navigate('/pipeline')}>
                Explore pipeline
              </button>
            </Card>
            <Card title="Lead performance">
              <Breakdown rows={state.data.leadStatuses} />
              <p>
                Qualification share:{' '}
                {percentage(
                  state.data.leadStatuses.find(
                    (b) => b.category === 'QUALIFIED',
                  )?.count || 0,
                  state.data.counts.lead,
                )}{' '}
                — currently QUALIFIED ÷ leads in the selected creation cohort.
                Lead-to-opportunity conversion is unavailable: no verified
                conversion relationship/history exists.
              </p>
            </Card>
            <Card title="Opportunity performance">
              <Breakdown rows={state.data.opportunityStages} />
              <p>
                Closed-deal win share:{' '}
                {percentage(
                  state.data.opportunityStages.find(
                    (b) => b.category === 'CLOSED_WON',
                  )?.count || 0,
                  state.data.opportunityStages
                    .filter((b) =>
                      ['CLOSED_WON', 'CLOSED_LOST'].includes(b.category),
                    )
                    .reduce((n, b) => n + b.count, 0),
                )}
                . Currently won ÷ currently won or lost; no revenue or
                historical win-rate claim.
              </p>
            </Card>
            <Card title="Task follow-up">
              <Breakdown rows={state.data.taskStatuses} />
              <p>
                Open:{' '}
                {state.data.taskStatuses
                  .filter((b) => ['OPEN', 'IN_PROGRESS'].includes(b.category))
                  .reduce((n, b) => n + b.count, 0)}{' '}
                · Overdue: {state.data.overdueTasks}
              </p>
              <p>
                Completed in period: {state.data.completedInPeriod} · Completion
                share in creation cohort:{' '}
                {percentage(
                  state.data.taskStatuses.find(
                    (b) => b.category === 'COMPLETED',
                  )?.count || 0,
                  state.data.counts.task,
                )}
              </p>
              <button onClick={() => navigate('/tasks')}>Open tasks</button>
            </Card>
            <Card title="Activity summary">
              <Breakdown rows={state.data.activityTypes} />
              <p>Activity occurrence dates; recent list shows up to 10.</p>
              {state.data.recentActivities.map((a) => (
                <p key={a.id}>
                  <button onClick={() => navigate(`/activities?id=${a.id}`)}>
                    {a.subject}
                  </button>{' '}
                  · {new Date(a.occurredAt).toLocaleString()}
                </p>
              ))}
              {!state.data.recentActivities.length && (
                <p>No activities in this scope.</p>
              )}
            </Card>
            <Card title="Notifications">
              <p>
                {notifications.error
                  ? 'Unread count unavailable. Open notifications to retry.'
                  : notifications.data === undefined
                    ? 'Loading unread count…'
                    : `${notifications.data} unread notifications`}
              </p>
              <p>
                Notifications are personal to your active organization and
                session.
              </p>
              <button onClick={() => navigate('/notifications')}>
                Review notifications
              </button>
              <button onClick={() => navigate('/saved-views')}>
                Open saved views
              </button>
            </Card>
          </div>
          {reports && (
            <>
              <Card title="Pipeline breakdown">
                <p>
                  {state.data.pipelineStagesTruncated
                    ? 'First 2,000 groups only. Filter to one pipeline to refine.'
                    : 'Complete stage/currency grouping in the selected scope.'}
                </p>
                <Breakdown
                  rows={state.data.pipelineStages}
                  labels={(b) =>
                    (b.pipelineId
                      ? 'Configured pipeline · ' + b.pipelineId
                      : 'Legacy pipeline') +
                    ' / ' +
                    b.category
                  }
                />
              </Card>
              <Card title="Owner performance">
                <p>
                  {state.data.ownerPerformanceTruncated
                    ? 'First 200 groups only; global counts remain complete. Filter by a member.'
                    : 'Complete owner/stage/currency grouping.'}
                </p>
                <Breakdown
                  rows={state.data.ownerPerformance}
                  labels={(b) => memberName(b.userId) + ' / ' + b.category}
                />
              </Card>
              <Card title="Assignee performance">
                <p>
                  {state.data.assigneePerformanceTruncated
                    ? 'First 200 groups only; filter by member.'
                    : 'Complete assignee/status grouping.'}
                </p>
                <Breakdown
                  rows={state.data.assigneePerformance}
                  labels={(b) => memberName(b.userId) + ' / ' + b.category}
                />
              </Card>
            </>
          )}
        </>
      )}
    </IntelligenceFrame>
  );
}
function Breakdown({
  rows,
  labels = (b) => b.category,
}: {
  rows: Bucket[];
  labels?: (b: Bucket) => string;
}) {
  return rows.length ? (
    <ul>
      {rows.map((b, i) => (
        <li key={i}>
          {labels(b)}: {b.count}
          {b.currency && b.amount
            ? ' · ' + moneyLabel(b.amount, b.currency)
            : ''}
        </li>
      ))}
    </ul>
  ) : (
    <p>No records in this scope.</p>
  );
}
