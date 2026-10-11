interface Props {
  kind: 'checking' | 'unavailable' | 'unauthorized' | 'denied' | 'not-found';
  message?: string;
  onRetry?: () => void;
}

const content = {
  checking: [
    'ONE MOMENT',
    'Opening your workspace.',
    'Checking your session securely.',
  ],
  unavailable: [
    'CONNECTION INTERRUPTED',
    'We couldn’t connect.',
    'Please try again shortly.',
  ],
  unauthorized: [
    'SIGN IN REQUIRED',
    'Your workspace is private.',
    'Sign in with your work email to continue.',
  ],
  denied: [
    'ACCESS DENIED',
    'This space needs permission.',
    'Your account does not have access to this request. Contact your organization administrator.',
  ],
  'not-found': [
    'PAGE NOT FOUND',
    'Let’s get you back.',
    'This page could not be found.',
  ],
} as const;

export default function StatusPage({ kind, message, onRetry }: Props) {
  const [label, title, detail] = content[kind];
  return (
    <section
      className="status-page glass-panel"
      aria-busy={kind === 'checking'}
    >
      <div className="status-symbol" aria-hidden="true">
        {kind === 'checking' ? <span className="spinner" /> : '◇'}
      </div>
      <div className="eyebrow">{label}</div>
      <h1>{title}</h1>
      <p className="muted" role="status">
        {message || detail}
      </p>
      {kind === 'unavailable' && (
        <button className="primary-button" onClick={onRetry}>
          Try again <span aria-hidden="true">↗</span>
        </button>
      )}
      {kind !== 'checking' && (
        <a className="text-link" href="/login">
          Return to sign in <span aria-hidden="true">→</span>
        </a>
      )}
    </section>
  );
}
