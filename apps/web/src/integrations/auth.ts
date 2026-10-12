// Reuse the merged implementation; do not create another auth transport/store.
import { createAuthApi, AuthSession } from '@wautech/wajahat';
import type { AuthState, LoginInput } from '@wautech/wajahat';
export type {
  AuthState,
  AuthenticatedUser,
  LoginInput,
} from '@wautech/wajahat';
export interface SessionAdapter {
  getSnapshot(): AuthState;
  subscribe(listener: () => void): () => void;
  restore(): Promise<void>;
  login(input: LoginInput): Promise<void>;
  logout(): Promise<void>;
  handleApiError(error: unknown): boolean;
  getEpoch(): number;
}
export function createSessionAdapter(
  baseUrl: string,
  transport?: typeof fetch,
): SessionAdapter {
  return new AuthSession(createAuthApi(baseUrl, transport));
}
