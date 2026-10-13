import { useEffect } from 'react';
import { addNavigationGuard } from '../../routing/history';
export function useUnsaved(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    const remove = addNavigationGuard(() =>
      window.confirm('Discard unsaved changes?'),
    );
    return () => {
      remove();
      window.removeEventListener('beforeunload', handler);
    };
  }, [dirty]);
}
