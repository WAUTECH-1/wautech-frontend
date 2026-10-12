import { useEffect, useState } from 'react';
import { safeError } from '@wautech/wajahat';
import { usePlatform } from './usePlatform';
import type { Profile } from './api';
import { useUnsaved } from './useUnsaved';
export default function ProfilePage() {
  const { api, active } = usePlatform();
  const [profile, setProfile] = useState<Profile>();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useUnsaved(
    !!profile &&
      (firstName !== profile.firstName || lastName !== profile.lastName),
  );
  useEffect(() => {
    const controller = new AbortController();
    void api
      .profile(controller.signal)
      .then((value) => {
        if (active() && !controller.signal.aborted) {
          setProfile(value);
          setFirstName(value.firstName);
          setLastName(value.lastName);
          setError('');
        }
      })
      .catch((e) => {
        if (active() && !controller.signal.aborted) setError(safeError(e));
      });
    return () => controller.abort();
  }, [api, active, revision]);
  return (
    <section className="platform-page">
      <h1>Your profile</h1>
      {error && (
        <p role="alert">
          {error}{' '}
          <button onClick={() => setRevision((v) => v + 1)}>Retry</button>
        </p>
      )}
      {!profile && !error && <p role="status">Loading profile…</p>}
      {profile && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            setSaved(false);
            setError('');
            void api
              .saveProfile(firstName.trim(), lastName.trim())
              .then((value) => {
                if (active()) {
                  setProfile(value);
                  setFirstName(value.firstName);
                  setLastName(value.lastName);
                  setSaved(true);
                }
              })
              .catch((e) => {
                if (active()) setError(safeError(e));
              })
              .finally(() => {
                if (active()) setBusy(false);
              });
          }}
        >
          <p>{profile.email}</p>
          <p>Your sign-in email is managed by an administrator.</p>
          <label>
            First name
            <input
              required
              maxLength={100}
              value={firstName}
              disabled={busy}
              onChange={(e) => {
                setFirstName(e.target.value);
                setSaved(false);
              }}
            />
          </label>
          <label>
            Last name
            <input
              required
              maxLength={100}
              value={lastName}
              disabled={busy}
              onChange={(e) => {
                setLastName(e.target.value);
                setSaved(false);
              }}
            />
          </label>
          <button disabled={busy || !firstName.trim() || !lastName.trim()}>
            {busy ? 'Saving…' : 'Save profile'}
          </button>
          {saved && (
            <p role="status">
              Profile saved. The session display name refreshes on your next
              sign-in.
            </p>
          )}
        </form>
      )}
    </section>
  );
}
