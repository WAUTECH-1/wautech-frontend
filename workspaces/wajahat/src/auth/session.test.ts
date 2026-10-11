import { describe, expect, test, vi } from 'vitest';
import { createAuthApi } from '../api/auth-api';
import { AuthSession, organizationCapability, routeAccess } from './session';

// Mock network fixtures only. No production login or membership is simulated.
const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'member@example.test',
  firstName: 'Test',
  lastName: 'Member',
};
const csrf = {
  headerName: 'X-CSRF-TOKEN',
  parameterName: '_csrf',
  token: 'test-only-csrf',
};
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('session and protected routes (mock network)', () => {
  test('protects private routes during startup and when signed out', async () => {
    const network = vi.fn<typeof fetch>().mockResolvedValue(json({}, 401));
    const session = new AuthSession(createAuthApi('/', network));
    expect(routeAccess('/portal', session.getSnapshot())).toBe('checking');
    await session.restore();
    expect(session.getSnapshot()).toEqual({
      status: 'anonymous',
      reason: 'signed-out',
    });
    expect(routeAccess('/portal', session.getSnapshot())).toBe('unauthorized');
    expect(routeAccess('/organizations', session.getSnapshot())).toBe(
      'unauthorized',
    );
    expect(routeAccess('/login', session.getSnapshot())).toBe('allow');
  });
  test('verified login allows profile access and a later 401 clears identity', async () => {
    const network = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(csrf))
      .mockResolvedValueOnce(json(user))
      .mockResolvedValueOnce(json(user))
      .mockResolvedValueOnce(json({}, 401));
    const session = new AuthSession(createAuthApi('/', network));
    await session.login({ email: user.email, password: 'test-only-password' });
    expect(routeAccess('/portal', session.getSnapshot())).toBe('allow');
    await session.restore();
    expect(session.getSnapshot()).toEqual({
      status: 'anonymous',
      reason: 'expired',
    });
    expect(routeAccess('/portal', session.getSnapshot())).toBe('unauthorized');
  });
  test('login failure never creates authenticated state', async () => {
    const network = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json({}, 401))
      .mockResolvedValueOnce(json(csrf))
      .mockResolvedValueOnce(json({}, 401));
    const session = new AuthSession(createAuthApi('/', network));
    await session.restore();
    await expect(
      session.login({ email: user.email, password: 'test-only-wrong' }),
    ).rejects.toThrow();
    expect(session.getSnapshot().status).toBe('anonymous');
  });
  test('403 denies protected content, and network failures fail closed', async () => {
    const denied = new AuthSession(
      createAuthApi(
        '/',
        vi.fn<typeof fetch>().mockResolvedValue(json({}, 403)),
      ),
    );
    await denied.restore();
    expect(denied.getSnapshot().status).toBe('denied');
    expect(routeAccess('/portal', denied.getSnapshot())).toBe('unauthorized');
    const unavailable = new AuthSession(
      createAuthApi(
        '/',
        vi.fn<typeof fetch>().mockRejectedValue(new Error('offline')),
      ),
    );
    await unavailable.restore();
    expect(routeAccess('/portal', unavailable.getSnapshot())).toBe(
      'unavailable',
    );
  });
  test('logout clears local identity only after server success or 401', async () => {
    const network = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(user))
      .mockResolvedValueOnce(json(csrf))
      .mockResolvedValueOnce(json({}, 500))
      .mockResolvedValueOnce(json(csrf))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const session = new AuthSession(createAuthApi('/', network));
    await session.restore();
    await expect(session.logout()).rejects.toThrow();
    expect(session.getSnapshot().status).toBe('authenticated');
    await session.logout();
    expect(session.getSnapshot()).toEqual({
      status: 'anonymous',
      reason: 'logout',
    });
  });
  test('logout handles an already expired server session', async () => {
    const network = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(user))
      .mockResolvedValueOnce(json(csrf))
      .mockResolvedValueOnce(json({}, 401));
    const session = new AuthSession(createAuthApi('/', network));
    await session.restore();
    await session.logout();
    expect(session.getSnapshot().status).toBe('anonymous');
  });
  test('a stale profile response cannot resurrect a logged-out session', async () => {
    let resolveStale!: (value: Response) => void;
    const network = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(user))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveStale = resolve;
          }),
      )
      .mockResolvedValueOnce(json(csrf))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const session = new AuthSession(createAuthApi('/', network));
    await session.restore();
    const stale = session.restore();
    await session.logout();
    resolveStale(json(user));
    await stale;
    expect(session.getSnapshot()).toEqual({
      status: 'anonymous',
      reason: 'logout',
    });
  });
  test('organization selection is explicitly unavailable and creates no tenant context', () => {
    expect(organizationCapability.available).toBe(false);
    expect(organizationCapability.message).toContain('current backend API');
    expect(
      'organizationId' in new AuthSession(createAuthApi('/')).getSnapshot(),
    ).toBe(false);
  });
});
