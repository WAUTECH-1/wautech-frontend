import type { ReactNode } from 'react';
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    Overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    Companies: 'M4 21V3h12v18 M16 9h4v12 M8 7h4 M8 11h4 M8 15h4 M2 21h20',
    Contacts:
      'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
    Leads: 'M12 3v18 M3 12h18 M5 5l14 14 M19 5L5 19',
    Opportunities: 'M4 7h16v14H4z M9 7V3h6v4 M4 12h16',
    'Sales pipeline': 'M3 4h18L14 12v7l-4 2v-9z',
    Activities: 'M3 12h4l3-8 4 16 3-8h4',
    Tasks: 'M9 5h11 M9 12h11 M9 19h11 M3 5l1 1 2-3 M3 12l1 1 2-3 M3 19l1 1 2-3',
    Settings:
      'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2',
    search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6',
    bell: 'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5z M10 21h4',
    arrow: 'M5 12h14 M14 7l5 5-5 5',
    menu: 'M4 6h16 M4 12h16 M4 18h16',
    close: 'M5 5l14 14 M19 5L5 19',
    spark: 'M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z',
    up: 'M4 16l6-6 4 4 6-10 M14 4h6v6',
    chevron: 'M8 4l8 8-8 8',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2',
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.Overview} />
    </svg>
  );
}
export function Card({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      <div className="card-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
