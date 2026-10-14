import { ApiError } from '@wautech/wajahat';
import type { SessionAdapter } from './auth';
export function organizationTransport(
  transport: typeof fetch,
  organizationId: string,
  lifetime: AbortSignal,
): typeof fetch {
  return (input, init) => {
    const headers = new Headers(init?.headers);
    const path = new URL(
      input instanceof Request ? input.url : String(input),
      'http://localhost',
    ).pathname;
    if (path.startsWith('/api/auth/')) headers.delete('X-Organization-ID');
    else headers.set('X-Organization-ID', organizationId);
    return transport(input, {
      ...init,
      headers,
      signal: init?.signal
        ? AbortSignal.any([init.signal, lifetime])
        : lifetime,
    });
  };
}
export function sessionTransport(
  session: SessionAdapter,
  active: () => boolean,
  transport: typeof fetch = fetch,
  timeoutMs = 15000,
): typeof fetch {
  return async (input, init) => {
    if (!active()) throw new DOMException('Context changed', 'AbortError');
    const response = await transport(input, {
      ...init,
      credentials: 'include',
      cache: 'no-store',
      redirect: 'error',
      signal: init?.signal
        ? AbortSignal.any([init.signal, AbortSignal.timeout(timeoutMs)])
        : AbortSignal.timeout(timeoutMs),
    });
    if (!active()) throw new DOMException('Context changed', 'AbortError');
    if (response.status === 401)
      session.handleApiError(
        new ApiError('unauthorized', 'Your session expired. Sign in again.'),
      );
    return response;
  };
}
export async function jsonRequest<T>(
  baseUrl: string,
  path: string,
  transport: typeof fetch,
  init: RequestInit = {},
): Promise<T> {
  const response = await transport(`${baseUrl}/api${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...init.headers },
  });
  if (!response.ok) {
    const kind =
      response.status === 401
        ? 'unauthorized'
        : response.status === 403
          ? 'forbidden'
          : 'server';
    throw new ApiError(
      kind,
      response.status === 403
        ? 'You do not have access to this operation.'
        : response.status === 400
          ? 'Check the entered values and try again.'
          : response.status === 404
            ? 'This record is unavailable in the current organization.'
            : response.status === 409
              ? 'This change conflicts with the current record state or organization ownership rules. Refresh and review before retrying.'
              : 'The service could not complete this request. Please retry.',
    );
  }
  if (response.status === 204) return undefined as T;
  if (!response.headers.get('content-type')?.includes('json'))
    throw new ApiError('contract', 'Unexpected service response.');
  return (await response.json()) as T;
}
export async function mutation<T>(
  baseUrl: string,
  path: string,
  transport: typeof fetch,
  body?: unknown,
  method: 'PATCH' | 'POST' = 'PATCH',
) {
  const csrf = await jsonRequest<{ headerName: string; token: string }>(
    baseUrl,
    '/auth/csrf',
    transport,
  );
  if (
    csrf.headerName !== 'X-CSRF-TOKEN' ||
    !csrf.token ||
    /[\r\n]/.test(csrf.token)
  )
    throw new ApiError('contract', 'Unable to verify request security.');
  return jsonRequest<T>(baseUrl, path, transport, {
    method,
    headers: {
      'X-CSRF-TOKEN': csrf.token,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
