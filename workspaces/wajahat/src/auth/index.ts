export { AuthProvider, ProtectedRoute } from './provider';
export type { ProtectedFallbackState } from './provider';
export { AuthSession, organizationCapability } from './session';
export { createAuthApi, ApiError, safeError, apiOrigin } from '../api/auth-api';
export type { AuthApi, ApiErrorKind } from '../api/auth-api';
export type {
  AuthenticatedUser,
  AuthState,
  AuthReason,
  LoginInput,
} from './types';

export { useAuth } from './context';
