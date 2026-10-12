import { organizationCapability } from '@wautech/wajahat';
export interface VerifiedOrganization {
  id: string;
  memberUserId: string;
  source: 'backend-membership';
  name?: string;
  role?: 'OWNER' | 'ADMIN' | 'SALES_USER' | 'VIEWER';
  membershipId?: string;
  generation?: number;
}
export type TenantState =
  | { status: 'unavailable'; message: string }
  | { status: 'ready'; organization: VerifiedOrganization };
// No runtime setter, environment UUID, persistence or manual organization picker.
// A future backend membership adapter must replace this unavailable capability.
export const unavailableTenant: TenantState = Object.freeze({
  status: 'unavailable',
  message: organizationCapability.message,
});
