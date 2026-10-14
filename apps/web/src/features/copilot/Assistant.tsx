import { useCallback, useEffect, useState } from 'react';
import { useFeatureApplication } from '../contract';
import { RequestLease } from '../../integrations/lifecycle';
import { useLoad } from '../workflows/hooks';
import { WorkflowFrame, LoadState } from '../workflows/ui';
import { navigate } from '../../routing/history';
import { createAssistantApi } from './api';
import type { History, Scope, Turn, Source } from './api';
import { moneyLabel } from '../intelligence/money';
import './assistant.css';

const suggestedQuestions = [
  'How many active leads do we have?',
  'Which opportunities need attention?',
  'What tasks are overdue?',
  'What should I prioritize today?',
  'Summarize the current sales pipeline.',
  'What activities occurred recently?',
];
function Fact({ source }: { source: Source }) {
  if (source.id === 'summary') {
    const counts = source.facts.counts as Record<string, unknown> | undefined;
    const currencies = source.facts.currencyStageTotals;
    return (
      <section>
        <h4>Verified current totals</h4>
        {counts && (
          <dl className="copilot-facts">
            {Object.entries(counts).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
          </dl>
        )}
        <p>
          Active leads: {String(source.facts.activeLeads)} · NEW, CONTACTED or
          QUALIFIED; non-archived.
        </p>
        <p>Overdue pending tasks: {String(source.facts.overdueTasks)}</p>
        {source.facts.currencyGroupsTruncated === true && (
          <p>
            Only the first 40 currency/stage groups are shown. Use reports for
            the complete breakdown; these groups are not complete pipeline
            totals.
          </p>
        )}
        {Array.isArray(currencies) && (
          <ul>
            {currencies.map((row, i) => {
              const r = row as Record<string, unknown>;
              return (
                <li key={i}>
                  {String(r.category)} ·{' '}
                  {moneyLabel(String(r.amount), String(r.currency))} ·{' '}
                  {String(r.count)} opportunities
                </li>
              );
            })}
          </ul>
        )}
        <button onClick={() => navigate(source.path)}>
          View verified reports
        </button>
      </section>
    );
  }
  return (
    <details>
      <summary>{source.label}</summary>
      <dl className="copilot-facts">
        {Object.entries(source.facts).map(([key, value]) => (
          <div key={key}>
            <dt>{key.replaceAll('_', ' ')}</dt>
            <dd>{String(value)}</dd>
          </div>
        ))}
      </dl>
      <button onClick={() => navigate(source.path)}>Open CRM record</button>
    </details>
  );
}
export function Answer({ turn }: { turn: Turn }) {
  return (
    <article className="copilot-turn">
      <h3>You asked</h3>
      <p className="copilot-message">{turn.question}</p>
      <p>CRM evidence as of {new Date(turn.evidence.asOf).toLocaleString()}</p>
      <details open>
        <summary>Factual CRM results</summary>
        {turn.evidence.sources.map((source) => (
          <Fact key={source.id} source={source} />
        ))}
      </details>
      <section>
        <h3>Rules-based observations</h3>
        <ul>
          {turn.evidence.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3>AI interpretation and suggested next actions</h3>
        <p>
          Review these recommendations against the facts. They are not verified
          predictions or completed actions.
        </p>
        {turn.interpretation.recommendations.map((rec, i) => (
          <div key={i} className="copilot-recommendation">
            <p className="copilot-message">{rec.text}</p>
            <p>
              Evidence:{' '}
              {rec.sourceIds.map((id) => {
                const source = turn.evidence.sources.find((s) => s.id === id)!;
                return (
                  <button key={id} onClick={() => navigate(source.path)}>
                    {source.label}
                  </button>
                );
              })}
            </p>
          </div>
        ))}
        {!turn.interpretation.recommendations.length && (
          <p>No grounded recommendation was returned.</p>
        )}
        <p className="copilot-message">{turn.interpretation.limitations}</p>
      </section>
      <details>
        <summary>Context boundaries</summary>
        <ul>
          {turn.evidence.boundaries.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </details>
    </article>
  );
}
export default function Assistant() {
  const app = useFeatureApplication();
  const [api] = useState(() => createAssistantApi(app)),
    [lease] = useState(() => new RequestLease());
  useEffect(() => {
    const g = lease.enter();
    return () => lease.leave(g, api.dispose);
  }, [api, lease]);
  const [revision, setRevision] = useState(0),
    [history, setHistory] = useState<History | null>(null);
  const loader = useCallback(
    async () => ({ status: await api.status(), history: await api.history() }),
    [api],
  );
  const loaded = useLoad(String(revision), loader);
  const [question, setQuestion] = useState(''),
    [scope, setScope] = useState<Scope>('briefing');
  const [stage, setStage] = useState(''),
    [resource, setResource] = useState('opportunities'),
    [recordId, setRecordId] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [busyAction, setBusyAction] = useState<'answer' | 'reset'>('answer');
  const current = history || loaded.data?.history;
  const expiry = current?.expiresAt;
  useEffect(() => {
    if (!expiry) return;
    const timer = setTimeout(
      () => {
        if (api.active()) {
          setHistory(null);
          setRevision((v) => v + 1);
        }
      },
      Math.max(0, Date.parse(expiry) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [api, expiry]);
  async function send() {
    if (!current || busy || !loaded.data?.status.available) return;
    setBusyAction('answer');
    setBusy(true);
    setError('');
    try {
      const turn = await api.ask(current.conversationId, question, {
        scope,
        ...(scope === 'opportunities' && stage ? { stage } : {}),
        ...(scope === 'record' ? { resource, recordId } : {}),
      });
      if (api.active()) {
        setHistory({ ...current, turns: [...current.turns, turn] });
        setQuestion('');
      }
    } catch (e) {
      if (api.active())
        setError(e instanceof Error ? e.message : 'Assistant unavailable.');
    } finally {
      if (api.active()) setBusy(false);
    }
  }
  async function reset() {
    setBusyAction('reset');
    setBusy(true);
    setError('');
    try {
      const result = await api.reset();
      if (api.active()) {
        setHistory(result);
        setQuestion('');
      }
    } catch (e) {
      if (api.active())
        setError(e instanceof Error ? e.message : 'Could not clear history.');
    } finally {
      if (api.active()) setBusy(false);
    }
  }
  return (
    <WorkflowFrame
      title="WAUTECH Intelligence"
      onRefresh={() => {
        setHistory(null);
        setRevision((v) => v + 1);
      }}
    >
      <div className="copilot">
        <p className="copilot-intro">
          Your business, with evidence. Ask about current CRM facts and get
          grounded suggestions for your next move.
        </p>
        <LoadState
          error={loaded.error}
          loading={!loaded.data && !loaded.error}
          onRetry={() => setRevision((v) => v + 1)}
        />
        {loaded.data && (
          <>
            {!loaded.data.status.available && (
              <section role="status" className="copilot-setup">
                <h3>AI setup required</h3>
                <p>{loaded.data.status.reason}</p>
                <p>
                  No simulated responses are shown. Server-side configuration is
                  required.
                </p>
              </section>
            )}
            <p>{loaded.data.status.retention}</p>
            <p>
              Questions and selected CRM titles/statuses/amounts are sent to the
              configured model only when enabled. Avoid confidential details in
              questions. Email, phone, notes and record descriptions are
              excluded.
            </p>
            <div className="copilot-suggestions">
              {suggestedQuestions.map((q) => (
                <button key={q} onClick={() => setQuestion(q)} disabled={busy}>
                  {q}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <label>
                Business context
                <select
                  value={scope}
                  onChange={(e) => {
                    setScope(e.target.value as Scope);
                    setStage('');
                  }}
                  disabled={busy}
                >
                  <option value="briefing">Daily business briefing</option>
                  <option value="leads">New lead prioritization</option>
                  <option value="opportunities">Opportunity follow-up</option>
                  <option value="tasks">Overdue tasks</option>
                  <option value="activities">Recent activities</option>
                  <option value="record">Specific CRM record</option>
                </select>
              </label>
              {scope === 'opportunities' && (
                <label>
                  Opportunity stage
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                    disabled={busy}
                  >
                    <option value="">Past expected close dates</option>
                    {[
                      'QUALIFICATION',
                      'NEEDS_ANALYSIS',
                      'PROPOSAL',
                      'NEGOTIATION',
                      'CLOSED_WON',
                      'CLOSED_LOST',
                    ].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              )}
              {scope === 'record' && (
                <>
                  <label>
                    Record type
                    <select
                      value={resource}
                      onChange={(e) => setResource(e.target.value)}
                      disabled={busy}
                    >
                      {['leads', 'opportunities', 'tasks', 'activities'].map(
                        (r) => (
                          <option key={r}>{r}</option>
                        ),
                      )}
                    </select>
                  </label>
                  <label>
                    Record ID
                    <input
                      value={recordId}
                      onChange={(e) => setRecordId(e.target.value)}
                      maxLength={36}
                      required
                      disabled={busy}
                    />
                  </label>
                </>
              )}
              <label>
                Your business question
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  maxLength={1000}
                  required
                  rows={4}
                  disabled={busy || !loaded.data.status.available}
                />
              </label>
              <p>
                {question.length}/1,000 characters · Read-only assistance. No
                CRM changes or external messages.
              </p>
              <button
                disabled={
                  busy ||
                  !question.trim() ||
                  !loaded.data.status.available ||
                  !current ||
                  current.turns.length >= 10
                }
              >
                Ask Intelligence
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void reset()}
              >
                Start new conversation
              </button>
            </form>
          </>
        )}
        {busy && (
          <p role="status" aria-live="polite">
            {busyAction === 'reset'
              ? 'Clearing this session conversation…'
              : 'Retrieving permitted CRM evidence and waiting for the model…'}
          </p>
        )}
        {error && (
          <div role="alert">
            <p>{error}</p>
            <button
              disabled={busy}
              onClick={() => {
                setHistory(null);
                setRevision((v) => v + 1);
                setError('');
              }}
            >
              Refresh history before retrying
            </button>
          </div>
        )}
        <div aria-live="polite" aria-busy={busy}>
          {current?.turns.map((turn) => (
            <Answer key={turn.requestId} turn={turn} />
          ))}
        </div>
        {current && !current.turns.length && (
          <p>No conversation yet. Start with a business question above.</p>
        )}
        {current && (
          <p>
            Session conversation expires at{' '}
            {new Date(current.expiresAt).toLocaleTimeString()} ·{' '}
            {current.turns.length}/10 turns.
          </p>
        )}
      </div>
    </WorkflowFrame>
  );
}
