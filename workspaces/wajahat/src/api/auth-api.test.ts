import { describe, expect, test, vi } from 'vitest';
import { apiOrigin, createAuthApi, safeError } from './auth-api';

// All network responses in this suite are MOCKS, not real authentication.
const mockUser = {
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
const input = {
  email: ' member@example.test ',
  password: ' test-only-password ',
};
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('verified cookie and CSRF authentication contract (mock network)', () => {
  test('bootstraps CSRF, logs in, and verifies the session via me', async () => {
    const network = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(csrf))
      .mockResolvedValueOnce(json(mockUser))
      .mockResolvedValueOnce(json(mockUser));
    expect(await createAuthApi('/', network).login(input)).toEqual(mockUser);
    expect(network.mock.calls.map(([url]) => url)).toEqual([
      '/api/auth/csrf',
      '/api/auth/login',
      '/api/auth/me',
    ]);
    for (const [, options] of network.mock.calls) {
      expect(options?.credentials).toBe('include');
      expect(options?.cache).toBe('no-store');
      expect(options?.redirect).toBe('error');
      expect(new Headers(options?.headers).has('Authorization')).toBe(false);
    }
    const post = network.mock.calls[1][1];
    expect(post?.method).toBe('POST');
    expect(new Headers(post?.headers).get('X-CSRF-TOKEN')).toBe(csrf.token);
    expect(JSON.parse(post?.body as string)).toEqual({
      email: input.email.trim(),
      password: input.password,
    });
  });
  test('rejects incorrect credentials without exposing backend detail', async () => {
    const network = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(csrf))
      .mockResolvedValueOnce(
        json({ detail: 'internal sensitive message' }, 401),
      );
    await expect(
      createAuthApi('/', network).login(input),
    ).rejects.toMatchObject({
      kind: 'unauthorized',
      message: 'Invalid email or password. Please try again.',
    });
    expect(network).toHaveBeenCalledTimes(2);
  });
  test('does not accept login success without a working session cookie', async () => {
    const network = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(csrf))
      .mockResolvedValueOnce(json(mockUser))
      .mockResolvedValueOnce(json({}, 401));
    await expect(
      createAuthApi('/', network).login(input),
    ).rejects.toMatchObject({ kind: 'unauthorized' });
  });
  test('obtains fresh CSRF for logout and accepts only successful response', async () => {
    const network = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(csrf))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await createAuthApi('/', network).logout();
    expect(network.mock.calls[1][0]).toBe('/api/auth/logout');
    expect(network.mock.calls[1][1]?.method).toBe('POST');
    expect(
      new Headers(network.mock.calls[1][1]?.headers).get('X-CSRF-TOKEN'),
    ).toBe(csrf.token);
  });
  test.each([
    [400, 'invalid'],
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'server'],
    [429, 'server'],
    [500, 'server'],
  ])('handles HTTP %s safely', async (status, kind) => {
    const network = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        json({ detail: '<script>secret</script>' }, Number(status)),
      );
    await expect(createAuthApi('/', network).me()).rejects.toMatchObject({
      kind,
    });
  });
  test('handles connection failure and does not leak raw errors', async () => {
    const network = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error('secret connection information'));
    await expect(createAuthApi('/', network).me()).rejects.toMatchObject({
      kind: 'network',
    });
    expect(safeError(new Error('secret'))).not.toContain('secret');
  });
  test('rejects malformed profile, HTML fallback, and malformed JSON', async () => {
    for (const response of [
      json({ email: 'missing-id@example.test' }),
      new Response('<html>login</html>'),
      new Response('{', { headers: { 'Content-Type': 'application/json' } }),
    ]) {
      await expect(
        createAuthApi(
          '/',
          vi.fn<typeof fetch>().mockResolvedValue(response),
        ).me(),
      ).rejects.toMatchObject({ kind: 'contract' });
    }
  });
  test('rejects invalid CSRF before transmitting a password', async () => {
    const network = vi
      .fn<typeof fetch>()
      .mockResolvedValue(json({ ...csrf, headerName: 'Authorization' }));
    await expect(
      createAuthApi('/', network).login(input),
    ).rejects.toMatchObject({ kind: 'contract' });
    expect(network).toHaveBeenCalledTimes(1);
  });
  test('does not retain unverified extra profile fields', async () => {
    const network = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        json({ ...mockUser, passwordHash: 'test-only', role: 'OWNER' }),
      );
    expect(await createAuthApi('/', network).me()).toEqual(mockUser);
  });
  test('validates origins and prevents credential-bearing or insecure remote URLs', () => {
    expect(apiOrigin('/')).toBe('');
    expect(apiOrigin('http://localhost:8080')).toBe('http://localhost:8080');
    expect(apiOrigin('https://backend.example.test')).toBe(
      'https://backend.example.test',
    );
    for (const value of [
      'http://remote.example.test',
      'https://name:secret@example.test',
      'https://example.test/path',
      'https://example.test?token=x',
      'javascript:alert(1)',
    ])
      expect(() => apiOrigin(value)).toThrow();
  });
  test('aborts timed out requests', async () => {
    vi.useFakeTimers();
    try {
      const network = vi
        .fn<typeof fetch>()
        .mockImplementation(
          (_url, init) =>
            new Promise((_resolve, reject) =>
              init?.signal?.addEventListener('abort', () =>
                reject(new Error('aborted')),
              ),
            ),
        );
      const result = expect(
        createAuthApi('/', network).me(),
      ).rejects.toMatchObject({ kind: 'network' });
      await vi.advanceTimersByTimeAsync(15000);
      await result;
    } finally {
      vi.useRealTimers();
    }
  });
});
