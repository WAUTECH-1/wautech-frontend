// Verified against wautech-crm main 74467a4 (AuthenticationController and DTOs).
export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export type AuthReason = 'signed-out' | 'expired' | 'logout';
export type AuthState =
  | { status: 'checking' }
  | { status: 'anonymous'; reason: AuthReason }
  | { status: 'authenticated'; user: AuthenticatedUser }
  | { status: 'denied' }
  | { status: 'unavailable'; message: string };

export type PortalRoute =
  '/login' | '/portal' | '/organizations' | '/unauthorized' | '/access-denied';
