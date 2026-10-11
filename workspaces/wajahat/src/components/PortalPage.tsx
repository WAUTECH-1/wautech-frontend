import { useState } from 'react';
import { safeError } from '../api/auth-api';
import { organizationCapability } from '../auth/session';
import type { AuthenticatedUser } from '../auth/types';

interface Props {
  user: AuthenticatedUser;
  organizations: boolean;
  onLogout(): Promise<void>;
}

export default function PortalPage({ user, organizations, onLogout }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function logout() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await onLogout();
    } catch (failure) {
      setError(`Sign out could not be confirmed. ${safeError(failure)}`);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="portal-layout">
      <div className="portal-heading">
        <div>
          <div className="eyebrow">YOUR ACCOUNT</div>
          <h1>
            Welcome, {user.firstName || 'there'}
            <span>.</span>
          </h1>
          <p className="muted">Your connection to WAUTECH Intelligence.</p>
        </div>
        <button className="secondary-button" onClick={logout} disabled={busy}>
          {busy ? 'Signing out…' : 'Sign out'} <span aria-hidden="true">↗</span>
        </button>
      </div>
      {error && (
        <div className="error-notice" role="alert">
          {error}
        </div>
      )}
      <nav className="portal-tabs" aria-label="Account navigation">
        <a href="/portal" aria-current={!organizations ? 'page' : undefined}>
          Profile
        </a>
        <a
          href="/organizations"
          aria-current={organizations ? 'page' : undefined}
        >
          Organizations
        </a>
      </nav>
      <div className="portal-grid">
        {!organizations && (
          <article className="glass-panel profile-card">
            <div className="card-label">
              PERSONAL PROFILE <span aria-hidden="true">↗</span>
            </div>
            <div className="avatar" aria-hidden="true">
              {(user.firstName[0] || user.email[0]).toUpperCase()}
              {user.lastName[0]?.toUpperCase()}
            </div>
            <h2>
              {`${user.firstName} ${user.lastName}`.trim() || 'Your profile'}
            </h2>
            <p className="muted">{user.email}</p>
            <dl>
              <div>
                <dt>Account ID</dt>
                <dd>{user.id}</dd>
              </div>
              <div>
                <dt>Session</dt>
                <dd className="session-label">
                  <span /> Verified with the server
                </dd>
              </div>
            </dl>
          </article>
        )}
        <article className="glass-panel organization-card">
          <div className="card-label">
            ORGANIZATION ACCESS <span aria-hidden="true">◇</span>
          </div>
          <div className="organization-illustration" aria-hidden="true">
            <span />
            <span />
            <span />
            <i />
          </div>
          <span className="subtle-badge">Not yet available</span>
          <h2>Your team’s space.</h2>
          <p className="muted">{organizationCapability.message}</p>
          <div className="organization-facts">
            <div>
              <span>Current organization</span>
              <strong>Not selected</strong>
            </div>
            <div>
              <span>Membership & role</span>
              <strong>Unavailable</strong>
            </div>
          </div>
          <p className="help-note">
            No organization permissions are inferred from this screen.
          </p>
        </article>
      </div>
    </section>
  );
}
