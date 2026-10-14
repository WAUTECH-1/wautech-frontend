import { useCallback, useState } from 'react';
import { useOperations } from '../operations/hooks';
import { useLoad } from '../workflows/hooks';
import { WorkflowFrame, LoadState, Confirmation } from '../workflows/ui';
import { document, journeys, journeyCopy } from './api';
import { navigate } from '../../routing/history';
import './business.css';
export default function Onboarding() {
  const api = useOperations(),
    [revision, setRevision] = useState(0);
  const load = useCallback(
    async (signal: AbortSignal) =>
      document(await api.read('/business/preferences', signal)),
    [api],
  );
  const state = useLoad(String(revision), load);
  const [journey, setJourney] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [consent, setConsent] = useState(false),
    [confirmDelete, setConfirmDelete] = useState(false);
  const currentJourney =
    journey || String(state.data?.data?.journey || 'UNDECIDED');
  async function save(form: HTMLFormElement, skip = false) {
    if (!state.data) return;
    setBusy(true);
    setError('');
    const data = new FormData(form),
      value = (name: string) =>
        skip ? '' : String(data.get(name) || '').trim();
    try {
      if (!consent)
        throw Error(
          'Confirm private storage consent first. You may skip every optional answer.',
        );
      await api.write(
        '/business/preferences',
        'PUT',
        {
          version: state.data.version,
          journey: skip ? 'UNDECIDED' : String(data.get('journey')),
          userRole: value('userRole'),
          challenge: value('challenge'),
          shortTermGoal: value('shortTermGoal'),
          desiredOutcome: value('desiredOutcome'),
          planningStyle: skip ? 'FLEXIBLE' : String(data.get('planningStyle')),
          progress: skip ? 'SKIPPED' : String(data.get('progress')),
          storageConsent: true,
          advisorConsent: !skip && data.get('advisorConsent') === 'on',
        },
        false,
      );
      if (api.active()) {
        setConsent(false);
        setRevision((v) => v + 1);
      }
    } catch (e) {
      if (api.active())
        setError(e instanceof Error ? e.message : 'Onboarding unavailable.');
    } finally {
      if (api.active()) setBusy(false);
    }
  }
  async function remove() {
    if (!state.data) return;
    setBusy(true);
    setConfirmDelete(false);
    try {
      await api.write(
        '/business/preferences?version=' + state.data.version,
        'DELETE',
        undefined,
        false,
      );
      if (api.active()) {
        setJourney('');
        setConsent(false);
        setRevision((v) => v + 1);
      }
    } catch (e) {
      if (api.active())
        setError(
          e instanceof Error ? e.message : 'Could not clear preferences.',
        );
    } finally {
      if (api.active()) setBusy(false);
    }
  }
  return (
    <WorkflowFrame
      title="Your business journey"
      busy={busy}
      onRefresh={() => setRevision((v) => v + 1)}
    >
      <div className="business-content">
        <p>
          Your optional answers are private to your account in this
          organization. Choosing a business role does not change your
          permissions.
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
            <label>
              Your journey
              <select
                name="journey"
                value={currentJourney}
                onChange={(e) => setJourney(e.target.value)}
                disabled={busy}
              >
                {Object.entries(journeys).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <p>{journeyCopy[currentJourney]}</p>
            <label>
              Your business role (optional)
              <input
                name="userRole"
                maxLength={100}
                defaultValue={String(state.data.data?.userRole || '')}
              />
            </label>
            <label>
              {currentJourney === 'EMPLOYEE'
                ? 'Your work challenge'
                : 'Primary challenge'}{' '}
              (optional)
              <textarea
                name="challenge"
                maxLength={500}
                defaultValue={String(state.data.data?.challenge || '')}
              />
            </label>
            <label>
              {currentJourney === 'NEW_FOUNDER'
                ? 'First outcome to validate'
                : 'Short-term goal'}{' '}
              (optional)
              <textarea
                name="shortTermGoal"
                maxLength={500}
                defaultValue={String(state.data.data?.shortTermGoal || '')}
              />
            </label>
            <label>
              Desired outcome (optional)
              <textarea
                name="desiredOutcome"
                maxLength={500}
                defaultValue={String(state.data.data?.desiredOutcome || '')}
              />
            </label>
            <label>
              Planning preference
              <select
                name="planningStyle"
                defaultValue={String(
                  state.data.data?.planningStyle || 'FLEXIBLE',
                )}
              >
                <option>FLEXIBLE</option>
                <option>DAILY</option>
                <option>WEEKLY</option>
              </select>
            </label>
            <label>
              Onboarding progress
              <select
                name="progress"
                defaultValue={String(state.data.data?.progress || 'STARTED')}
              >
                <option>STARTED</option>
                <option>COMPLETE</option>
                <option>SKIPPED</option>
              </select>
            </label>
            <label className="business-check">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              I agree to store these optional answers privately in this
              organization until I correct or delete them.
            </label>
            <label className="business-check">
              <input
                type="checkbox"
                name="advisorConsent"
                defaultChecked={state.data.data?.advisorConsent === true}
              />
              Allow the configured AI advisor to receive this private context,
              the shared business profile and sampled goals only when I
              separately confirm sharing for a question. Provider retention may
              apply.
            </label>
            <p>
              No website scraping or automatic third-party sharing. Revoking
              sharing or clearing answers invalidates copied server-side advisor
              history. Provider copies already sent follow its retention policy.
            </p>
            <button disabled={busy || !consent}>Save private onboarding</button>
            <button
              type="button"
              disabled={busy || !consent}
              onClick={(e) => void save(e.currentTarget.form!, true)}
            >
              Skip optional questions and save minimal preferences
            </button>
            <button
              type="button"
              disabled={busy || state.data.version === 0}
              onClick={() => setConfirmDelete(true)}
            >
              Clear my onboarding and preferences
            </button>
            <button type="button" onClick={() => navigate('/business-profile')}>
              View organization business profile
            </button>
          </form>
        )}
        {confirmDelete && (
          <Confirmation
            message="Delete your private onboarding and preferences in this organization, revoke advisor sharing and invalidate copied session context? Shared business profile, goals and CRM tasks remain."
            onCancel={() => setConfirmDelete(false)}
            onConfirm={() => void remove()}
          />
        )}
      </div>
    </WorkflowFrame>
  );
}
