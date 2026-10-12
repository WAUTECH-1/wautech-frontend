import { ApiError } from '@wautech/wajahat';
import { jsonRequest, mutation } from '../../integrations/http';
export type Role = 'OWNER' | 'ADMIN' | 'SALES_USER' | 'VIEWER';
export interface Member {
  id: string;
  organizationId: string;
  userId: string;
  role: Role;
  status: 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
}
export interface Organization {
  id: string;
  name: string;
}
export interface Profile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}
export function createPlatformApi(
  baseUrl: string,
  transport: typeof fetch,
  organizationId?: string,
  userId?: string,
) {
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function verifyOrganization<T extends { id: string }>(value: T): T {
    if (
      value.id !== organizationId ||
      !('name' in value) ||
      typeof value.name !== 'string' ||
      !value.name.trim()
    )
      throw new ApiError(
        'contract',
        'Organization response does not match selection.',
      );
    return value;
  }
  function verifyMember(value: Member) {
    if (
      value.organizationId !== organizationId ||
      !uuid.test(value.id) ||
      !uuid.test(value.userId) ||
      !['OWNER', 'ADMIN', 'SALES_USER', 'VIEWER'].includes(value.role) ||
      !['INVITED', 'ACTIVE', 'SUSPENDED', 'REVOKED'].includes(value.status)
    )
      throw new ApiError('contract', 'Unexpected membership response.');
    return value;
  }
  function verifyProfile(value: Profile) {
    if (
      value.id !== userId ||
      typeof value.firstName !== 'string' ||
      typeof value.lastName !== 'string' ||
      typeof value.email !== 'string'
    )
      throw new ApiError('contract', 'Unexpected profile response.');
    return value;
  }
  return {
    profile: async (signal?: AbortSignal) =>
      verifyProfile(
        await jsonRequest<Profile>(baseUrl, '/auth/profile', transport, {
          signal,
        }),
      ),
    saveProfile: async (firstName: string, lastName: string) =>
      verifyProfile(
        await mutation<Profile>(baseUrl, '/auth/profile', transport, {
          firstName,
          lastName,
        }),
      ),
    organization: async (signal?: AbortSignal) =>
      verifyOrganization(
        await jsonRequest<Organization>(baseUrl, '/organization', transport, {
          signal,
        }),
      ),
    saveOrganization: async (name: string) =>
      verifyOrganization(
        await mutation<Organization>(baseUrl, '/organization', transport, {
          name,
        }),
      ),
    members: async (signal?: AbortSignal) => {
      const values = await jsonRequest<Member[]>(
        baseUrl,
        '/organization/memberships',
        transport,
        { signal },
      );
      if (!Array.isArray(values))
        throw new ApiError('contract', 'Unexpected membership list.');
      return values.map(verifyMember);
    },
    createMember: async (userId: string) =>
      verifyMember(
        await mutation<Member>(
          baseUrl,
          '/organization/memberships',
          transport,
          { userId },
          'POST',
        ),
      ),
    setRole: async (id: string, role: Role) =>
      verifyMember(
        await mutation<Member>(
          baseUrl,
          `/organization/memberships/${encodeURIComponent(id)}/role`,
          transport,
          { role },
        ),
      ),
    setStatus: async (id: string, status: Member['status']) =>
      verifyMember(
        await mutation<Member>(
          baseUrl,
          `/organization/memberships/${encodeURIComponent(id)}/status`,
          transport,
          { status },
        ),
      ),
  };
}
