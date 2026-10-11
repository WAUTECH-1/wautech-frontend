import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test, vi } from 'vitest';
import LoginPage from './LoginPage';
import PortalPage from './PortalPage';
import StatusPage from './StatusPage';

describe('authentication screens', () => {
  test('renders accessible email/password fields and no unsupported registration/reset actions', () => {
    const html = renderToStaticMarkup(<LoginPage onLogin={vi.fn()} />);
    expect(html).toContain('for="email"');
    expect(html).toContain('type="email"');
    expect(html).toContain('autoComplete="username"');
    expect(html).toContain('autoComplete="current-password"');
    expect(html).toContain('aria-label="Show password"');
    expect(html).not.toContain('Remember me');
    expect(html).not.toContain('Forgot password');
    expect(html).not.toContain('Register');
  });
  test('announces expired sessions and successful logout', () => {
    expect(
      renderToStaticMarkup(<LoginPage reason="expired" onLogin={vi.fn()} />),
    ).toContain('Your session has expired');
    expect(
      renderToStaticMarkup(<LoginPage reason="logout" onLogin={vi.fn()} />),
    ).toContain('signed out securely');
  });
  test('renders safe unauthorized and denied pages', () => {
    expect(renderToStaticMarkup(<StatusPage kind="unauthorized" />)).toContain(
      'SIGN IN REQUIRED',
    );
    expect(renderToStaticMarkup(<StatusPage kind="denied" />)).toContain(
      'ACCESS DENIED',
    );
  });
  test('renders verified profile, escapes data, and never invents memberships', () => {
    const html = renderToStaticMarkup(
      <PortalPage
        user={{
          id: 'test-only-id',
          email: 'test@example.test',
          firstName: '<script>',
          lastName: 'Member',
        }}
        organizations={false}
        onLogout={vi.fn()}
      />,
    );
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('test@example.test');
    expect(html).toContain('Not selected');
    expect(html).toContain('Unavailable');
    expect(html).not.toContain('<select');
    expect(html).not.toContain('OWNER');
  });
});
