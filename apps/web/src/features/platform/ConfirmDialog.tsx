import { useEffect, useRef } from 'react';
export function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
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
      className="platform-dialog"
      ref={ref}
      aria-labelledby="confirmation-title"
      onCancel={onCancel}
    >
      <h2 id="confirmation-title">Confirm change</h2>
      <p>{message}</p>
      <div className="platform-actions">
        <button autoFocus onClick={onCancel}>
          Cancel
        </button>
        <button onClick={onConfirm}>Confirm</button>
      </div>
    </dialog>
  );
}
