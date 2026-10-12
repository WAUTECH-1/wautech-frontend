import type { ReactNode } from 'react';
import type { DataState } from './contracts';
import { DataBoundary as Boundary } from './presentation';
export { Card, Icon } from './primitives';
/** Sprint 1 standalone compatibility adapters. Hosts must use integration.ts instead. */
export function DataBoundary(props: {
  state: DataState;
  retry: () => void;
  children: ReactNode;
}) {
  return <Boundary {...props} demo />;
}
export function PerformanceChart({ period }: { period: string }) {
  const values =
    period === 'This quarter'
      ? [22, 36, 28, 52, 44, 68, 58, 76, 64, 89, 78, 96]
      : [35, 28, 45, 38, 58, 49, 67, 56, 75, 66, 84, 78];
  return (
    <div className="chart">
      <div className="chart-axis">
        <span>$100k</span>
        <span>$75k</span>
        <span>$50k</span>
        <span>$25k</span>
        <span>$0</span>
      </div>
      <div className="plot">
        <div className="gridlines" />
        <div className="bars">
          {values.map((v, i) => (
            <div className="bar-pair" key={i}>
              <div
                className="bar previous"
                style={{ height: `${v * 0.68}%` }}
              />
              <div
                className="bar current"
                style={{ height: `${v}%` }}
                tabIndex={0}
                aria-label={`Sample ${i + 1}: opportunity value ${v} thousand dollars`}
              >
                <span className="tooltip">
                  Sample {i + 1}: ${v}k
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="chart-labels">
          {['W1', 'W3', 'W5', 'W7', 'W9', 'W11'].map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
