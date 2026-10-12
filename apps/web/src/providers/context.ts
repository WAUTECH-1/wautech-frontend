import { createContext, useContext } from 'react';
import type { SessionAdapter, AuthState } from '../integrations/auth';
import type { TenantState } from '../integrations/tenant';
import type { ApiConfiguration } from '../config';
export interface ApplicationContextValue {
  session: SessionAdapter;
  auth: AuthState;
  tenant: TenantState;
  config: ApiConfiguration;
  organizations: import('../integrations/membership').Membership[];
  selectOrganization: (id: string) => Promise<void>;
  reloadOrganizations: () => void;
  current: () => import('../integrations/crm').CrmContext;
}
export const ApplicationContext = createContext<ApplicationContextValue | null>(
  null,
);
export function useApplication() {
  const value = useContext(ApplicationContext);
  if (!value) throw new Error('ApplicationProvider is required.');
  return value;
}
