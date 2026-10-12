import { apiOrigin } from '../../../workspaces/wajahat/src/api/auth-api';
export interface ApiConfiguration {
  baseUrl: string;
  transport: 'session-cookie';
  tenantDiscovery: 'unavailable';
}
export function apiConfiguration(value?: string): ApiConfiguration {
  return {
    baseUrl: apiOrigin(value),
    transport: 'session-cookie',
    tenantDiscovery: 'unavailable',
  };
}
