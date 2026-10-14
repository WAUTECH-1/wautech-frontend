import { useEffect, useState } from 'react';
import { safeError } from '@wautech/wajahat';
import { usePlatform } from './usePlatform';
import type { Member, Organization, Role } from './api';
import { ConfirmDialog } from './ConfirmDialog';
import { useUnsaved } from './useUnsaved';

export default function AdministrationPage() {
  const { api, active, app } = usePlatform();
  const [organization, setOrganization] = useState<Organization>();
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState('');
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState<{
    message: string;
    run: () => Promise<unknown>;
  }>();
  const role =
    app.tenant.status === 'ready' ? app.tenant.organization.role : undefined;
  const canManage = role === 'OWNER' || role === 'ADMIN';
  const actorId =
    app.auth.status === 'authenticated' ? app.auth.user.id : undefined;
  useUnsaved(!!organization && (name !== organization.name || !!userId));
  useEffect(() => {
    if (!canManage) return;
    const controller = new AbortController();
    void Promise.all([
      api.organization(controller.signal),
      api.members(controller.signal),
    ])
      .then(([org, values]) => {
        if (active() && !controller.signal.aborted) {
          setOrganization(org);
          setName(org.name);
          setMembers(values);
          setError('');
        }
      })
      .catch((e) => {
        if (active() && !controller.signal.aborted) setError(safeError(e));
      });
    return () => controller.abort();
  }, [api, active, canManage, revision]);
  async function perform(run: () => Promise<unknown>) {
    setPending(undefined);
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await run();
      if (active()) {
        setUserId('');
        setNotice('Change saved.');
        setRevision((v) => v + 1);
      }
    } catch (e) {
      if (active()) setError(safeError(e));
    } finally {
      if (active()) setBusy(false);
    }
  }
  if (!canManage)
    return (
      <section>
        <h1>Access denied</h1>
        <p>Organization administration requires ADMIN or OWNER membership.</p>
      </section>
    );
  return (
    <section className="platform-page" aria-busy={busy}>
      <h1>Organization administration</h1>
      {error && (
        <p role="alert">
          {error}{' '}
          <button disabled={busy} onClick={() => setRevision((v) => v + 1)}>
            Retry
          </button>
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {!organization && !error && (
        <p role="status">Loading organization and memberships…</p>
      )}
      {organization && (
        <>
          <h2>Current organization</h2>
          <p>Organization ID: {organization.id}</p>
          <p>Your role: {role}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPending({
                message: `Rename this organization to “${name.trim()}”?`,
                run: async () => {
                  const value = await api.saveOrganization(name.trim());
                  if (active()) {
                    setOrganization(value);
                    setName(value.name);
                    await app.selectOrganization(value.id);
                  }
                },
              });
            }}
          >
            <label>
              Organization name
              <input
                required
                maxLength={200}
                value={name}
                disabled={busy}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <button
              disabled={
                busy || !name.trim() || name.trim() === organization.name
              }
            >
              Save organization
            </button>
          </form>
          <h2>Memberships</h2>
          <p>
            Email invitation delivery is unavailable. Create a membership for an
            existing user using the ID provided by your administrator. New
            memberships start as INVITED with VIEWER access; activation is a
            separate confirmed action.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPending({
                message: `Create an INVITED membership for user ${userId.trim()} in this organization? No invitation email will be sent.`,
                run: () => api.createMember(userId.trim()),
              });
            }}
          >
            <label>
              Existing user ID
              <input
                required
                pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
                value={userId}
                disabled={busy}
                onChange={(e) => setUserId(e.target.value)}
              />
            </label>
            <button disabled={busy || !userId.trim()}>Create membership</button>
          </form>
          {members.length === 0 ? (
            <p>No memberships were returned for this organization.</p>
          ) : (
            <div className="platform-table">
              <table>
                <caption>Current organization memberships</caption>
                <thead>
                  <tr>
                    <th scope="col">User ID</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => {
                    const own = member.userId === actorId;
                    const protectedOwner =
                      member.role === 'OWNER' && role !== 'OWNER';
                    const assignable: Role[] =
                      role === 'OWNER'
                        ? ['OWNER', 'ADMIN', 'SALES_USER', 'VIEWER']
                        : ['ADMIN', 'SALES_USER', 'VIEWER'];
                    return (
                      <tr key={member.id}>
                        <td>
                          {member.userId}
                          {own ? ' (you)' : ''}
                        </td>
                        <td>
                          <select
                            aria-label={`Role for ${member.userId}`}
                            value={member.role}
                            disabled={
                              busy ||
                              own ||
                              protectedOwner ||
                              member.status === 'REVOKED'
                            }
                            onChange={(e) => {
                              const next = e.target.value as Role;
                              setPending({
                                message: `Change ${member.userId} from ${member.role} to ${next}?`,
                                run: () => api.setRole(member.id, next),
                              });
                            }}
                          >
                            {[...new Set([member.role, ...assignable])].map(
                              (value) => (
                                <option key={value} value={value}>
                                  {value}
                                </option>
                              ),
                            )}
                          </select>
                        </td>
                        <td>{member.status}</td>
                        <td>
                          {role === 'OWNER' &&
                            !own &&
                            member.status === 'ACTIVE' && (
                              <button
                                disabled={busy}
                                onClick={() =>
                                  setPending({
                                    message: `Transfer ownership to ${member.userId}? They will become OWNER and your membership will become ADMIN.`,
                                    run: async () => {
                                      await api.transferOwnership(member.id);
                                      if (active()) app.reloadOrganizations();
                                    },
                                  })
                                }
                              >
                                Transfer ownership
                              </button>
                            )}
                          {member.status === 'ACTIVE' ? (
                            <button
                              disabled={busy || own || protectedOwner}
                              onClick={() =>
                                setPending({
                                  message: `Deactivate ${member.userId}'s membership in this organization?`,
                                  run: () =>
                                    api.setStatus(member.id, 'SUSPENDED'),
                                })
                              }
                            >
                              Deactivate
                            </button>
                          ) : member.status !== 'REVOKED' ? (
                            <button
                              disabled={busy || protectedOwner}
                              onClick={() =>
                                setPending({
                                  message: `Activate ${member.userId}'s membership in this organization?`,
                                  run: () => api.setStatus(member.id, 'ACTIVE'),
                                })
                              }
                            >
                              Activate
                            </button>
                          ) : (
                            <span>Revoked</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p>
            Self role changes are disabled. OWNER protection and tenant
            authorization are enforced by the server.
          </p>
        </>
      )}
      {pending && (
        <ConfirmDialog
          message={pending.message}
          onCancel={() => setPending(undefined)}
          onConfirm={() => void perform(pending.run)}
        />
      )}
    </section>
  );
}
