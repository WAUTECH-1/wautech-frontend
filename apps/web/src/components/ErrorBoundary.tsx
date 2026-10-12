import { Component } from 'react';
import type { ReactNode } from 'react';
export function ErrorFallback({ onReset }: { onReset: () => void }) {
  return (
    <section className="foundation-status" role="alert">
      <span className="foundation-eyebrow">APPLICATION ERROR</span>
      <h1>Unable to open the application</h1>
      <p>
        Check the application configuration or reload to try again. Private
        content is not displayed.
      </p>
      <button className="foundation-primary" onClick={onReset}>
        Reload application
      </button>
    </section>
  );
}
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <ErrorFallback onReset={() => window.location.reload()} />
    ) : (
      this.props.children
    );
  }
}
