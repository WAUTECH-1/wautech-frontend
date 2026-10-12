# Sprint 2 authentication integration handoff

Frontend baseline: main `3c1177f`. Backend main inspected read-only on October 12, 2026: `74467a4e68b480387ca1ff16516feca4afb1d095`. Asad README and Umer README/CONTRACTS were inspected from merged Sprint 1. No unfinished Sprint 2 work is required.

## Public entry point

`src/auth/index.ts` exports only headless modules; it imports no standalone screens, router, stylesheet, browser environment configuration or application entry point.

| Export                                                                           | Contract                                                                                                                                  |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| AuthProvider                                                                     | Requires a stable `session: AuthSession` and children; verifies on mount and owns visible-page focus/visibility/60-second refresh cleanup |
| useAuth                                                                          | Returns state, status, nullable user, verifySession(), login(LoginInput), logout(), handleApiError(unknown)                               |
| ProtectedRoute                                                                   | Renders children only when authenticated; required fallback(state) handles checking, anonymous, denied and unavailable                    |
| AuthSession                                                                      | Framework-independent subscribe/getSnapshot/restore/login/logout/handleApiError store                                                     |
| createAuthApi                                                                    | Accepts optional origin and injectable fetch; returns me/login/logout                                                                     |
| ApiError, safeError, apiOrigin                                                   | Typed error classification, safe message and origin validation                                                                            |
| AuthenticatedUser                                                                | Identity only: id/email/firstName/lastName; no roles or memberships                                                                       |
| AuthState, AuthReason, LoginInput, AuthApi, ApiErrorKind, ProtectedFallbackState | Public TypeScript contracts                                                                                                               |
| organizationCapability                                                           | Explicitly unavailable; no organization selection implementation                                                                          |

Use the source entry point through a host-approved import/alias when Umer edits apps/web. No root alias or package dependency has been added here; package publication is not configured. The host build must include the workspace source and share one React runtime. This workspace continues to run through `npm run dev:wajahat` and now consumes the same provider.

```tsx
import {
  AuthProvider,
  AuthSession,
  createAuthApi,
  ProtectedRoute,
} from '<host-approved path>/workspaces/wajahat/src/auth';
// Allocate once in the browser bootstrap, outside render; per request for SSR.
const session = new AuthSession(createAuthApi('/'));
// Place above the host router and all authenticated data consumers.
<AuthProvider session={session}>
  <ProtectedRoute fallback={(state) => <HostAuthFallback state={state} />}>
    <HostRouter />
  </ProtectedRoute>
</AuthProvider>;
```

Keep login/public routes outside the guard. Fallbacks must show checking, retry for unavailable, sign-in/expired feedback for anonymous, and access denied for denied. Redirects belong to the host router. Guard is an authentication boundary for rendering, not RBAC enforcement. The provider supplies no CSS. Existing standalone CSS is global and should not be imported into apps/web.

## Session and error lifecycle

Startup is checking; private content awaits `/me`. Login is CSRF GET, login POST, then `/me` verification; only the verified profile unlocks content. Logout clears identity after success or 401; other failures propagate and retain local identity for retry. Login/logout promises propagate safe errors to host forms, which own pending state, validation and password clearing. Operations serialize mutations and discard obsolete verification responses.

`useAuth().handleApiError` accepts this module's ApiError. For other adapters, explicitly map their verified HTTP 401 into this class; never infer 401 from message text. It immediately clears identity and invalidates pending verification. Call only for requests belonging to the current account/session generation; discard late errors from obsolete clients. Tenant/CRM 403 stays local to the denied operation; it is not global logout. `/me` 403 changes the session to denied. Network/server/contract failures during verification clear displayed identity and fail closed. Account/session changes must unmount CRM consumers, cancel reads, discard records and reset organization selection. The host owns that data lifecycle.

Provider refresh listeners are installed only while authenticated and removed on state change/unmount. Visible polling can extend the backend idle session; there is no invented client expiry timer. SSR always renders checking and must never share a session across requests. The provider has no browser effects during server rendering.

## CSRF and deployment

Fresh `/api/auth/csrf` is fetched before each login/logout mutation; `X-CSRF-TOKEN` is held only within that operation. Tokens are not stored or automatically replayed. CRM clients independently fetch fresh tokens for their writes, especially after authentication changes. Preserve credentials:include, cache:no-store, redirect:error and bounded requests. No bearer tokens, localStorage/sessionStorage credentials, inferred permissions or tenant headers on auth calls.

Production must proxy `/api` on the frontend origin to Spring, preserve method/body/cookies/CSRF and organization headers, forward Set-Cookie correctly, prevent caching of auth responses, and serve SPA routes without rewriting API failures to HTML. Deploy HTTPS with `SESSION_COOKIE_SECURE=true`, HttpOnly and SameSite=Lax. Validate cookie path/domain and trusted proxy TLS configuration in the real deployment. Vite proxy is development only. Cross-origin deployment needs a separately verified credentialed CORS/cookie policy; none was established in inspected security configuration.

## Required integration acceptance tests

- Real browser: fresh CSRF session, login cookie continuity, session ID rotation, `/me`, logout invalidation and rejected stale cookie; Secure/HttpOnly/SameSite and proxy behavior.
- Missing/wrong CSRF on every mutation rejected; fresh token after login/logout works; no automatic mutation replay.
- Guard never shows private content during startup, SSR/hydration, expired/disabled user, `/me` 403, network outage or malformed profile; fallback retry recovers.
- Provider mount/unmount and StrictMode listener/timer cleanup, focus/visibility refresh, concurrent verification and logout, and pending form/error/password behavior.
- CRM 401 clears identity/data; tenant 403 preserves identity while denying the operation; obsolete response/error cannot restore or clear a newer account.
- All actual roles against real backend: VIEWER cannot write; OWNER/ADMIN/SALES_USER can perform permitted writes; revoked membership/archived organization and foreign object IDs fail server-side.
- Organization discovery and switching tests listed in ORGANIZATION-API-PROPOSAL.md once approved/implemented.

Existing mocked network/store tests remain; new public-entry tests cover SSR denial, missing provider, stale verification after API 401, local tenant denial and subscription cleanup. They do not establish live browser, deployment or backend acceptance. Production release remains dependent on those acceptance tests and provisioned development accounts.
