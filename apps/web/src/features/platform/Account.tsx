import { useState } from 'react';
import { safeError } from '@wautech/wajahat';
import { useFeatureApplication } from '../contract';
import { Organizations } from '../../components/Organizations';
import { navigate } from '../../routing/history';
import { ConfirmDialog } from './ConfirmDialog';
export default function AccountPage() {
  const app = useFeatureApplication();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <section className="platform-page">
      <h1>Account settings</h1>
      <Organizations />
      <h2>Appearance</h2>
      <p>
        Use the Theme selector in the application shell. Your preference is
        saved on this device.
      </p>
      <h2>Security</h2>
      <p>
        Password reset, email verification and multi-factor authentication are
        unavailable. Contact your administrator for account recovery.
      </p>
      <p>
        Signing out ends this server session and clears the active organization.
      </p>
      <button disabled={busy} onClick={() => setConfirm(true)}>
        {busy ? 'Signing out…' : 'Sign out'}
      </button>
      {error && <p role="alert">{error}</p>}
      {confirm && (
        <ConfirmDialog
          message="Sign out of this session?"
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            setConfirm(false);
            setBusy(true);
            void app.session
              .logout()
              .then(() => navigate('/login'))
              .catch((e) => {
                setError(safeError(e));
                setBusy(false);
              });
          }}
        />
      )}
    </section>
  );
}
