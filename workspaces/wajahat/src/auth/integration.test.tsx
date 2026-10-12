import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test, vi } from 'vitest';
import {
  ApiError,
  AuthProvider,
  AuthSession,
  ProtectedRoute,
  useAuth,
  type AuthApi,
} from './index';

const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'member@example.test',
  firstName: 'Test',
  lastName: 'Member',
};
function fixture() {
  const api: AuthApi = {
    me: vi.fn().mockResolvedValue(user),
    login: vi.fn().mockResolvedValue(user),
    logout: vi.fn().mockResolvedValue(undefined),
  };
  return { api, session: new AuthSession(api) };
}
describe('public authentication integration', () => {
  test('SSR fails closed even when a supplied session contains identity', async () => {
    const { session } = fixture();
    await session.restore();
    const html = renderToStaticMarkup(
      <AuthProvider session={session}>
        <ProtectedRoute fallback={(state) => <span>{state.status}</span>}>
          <span>private record</span>
        </ProtectedRoute>
      </AuthProvider>,
    );
    expect(html).toContain('checking');
    expect(html).not.toContain('private record');
  });
  test('hooks require explicit provider ownership', () => {
    function Consumer() {
      useAuth();
      return null;
    }
    expect(() => renderToStaticMarkup(<Consumer />)).toThrow(
      'requires AuthProvider',
    );
  });
  test('protected API 401 clears identity and invalidates pending verification', async () => {
    const { api, session } = fixture();
    await session.restore();
    let resolve!: (value: typeof user) => void;
    vi.mocked(api.me).mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const pending = session.restore();
    expect(
      session.handleApiError(new ApiError('unauthorized', 'expired')),
    ).toBe(true);
    resolve(user);
    await pending;
    expect(session.getSnapshot()).toEqual({
      status: 'anonymous',
      reason: 'expired',
    });
  });
  test('tenant denial and unrelated failures preserve identity; subscriptions detach', async () => {
    const { session } = fixture();
    const listener = vi.fn();
    const unsubscribe = session.subscribe(listener);
    await session.restore();
    expect(
      session.handleApiError(new ApiError('forbidden', 'tenant denied')),
    ).toBe(false);
    expect(session.handleApiError(new Error('offline'))).toBe(false);
    expect(session.getSnapshot().status).toBe('authenticated');
    unsubscribe();
    await session.logout();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
