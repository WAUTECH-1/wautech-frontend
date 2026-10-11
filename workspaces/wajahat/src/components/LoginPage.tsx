import { useRef, useState } from 'react';
import { safeError } from '../api/auth-api';
import type { AuthReason, LoginInput } from '../auth/types';
import { validateLogin } from '../auth/validation';

interface Props {
  reason?: AuthReason;
  connectionMessage?: string;
  onLogin(input: LoginInput): Promise<void>;
}

export default function LoginPage({
  reason,
  connectionMessage,
  onLogin,
}: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [message, setMessage] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setMessage('');
    const validation = validateLogin({ email, password });
    setErrors(validation);
    if (validation.email || validation.password) {
      (validation.email ? emailRef : passwordRef).current?.focus();
      return;
    }
    setBusy(true);
    try {
      await onLogin({ email, password });
    } catch (error) {
      setPassword('');
      setMessage(safeError(error));
      requestAnimationFrame(() => feedbackRef.current?.focus());
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="login-layout">
      <div className="introduction">
        <div className="eyebrow">
          <span className="tiny-line" /> YOUR BUSINESS. IN FOCUS.
        </div>
        <h1>
          Clarity for
          <br /> what comes <span>next.</span>
        </h1>
        <p className="intro-copy">
          One place to connect your people, your work, and your next move.
        </p>
        <div className="orbital-scene" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <div className="orbit-core">
            W<span>·</span>
          </div>
          <span className="orbit-node node-one" />
          <span className="orbit-node node-two" />
          <span className="orbit-node node-three" />
          <span className="orbit-caption">CONNECTED BY INTELLIGENCE</span>
        </div>
        <div className="intro-footnote">
          <span className="small-diamond" /> Built for teams moving forward.
        </div>
      </div>
      <div className="login-panel glass-panel">
        <div className="panel-topline">
          <span className="panel-symbol" aria-hidden="true">
            ↗
          </span>
          <span>YOUR WORKSPACE AWAITS</span>
        </div>
        <h2>Welcome back.</h2>
        <p className="muted">Sign in to WAUTECH Intelligence.</p>
        {reason === 'expired' && (
          <div className="notice" role="status">
            Your session has expired or is no longer valid. Sign in again to
            continue.
          </div>
        )}
        {reason === 'logout' && (
          <div className="notice" role="status">
            You have been signed out securely.
          </div>
        )}
        {connectionMessage && (
          <div className="notice" role="status">
            {connectionMessage} Sign-in will require a working backend
            connection.
          </div>
        )}
        <form onSubmit={submit} noValidate aria-busy={busy}>
          <label htmlFor="email">Work email</label>
          <input
            ref={emailRef}
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            spellCheck={false}
            autoCapitalize="none"
            placeholder="you@company.com"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={busy}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <p className="field-error" id="email-error">
              {errors.email}
            </p>
          )}
          <label htmlFor="password">Password</label>
          <div className="password-field">
            <input
              ref={passwordRef}
              id="password"
              name="password"
              type={visible ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={busy}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            <button
              className="password-toggle"
              type="button"
              onClick={() => setVisible(!visible)}
              aria-label={visible ? 'Hide password' : 'Show password'}
              aria-pressed={visible}
              disabled={busy}
            >
              {visible ? 'Hide' : 'Show'}
            </button>
          </div>
          {errors.password && (
            <p className="field-error" id="password-error">
              {errors.password}
            </p>
          )}
          {message && (
            <div
              ref={feedbackRef}
              className="error-notice"
              role="alert"
              tabIndex={-1}
            >
              {message}
            </div>
          )}
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? (
              <>
                <span className="spinner" aria-hidden="true" /> Signing in…
              </>
            ) : (
              <>
                Sign in <span aria-hidden="true">→</span>
              </>
            )}
          </button>
        </form>
        <div className="secure-note">
          <span aria-hidden="true">◇</span> A secure connection to your
          workspace.
        </div>
        <div className="help-note">
          Need access? Contact your organization administrator.
        </div>
      </div>
    </section>
  );
}
