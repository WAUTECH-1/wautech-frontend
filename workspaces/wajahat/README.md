# Wajahat — Sprint 1 authentication workspace

Changes are confined to `workspaces/wajahat/` on `feature/wajahat-auth`. No new dependencies or root configuration changes are required. The original `App.tsx` and its foundation test are retained unchanged as the foundation fixture; `main.tsx` now mounts `AuthApplication`.

## Run

From the repository root:

```sh
npm ci
npm run dev:wajahat
```

Open http://localhost:5173. Port 5173 remains strict. Copy this workspace's `.env.example` to `.env.local` if necessary. `VITE_API_BASE_URL=/` uses the browser's origin; the workspace-local Vite proxy forwards `/api` to `WAUTECH_DEV_API_TARGET` (default http://localhost:8080). The target is server-side development configuration, not a browser secret or credential. Use the default same-origin setup because the inspected backend has no browser CORS configuration.

Production must provide a same-origin reverse proxy for `/api`, HTTPS, and appropriate server-managed secure cookies. Vite's development proxy is not part of the production bundle or preview server. A separate HTTPS backend origin can be set with `VITE_API_BASE_URL`, but cross-origin credentialed CORS must first be verified; this workspace does not configure or bypass backend CORS. Values must be origins without paths, credentials, query parameters, or fragments. HTTP is permitted in the browser client only for loopback development origins.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run format:check
```

Workspace-only test/build commands remain `npm test --workspace=@wautech/wajahat` and `npm run build --workspace=@wautech/wajahat`.

## Delivery verification

Root lint, TypeScript checks, tests, all three builds, and formatting checks passed on October 11, 2026. Wajahat has 32 passing tests across five files, including the unchanged foundation test; Asad and Umer each retain their passing foundation test (34 total). No unrelated check failures were found. No dependency or lockfile changes were made.

Browser verification covered required-field focus, password visibility, password clearing on failed requests, denial of private content during a backend outage, explicit unauthorized/access-denied routes, and 390px mobile and 1280px desktop layouts without horizontal overflow. A mobile heading-spacing issue and login outage presentation were corrected during verification. Screenshots show the real unavailable-backend notice, not a simulated login. Reduced-motion support is provided in CSS. Authenticated session transitions were verified with mocked network responses; rendered-component tests confirm the unavailable organization state. No live backend or organization switching flow was demonstrated.

## Screens and routes

| Route            | Behavior                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------- |
| `/`, `/login`    | Email/password login, validation, password visibility, loading/errors, expired-session and logout feedback |
| `/portal`        | Protected verified current-user profile and sign out                                                       |
| `/organizations` | Protected organization capability screen; selection/memberships/roles explicitly unavailable               |
| `/unauthorized`  | Sign-in-required page                                                                                      |
| `/access-denied` | Permission-denied page; also shown on a server 403 during session verification                             |
| Other paths      | Not-found page                                                                                             |

On startup, private content waits for `/api/auth/me`. A backend outage leaves protected content inaccessible and shows retry; the login screen remains available with a connection notice. Successful login is accepted only after an additional `/me` request verifies the session cookie. Focus/visibility changes and a 60-second visible-page interval revalidate authenticated sessions. There is no assumed client-side expiry timestamp: the backend's HTTP response is authoritative. Session failure clears profile display. The form preserves no password after a failed attempt, has associated error messages, supports keyboard input, and respects reduced-motion preferences.

## Verified backend contract

Inspected backend `main` at **74467a4e68b480387ca1ff16516feca4afb1d095** on October 11, 2026. The existing local backend checkout was older (`1c3bf1b`); a temporary reference clone was used without changing that checkout.

| Method | Actual endpoint    | Contract                                                                           |
| ------ | ------------------ | ---------------------------------------------------------------------------------- |
| GET    | `/api/auth/csrf`   | `{ headerName, parameterName, token }`; verified header `X-CSRF-TOKEN`             |
| POST   | `/api/auth/login`  | JSON `{ email, password }`, session cookie and CSRF header; returns public profile |
| GET    | `/api/auth/me`     | Session-authenticated `{ id, email, firstName, lastName }`                         |
| POST   | `/api/auth/logout` | Session cookie and fresh CSRF header; successful response 204                      |

Source references (relative to backend repository):

- `backend/src/main/java/com/wautech/crm/identity/controller/AuthenticationController.java`
- `backend/src/main/java/com/wautech/crm/identity/service/AuthenticationService.java`
- `backend/src/main/java/com/wautech/crm/identity/dto/{LoginRequest,AuthenticatedUserResponse,CsrfTokenResponse}.java`
- `backend/src/main/java/com/wautech/crm/platform/security/{SecurityConfiguration,UserEnabledSessionFilter,ActiveOrganizationContextFilter,CrmAuthorization}.java`
- `backend/src/main/java/com/wautech/crm/organization/service/OrganizationMembershipService.java`
- `backend/src/main/java/com/wautech/crm/organization/entity/{OrganizationRole,MembershipStatus}.java`
- `backend/src/main/resources/application.yml`
- `backend/src/test/java/com/wautech/crm/identity/controller/AuthenticationControllerTest.java`

Email is required and limited to 254 characters. Password is nonblank; the login service rejects values beyond bcrypt's 72-byte limit. Client validation counts UTF-8 bytes and imposes no invented password minimum. Email is trimmed; the password is transmitted without trimming. Backend errors use ProblemDetail; the UI maps status codes to safe messages instead of displaying raw exception detail.

## Security and tenant boundaries

- Authentication is a Spring session, not a browser bearer token. Requests use `credentials: include`, `cache: no-store`, and reject redirects. No credentials are stored in localStorage/sessionStorage or logged.
- CSRF is fetched immediately before each login/logout POST and kept only within that operation. No request is replayed automatically after a failure. The backend changes the session ID on login and invalidates the session on logout.
- Backend cookie name: `WAUTECH_SESSION`, HttpOnly, SameSite=Lax, Secure controlled by `SESSION_COOKIE_SECURE`. Default session idle timeout is 30 minutes; frontend session checks can keep a visible session active. Actual deployment behavior is unverified.
- Login responses never independently unlock the portal; `/me` verifies cookie continuity. Failed logout reports failure and retains local session state unless the server responds 401. A stale profile response cannot restore a logged-out session.
- Backend `ActiveOrganizationContextFilter` requires `X-Organization-ID` on non-auth CRM requests, validates active persisted membership, and supplies a trusted server request context. `CrmAuthorization` checks persisted roles: OWNER/ADMIN can manage organizations; SALES_USER/VIEWER cannot. Frontend state is not an authorization boundary.
- This application sends no organization header or CRM/admin requests, because there is no verified way to discover the current user's memberships. It never infers administrative roles from profile fields.

## Missing capabilities and limits

Organization and membership DTOs/services exist internally, but there are **no organization/membership HTTP controllers** in the inspected backend. No membership list, role discovery, current organization, or organization-switch HTTP contract is available. `/me` contains identity only. The organization screen therefore cannot select a tenant and displays no fabricated organizations or roles. Registration and password reset are also absent and are not offered.

No backend was listening on local port 8080 during inspection, and no valid development credentials were supplied. Real HTTP authentication, deployed cookies, CORS, database provisioning, and browser session expiration remain unverified. Automated network tests are explicitly mocked and are not evidence of a production login. The supported authentication client is implemented against source-verified contracts; the complete organization-flow acceptance criterion remains blocked by the missing HTTP APIs. No backend changes were made or requested.

## Future integration into apps/web

Coordinate shared ownership review first. Mount `AuthApplication` under the host's route structure or adapt its local route handling to the eventual host router. `AuthSession` exposes `subscribe`, `getSnapshot`, `restore`, `login`, and `logout`; `createAuthApi` provides only the four verified auth calls. `AuthenticatedUser` contains only the public identity fields. Components accept local callback props and do not import other developer workspaces or shared contracts.

When verified organization HTTP APIs become available, separately review their DTOs and tenant policy before adding membership discovery or selection. Never turn the current capability message into a client-only organization picker. Reconcile styling and route ownership before moving code; the current stylesheet is workspace-global. Each mounted application owns its session instance; the host must preserve that isolation if server rendering is introduced. Do not push, open a PR, or merge this feature without explicit approval.
