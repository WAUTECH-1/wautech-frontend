import { Link } from '../routing/Link';
export type StatusKind =
  | 'checking'
  | 'unavailable'
  | 'unauthorized'
  | 'expired'
  | 'denied'
  | 'organization'
  | 'not-found';
const content: Record<
  StatusKind,
  { title: string; description: string; label: string }
> = {
  checking: {
    title: 'Verifying your session',
    description:
      'Your workspace stays protected while we check your backend session.',
    label: 'SESSION CHECK',
  },
  unavailable: {
    title: 'Connection unavailable',
    description:
      'Your session could not be verified. Private application content remains closed.',
    label: 'CONNECTION',
  },
  unauthorized: {
    title: 'Sign in to continue',
    description:
      'A verified session is required to open this part of your workspace.',
    label: 'SESSION REQUIRED',
  },
  expired: {
    title: 'Your session expired',
    description:
      'Sign in again to continue. Your active organization and private content have been cleared.',
    label: 'SESSION EXPIRED',
  },
  denied: {
    title: 'Access denied',
    description:
      'The server denied access. Sign in with an authorized account or contact your administrator.',
    label: 'ACCESS',
  },
  organization: {
    title: 'Organization access unavailable',
    description:
      'Choose an active organization or refresh organization access. Business data remains unavailable until your membership is verified.',
    label: 'ORGANIZATION REQUIRED',
  },
  'not-found': {
    title: 'Page not found',
    description: 'This address does not match an application route.',
    label: '404',
  },
};
export function StatusPanel({
  kind,
  onRetry,
}: {
  kind: StatusKind;
  onRetry?: () => void;
}) {
  const item = content[kind];
  return (
    <section
      className="foundation-status"
      role={kind === 'unavailable' || kind === 'denied' ? 'alert' : 'status'}
      aria-busy={kind === 'checking'}
    >
      <span className="foundation-eyebrow">{item.label}</span>
      <div className="foundation-symbol" aria-hidden="true">
        {kind === 'checking' ? '◌' : kind === 'organization' ? '◇' : '↗'}
      </div>
      <h1>{item.title}</h1>
      <p>{item.description}</p>
      {kind === 'checking' ? (
        <div className="foundation-loading" aria-hidden="true" />
      ) : (
        <div className="foundation-actions">
          {onRetry && (
            <button className="foundation-primary" onClick={onRetry}>
              Retry session check
            </button>
          )}
          <Link
            to={kind === 'not-found' ? '/dashboard' : '/login'}
            className="foundation-link"
          >
            {kind === 'not-found' ? 'Go to dashboard' : 'Go to sign in'} →
          </Link>
        </div>
      )}
    </section>
  );
}
