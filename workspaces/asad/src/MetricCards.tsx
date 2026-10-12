import { Icon } from './primitives';
import type { Metric } from './contracts';
export function MetricCards({ metrics }: { metrics: readonly Metric[] }) {
  return (
    <>
      {' '}
      <div className="metrics">
        {metrics.map((m, i) => (
          <section className="card metric" key={m.id}>
            <div className="metric-top">
              <span>{m.label}</span>
              <span className={`metric-icon tone-${i}`}>
                <Icon name={m.icon} />
              </span>
            </div>
            <div className="metric-value">
              {m.value}
              {m.trend && (
                <svg
                  className="sparkline"
                  viewBox="0 0 90 30"
                  aria-hidden="true"
                >
                  <polyline
                    points={m.trend
                      .map(
                        (v, i) =>
                          `${(i / Math.max(1, m.trend!.length - 1)) * 88},${30 - (v / Math.max(1, ...m.trend!)) * 28}`,
                      )
                      .join(' ')}
                  />
                </svg>
              )}
            </div>
            {m.change && (
              <div className="metric-foot">
                {m.change && <span className="positive">{m.change}</span>}
                <span>vs. previous period</span>
              </div>
            )}
            <small>{m.detail}</small>
          </section>
        ))}
      </div>
    </>
  );
}
