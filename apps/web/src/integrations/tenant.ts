import { organizationCapability } from '../../../../workspaces/wajahat/src/auth/session';
export interface VerifiedOrganization {
  id: string;
  memberUserId: string;
  source: 'backend-membership';
  name?: string;
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
