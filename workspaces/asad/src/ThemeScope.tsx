import type { ReactNode } from 'react';
import type { Theme } from './contracts';
/** Controlled scope for embedding widgets inside a host's existing shell. */
export function ThemeScope({
  theme,
  children,
  className = '',
}: {
  theme: Theme;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`wautech-dashboard dashboard-scope ${className}`}
      data-theme={theme}
    >
      {children}
    </div>
  );
}
