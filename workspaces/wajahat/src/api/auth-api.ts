import type { AuthenticatedUser, LoginInput } from '../auth/types';

export type ApiErrorKind =
  | 'unauthorized'
  | 'forbidden'
  | 'invalid'
  | 'network'
  | 'server'
  | 'configuration'
  | 'contract';

export class ApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface AuthApi {
  me(): Promise<AuthenticatedUser>;
  login(input: LoginInput): Promise<AuthenticatedUser>;
  logout(): Promise<void>;
}

export function safeError(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'Something went wrong. Please try again.';
}

export function apiOrigin(value: string | undefined): string {
  if (!value || value === '/') return '';
  try {
    const url = new URL(value);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/' ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback))
    )
      throw new Error();
    return url.origin;
  } catch {
    throw new ApiError(
      'configuration',
      'The backend address is not configured correctly. Contact your administrator.',
    );
  }
}

function userResponse(value: unknown): AuthenticatedUser {
  if (!value || typeof value !== 'object')
    throw new ApiError(
      'contract',
      'The backend returned an unexpected profile. Please try again.',
    );
  const user = value as Record<string, unknown>;
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (
    typeof user.id !== 'string' ||
    !uuid.test(user.id) ||
    typeof user.email !== 'string' ||
    !user.email ||
    typeof user.firstName !== 'string' ||
    typeof user.lastName !== 'string'
  ) {
    throw new ApiError(
      'contract',
      'The backend returned an unexpected profile. Please try again.',
    );
  }
  // Select only verified public fields; never retain unexpected credentials.
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

export function createAuthApi(
  baseUrl: string | undefined,
  fetcher: typeof fetch = fetch,
): AuthApi {
  async function request(
    path: string,
    init: RequestInit = {},
  ): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetcher(`${apiOrigin(baseUrl)}${path}`, {
        ...init,
        credentials: 'include',
        cache: 'no-store',
        redirect: 'error',
        signal: controller.signal,
        headers: { Accept: 'application/json', ...init.headers },
      });
      if (!response.ok) {
        if (response.status === 401)
          throw new ApiError(
            'unauthorized',
            'Your session is no longer valid. Sign in again.',
          );
        if (response.status === 403)
          throw new ApiError(
            'forbidden',
            'This request was denied. Your session or permissions may have changed. Please try again.',
          );
        if (response.status === 400)
          throw new ApiError(
            'invalid',
            'The request could not be accepted. Check your details and try again.',
          );
        if (response.status === 429)
          throw new ApiError(
            'server',
            'Too many requests. Please wait and try again.',
          );
        throw new ApiError(
          'server',
          'The service is unavailable. Please try again shortly.',
        );
      }
      if (response.status === 204) return undefined;
      if (!response.headers.get('content-type')?.includes('json'))
        throw new ApiError(
          'contract',
          'The backend returned an unexpected response. Please try again.',
        );
      try {
        return await response.json();
      } catch {
        throw new ApiError(
          'contract',
          'The backend returned an unexpected response. Please try again.',
        );
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        'network',
        'Could not reach the service. Check your connection and try again.',
      );
    } finally {
      clearTimeout(timer);
    }
  }

  async function csrfHeader(): Promise<Record<string, string>> {
    const value = await request('/api/auth/csrf');
    if (!value || typeof value !== 'object')
      throw new ApiError(
        'contract',
        'Could not establish a secure session. Please try again.',
      );
    const token = value as Record<string, unknown>;
    if (
      token.headerName !== 'X-CSRF-TOKEN' ||
      typeof token.token !== 'string' ||
      !token.token ||
      /[\r\n]/.test(token.token)
    )
      throw new ApiError(
        'contract',
        'Could not establish a secure session. Please try again.',
      );
    return { 'X-CSRF-TOKEN': token.token };
  }

  return {
    async me() {
      return userResponse(await request('/api/auth/me'));
    },
    async login(input) {
      const headers = await csrfHeader();
      try {
        userResponse(
          await request('/api/auth/login', {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: input.email.trim(),
              password: input.password,
            }),
          }),
        );
      } catch (error) {
        if (error instanceof ApiError && error.kind === 'unauthorized')
          throw new ApiError(
            'unauthorized',
            'Invalid email or password. Please try again.',
          );
        throw error;
      }
      // A login response alone is insufficient: verify the browser's session cookie.
      return userResponse(await request('/api/auth/me'));
    },
    async logout() {
      const headers = await csrfHeader();
      await request('/api/auth/logout', { method: 'POST', headers });
    },
  };
}
