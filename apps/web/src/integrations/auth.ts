// Reuse the merged implementation; do not create another auth transport/store.
import { createAuthApi } from '../../../../workspaces/wajahat/src/api/auth-api';
import { AuthSession } from '../../../../workspaces/wajahat/src/auth/session';
import type {
  AuthState,
  LoginInput,
} from '../../../../workspaces/wajahat/src/auth/types';
export type {
  AuthState,
  AuthenticatedUser,
  LoginInput,
} from '../../../../workspaces/wajahat/src/auth/types';
export interface SessionAdapter {
  getSnapshot(): AuthState;
  subscribe(listener: () => void): () => void;
  restore(): Promise<void>;
  login(input: LoginInput): Promise<void>;
  logout(): Promise<void>;
}
export function createSessionAdapter(
  baseUrl: string,
  transport?: typeof fetch,
): SessionAdapter {
  return new AuthSession(createAuthApi(baseUrl, transport));
}
