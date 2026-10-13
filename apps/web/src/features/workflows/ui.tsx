import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import './workflows.css';
export function WorkflowFrame({
  title,
  busy = false,
  onRefresh,
  children,
}: {
  title: string;
  busy?: boolean;
  onRefresh: () => void;
  children: ReactNode;
}) {
  return (
    <section className="workflow-feature">
      <div className="workflow-heading">
        <h2>{title}</h2>
        <button disabled={busy} onClick={onRefresh}>
          Refresh workflows
        </button>
      </div>
      {children}
    </section>
  );
}
export function Confirmation({
  message,
  onCancel,
  onConfirm,
}: {
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="workflow-dialog"
      aria-labelledby="workflow-confirm-title"
      onCancel={onCancel}
    >
      <h2 id="workflow-confirm-title">Confirm workflow action</h2>
      <p>{message}</p>
      <div className="workflow-actions">
        <button autoFocus onClick={onCancel}>
          Cancel
        </button>
        <button onClick={onConfirm}>Confirm action</button>
      </div>
    </dialog>
  );
}
export function LoadState({
  error,
  loading,
  onRetry,
}: {
  error?: string;
  loading: boolean;
  onRetry: () => void;
}) {
  return error ? (
    <p role="alert">
      {error} <button onClick={onRetry}>Retry workflow</button>
    </p>
  ) : loading ? (
    <p role="status">Loading authorized workflows…</p>
  ) : null;
}
