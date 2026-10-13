import { Card } from '@wautech/asad';
import type { ReactNode } from 'react';
import type { Dataset } from './data';
import type { LoadState } from './runtime';
import { moneyLabel } from './money';
import './intelligence.css';
export function IntelligenceFrame({
  title,
  children,
  onRefresh,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onRefresh: () => void;
  busy?: boolean;
}) {
  return (
    <section className="intelligence-feature">
      <div className="intelligence-heading">
        <h2>{title}</h2>
        <button disabled={busy} onClick={onRefresh}>
          {busy ? 'Refreshing…' : 'Refresh data'}
        </button>
      </div>
      {children}
    </section>
  );
}
export function LoadBoundary<T>({
  state,
  children,
}: {
  state: LoadState<T>;
  children: (data: T) => ReactNode;
}) {
  return state.status === 'loading' ? (
    <p role="status">Loading authorized intelligence data…</p>
  ) : state.status === 'error' ? (
    <p role="alert">{state.message}</p>
  ) : (
    <>{children(state.data)}</>
  );
}
export function Source<T>({
  data,
  children,
}: {
  data: Dataset<T>;
  children: (value: T) => ReactNode;
}) {
  return data.status === 'error' ? (
    <p role="alert">{data.message}</p>
  ) : (
    <>{children(data.value)}</>
  );
}
export function MoneyTotals({ totals }: { totals: Record<string, string> }) {
  return Object.keys(totals).length ? (
    <ul className="intelligence-money">
      {Object.entries(totals)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([currency, amount]) => (
          <li key={currency}>{moneyLabel(amount, currency)}</li>
        ))}
    </ul>
  ) : (
    <p>No valued opportunities in this scope.</p>
  );
}
export function UnavailableMetrics() {
  return (
    <Card title="Metrics not yet available">
      <p>
        Historical trends, growth rates, forecasts and recognized revenue are
        unavailable. CLOSED_WON opportunity value is not recognized revenue.
      </p>
      <p>
        Owner-based summaries and true lead-to-opportunity conversion are
        unavailable: the verified contracts do not provide ownership or
        conversion links.
      </p>
    </Card>
  );
}
