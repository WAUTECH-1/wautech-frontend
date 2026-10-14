import { useCallback, useState } from 'react';
import { useOperations } from '../operations/hooks';
import { useLoad } from '../workflows/hooks';
import { WorkflowFrame, LoadState, Confirmation } from '../workflows/ui';
import { document, website } from './api';
import { navigate } from '../../routing/history';
import './business.css';
const fields = {
  businessName: 'Business name',
  industry: 'Industry',
  products: 'Products or services',
  challenge: 'Primary business challenge',
  shortTermGoal: 'Short-term business goal',
  desiredOutcome: 'Desired outcome',
};
export default function Profile() {
  const api = useOperations(),
    [revision, setRevision] = useState(0);
  const load = useCallback(
    async (signal: AbortSignal) =>
      document(await api.read('/business/profile', signal)),
    [api],
  );
  const state = useLoad(String(revision), load);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [consent, setConsent] = useState(false),
    [deleting, setDeleting] = useState(false);
  async function save(form: HTMLFormElement) {
    if (!state.data) return;
    setBusy(true);
    setError('');
    try {
      const d = new FormData(form),
        url = String(d.get('website') || '').trim();
      website(url);
      if (!consent)
        throw Error('Confirm organization-visible storage consent.');
      await api.write('/business/profile', 'PUT', {
        version: state.data.version,
        ...Object.fromEntries(
          Object.keys(fields).map((k) => [k, String(d.get(k) || '').trim()]),
        ),
        stage: String(d.get('stage') || ''),
        website: url,
        teamSize: d.get('teamSize') ? Number(d.get('teamSize')) : null,
        storageConsent: true,
        advisorSharingAllowed: d.get('advisorSharingAllowed') === 'on',
      });
      if (api.active()) {
        setConsent(false);
        setRevision((v) => v + 1);
      }
    } catch (e) {
      if (api.active())
        setError(
          e instanceof Error ? e.message : 'Business profile unavailable.',
        );
    } finally {
      if (api.active()) setBusy(false);
    }
  }
  async function remove() {
    if (!state.data) return;
    setBusy(true);
    setDeleting(false);
    try {
      await api.write(
        '/business/profile?version=' + state.data.version,
        'DELETE',
      );
      if (api.active()) setRevision((v) => v + 1);
    } catch (e) {
      if (api.active())
        setError(
          e instanceof Error ? e.message : 'Could not clear business profile.',
        );
    } finally {
      if (api.active()) setBusy(false);
    }
  }
  return (
    <WorkflowFrame
      title="Your business context"
      busy={busy}
      onRefresh={() => setRevision((v) => v + 1)}
    >
      <div className="business-content">
        <p>
          This is organization-visible, user-provided context. It is separate
          from verified CRM totals and AI-generated hypotheses. Every question
          is optional.
        </p>
        <p>
          OWNER/ADMIN can correct or delete this profile. Website addresses are
          stored as text and are never automatically fetched.
        </p>
        <LoadState
          error={state.error}
          loading={!state.data && !state.error}
          onRetry={() => setRevision((v) => v + 1)}
        />
        {error && <p role="alert">{error}</p>}
        {state.data && (
          <form
            key={state.data.version}
            onSubmit={(e) => {
              e.preventDefault();
              void save(e.currentTarget);
            }}
          >
            <fieldset disabled={!api.admin || busy}>
              <legend>Organization business profile</legend>
              {Object.entries(fields).map(([key, label]) => (
                <label key={key}>
                  {label} (optional)
                  {[
                    'products',
                    'challenge',
                    'shortTermGoal',
                    'desiredOutcome',
                  ].includes(key) ? (
                    <textarea
                      name={key}
                      maxLength={key === 'products' ? 1000 : 500}
                      defaultValue={String(state.data?.data?.[key] || '')}
                    />
                  ) : (
                    <input
                      name={key}
                      maxLength={key === 'industry' ? 100 : 200}
                      defaultValue={String(state.data?.data?.[key] || '')}
                    />
                  )}
                </label>
              ))}
              <label>
                Business stage (optional)
                <select
                  name="stage"
                  defaultValue={String(state.data.data?.stage || '')}
                >
                  <option value="">Skip</option>
                  {['IDEA', 'EARLY', 'GROWTH', 'ESTABLISHED', 'RECOVERY'].map(
                    (s) => (
                      <option key={s}>{s}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Website URL (optional)
                <input
                  type="url"
                  name="website"
                  maxLength={2000}
                  defaultValue={String(state.data.data?.website || '')}
                />
              </label>
              <label>
                Team size (optional)
                <input
                  type="number"
                  name="teamSize"
                  min={0}
                  max={1000000}
                  step={1}
                  defaultValue={
                    state.data.data?.teamSize === null
                      ? ''
                      : String(state.data.data?.teamSize ?? '')
                  }
                />
              </label>
              <label className="business-check">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                I agree to store this context for organization members until
                corrected or deleted. AI sharing is a separate per-user and
                per-question choice.
              </label>
              <label className="business-check">
                <input
                  type="checkbox"
                  name="advisorSharingAllowed"
                  defaultChecked={
                    state.data.data?.advisorSharingAllowed === true
                  }
                />
                As an OWNER/ADMIN, allow this organization's business profile
                and sampled goals to be shared with the configured AI advisor
                when a member also gives private and per-question consent. This
                may transmit business data to the provider under its retention
                policy.
              </label>
              <button disabled={!consent}>Save business profile</button>
            </fieldset>
            {!api.admin && (
              <p role="status">
                Your membership can view this shared profile. Ask an OWNER or
                ADMIN to change it.
              </p>
            )}
            <button
              type="button"
              disabled={busy || !api.admin || state.data.version === 0}
              onClick={() => setDeleting(true)}
            >
              Delete shared business profile
            </button>
            <button
              type="button"
              onClick={() => navigate('/business-onboarding')}
            >
              Manage my private preferences
            </button>
            <button type="button" onClick={() => navigate('/business-goals')}>
              Review goals and milestones
            </button>
          </form>
        )}
        {deleting && (
          <Confirmation
            message="Delete the shared business profile and invalidate copied advisor context for all organization sessions? Goals, personal preferences and CRM records remain. Provider copies already sent follow provider retention."
            onCancel={() => setDeleting(false)}
            onConfirm={() => void remove()}
          />
        )}
      </div>
    </WorkflowFrame>
  );
}
