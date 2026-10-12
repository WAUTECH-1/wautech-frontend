import type { ReactNode } from 'react';
import type { PerformanceSeries, DataState } from './contracts';
import { formatMoney } from './preferences';
import { Card, Icon } from './primitives';
export { Card, Icon };
export function PerformanceChart({ series }: { series: PerformanceSeries }) {
  const valid =
    /^[A-Z]{3}$/.test(series.currency) &&
    (!series.summary ||
      (series.summary.currency === series.currency &&
        Number.isFinite(series.summary.amount) &&
        series.summary.amount >= 0)) &&
    series.points.every(
      (p) =>
        Number.isFinite(p.current) &&
        p.current >= 0 &&
        (p.previous === undefined ||
          (Number.isFinite(p.previous) && p.previous >= 0)),
    );
  if (!valid) return <p role="alert">Performance data is invalid.</p>;
  if (!series.points.length)
    return <p className="muted">No performance data available.</p>;
  const maximum = Math.max(
    1,
    ...series.points.flatMap((p) => [p.current, p.previous || 0]),
  );
  const format = (amount: number) =>
    formatMoney({ amount, currency: series.currency });
  return (
    <div
      className="chart"
      role="group"
      aria-label={`${series.description} (${series.currency})`}
    >
      <div className="chart-axis">
        {[1, 0.75, 0.5, 0.25, 0].map((f) => (
          <span key={f}>{format(maximum * f)}</span>
        ))}
      </div>
      <div className="plot">
        <div className="gridlines" />
        <div className="bars">
          {series.points.map((point, i) => (
            <div className="bar-pair" key={`${point.label}-${i}`}>
              {point.previous !== undefined && (
                <div
                  className="bar previous"
                  style={{ height: `${(point.previous / maximum) * 100}%` }}
                />
              )}
              <div
                className="bar current"
                style={{ height: `${(point.current / maximum) * 100}%` }}
                tabIndex={0}
                aria-label={`${point.label}: opportunity value ${format(point.current)}${point.previous === undefined ? '' : `; previous ${format(point.previous)}`}`}
              >
                <span className="tooltip">
                  {point.label}: {format(point.current)}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="chart-labels">
          {series.points
            .filter(
              (_, i) =>
                i % Math.max(1, Math.ceil(series.points.length / 6)) === 0,
            )
            .map((p, i) => (
              <span key={i}>{p.label}</span>
            ))}
        </div>
      </div>
    </div>
  );
}
export function DataBoundary({
  state,
  retry,
  children,
  demo = false,
  errorMessage,
}: {
  state: DataState;
  retry?: () => void;
  children: ReactNode;
  demo?: boolean;
  errorMessage?: string;
}) {
  if (state === 'ready') return children;
  return (
    <section
      className="card data-state"
      role={state === 'error' ? 'alert' : 'status'}
      aria-busy={state === 'loading'}
    >
      <Icon name="Overview" size={36} />
      <h2>
        {state === 'loading'
          ? 'Loading your workspace'
          : state === 'empty'
            ? 'A fresh start'
            : 'Unable to load this view'}
      </h2>
      <p>
        {state === 'loading'
          ? demo
            ? 'Demonstration of the loading experience.'
            : 'Loading dashboard data.'
          : state === 'empty'
            ? 'No records yet. Your overview will appear once data is available.'
            : demo
              ? 'Simulated error. No backend request was made.'
              : errorMessage ||
                'Dashboard data is unavailable. Please try again.'}
      </p>
      {retry && (
        <button className="primary" onClick={retry}>
          {demo ? 'Return to demo data' : 'Retry'}
        </button>
      )}
    </section>
  );
}
