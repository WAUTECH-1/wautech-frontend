import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { CrmApi } from './api';
import type { User } from './contracts';
import { Workspace } from './Workspace';

export default function App() {
  const [organization, setOrganization] = useState('');
  const [connection, setConnection] = useState<{
    organization: string;
    user: User;
  } | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const api = useMemo(
    () =>
      new CrmApi(
        import.meta.env.VITE_API_BASE_URL || '',
        connection?.organization || '',
      ),
    [connection],
  );
  async function connect(event: FormEvent, existing = false) {
    event.preventDefault();
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        organization.trim(),
      )
    ) {
      setError('Enter the organization UUID supplied by your administrator.');
      return;
    }
    setBusy(true);
    setError('');
    const access = new CrmApi(
      import.meta.env.VITE_API_BASE_URL || '',
      organization.trim(),
    );
    try {
      const user = existing
        ? await access.me()
        : await access.login(email, password);
      setPassword('');
      await access.list('companies');
      setConnection({ organization: organization.trim(), user });
    } catch (e) {
      setPassword('');
      setError(e instanceof Error ? e.message : 'Could not connect.');
    } finally {
      setBusy(false);
    }
  }
  async function disconnect() {
    setBusy(true);
    setError('');
    try {
      await api.logout();
      setConnection(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign out.');
    } finally {
      setBusy(false);
    }
  }
  if (connection)
    return (
      <Workspace
        api={api}
        user={connection.user}
        organization={connection.organization}
        onDisconnect={disconnect}
        disconnectBusy={busy}
        accessError={error}
      />
    );
  return (
    <main className="access-page">
      <div className="access-story">
        <div className="brand">
          <span className="brand-mark">W</span> WAUTECH{' '}
          <small>INTELLIGENCE</small>
        </div>
        <div>
          <p className="eyebrow">CRM OPERATIONS / UMER WORKSPACE</p>
          <h1>
            Good relationships.
            <br />
            Better business.
          </h1>
          <p>
            Your companies, contacts, leads and opportunities.
            <br />
            One focused place to move work forward.
          </p>
        </div>
        <p className="muted">Independent development workspace · Sprint 01</p>
      </div>
      <section className="access-card">
        <p className="eyebrow">DEVELOPMENT ACCESS</p>
        <h2>Connect to your CRM</h2>
        <p>
          Use a provisioned backend account and an active organization
          membership.
        </p>
        <form onSubmit={connect}>
          <label>
            Organization UUID
            <input
              required
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="Administrator-provided organization ID"
            />
          </label>
          <label>
            Email
            <input
              required
              type="email"
              autoComplete="username"
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              required
              type="password"
              autoComplete="current-password"
              maxLength={256}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy ? 'Connecting…' : 'Sign in & open CRM →'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={(e) => void connect(e, true)}
          >
            Use existing backend session
          </button>
        </form>
        <p className="small muted">
          Access uses backend session cookies. Credentials stay in memory and
          are cleared after sign-in.
        </p>
      </section>
    </main>
  );
}
