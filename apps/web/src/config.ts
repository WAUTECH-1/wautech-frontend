import { apiOrigin } from '@wautech/wajahat';
export interface ApiConfiguration {
  baseUrl: string;
  transport: 'session-cookie';
  tenantDiscovery: 'backend-membership';
}
export function apiConfiguration(value?: string): ApiConfiguration {
  return {
    baseUrl: apiOrigin(value),
    transport: 'session-cookie',
    tenantDiscovery: 'backend-membership',
  };
}
