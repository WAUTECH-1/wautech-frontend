import { ApiError } from '@wautech/wajahat';
import { jsonRequest } from './http';
export interface Membership {
  organizationId: string;
  organizationName: string;
  membershipId: string;
  role: 'OWNER' | 'ADMIN' | 'SALES_USER' | 'VIEWER';
  status: 'ACTIVE';
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function membership(value: unknown): Membership {
  if (!value || typeof value !== 'object')
    throw new ApiError('contract', 'Unexpected organization response.');
  const item = value as Membership;
  if (
    !uuid.test(item.organizationId) ||
    !uuid.test(item.membershipId) ||
    typeof item.organizationName !== 'string' ||
    !item.organizationName.trim() ||
    !['OWNER', 'ADMIN', 'SALES_USER', 'VIEWER'].includes(item.role) ||
    item.status !== 'ACTIVE'
  )
    throw new ApiError('contract', 'Unexpected organization response.');
  return {
    organizationId: item.organizationId,
    organizationName: item.organizationName,
    membershipId: item.membershipId,
    role: item.role,
    status: 'ACTIVE',
  };
}
export async function discoverOrganizations(
  baseUrl: string,
  transport: typeof fetch,
  signal?: AbortSignal,
) {
  const value = await jsonRequest<unknown>(
    baseUrl,
    '/auth/organizations',
    transport,
    { signal },
  );
  if (!Array.isArray(value))
    throw new ApiError('contract', 'Unexpected organization response.');
  const memberships = value.map(membership);
  if (
    new Set(memberships.map((m) => m.organizationId)).size !==
    memberships.length
  )
    throw new ApiError('contract', 'Duplicate organizations returned.');
  return memberships;
}
export async function verifyMembership(
  baseUrl: string,
  id: string,
  transport: typeof fetch,
  signal?: AbortSignal,
) {
  if (!uuid.test(id)) throw new ApiError('invalid', 'Invalid organization.');
  const result = membership(
    await jsonRequest(
      baseUrl,
      `/auth/organizations/${encodeURIComponent(id)}/membership`,
      transport,
      { signal },
    ),
  );
  if (result.organizationId !== id)
    throw new ApiError(
      'contract',
      'Organization response does not match selection.',
    );
  return result;
}
