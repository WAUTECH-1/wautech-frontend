import type { ReactNode } from 'react';
import { navigate } from './history';
import type { AppPath } from './routes';
export function Link({
  to,
  children,
  className,
  current = false,
}: {
  to: AppPath;
  children: ReactNode;
  className?: string;
  current?: boolean;
}) {
  return (
    <a
      href={to}
      className={className}
      aria-current={current ? 'page' : undefined}
      onClick={(event) => {
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        event.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}
