# WAUTECH Intelligence — unified application foundation

Sprint 2 implementation is confined to `apps/web/` on `feature/sprint2-umer-web-foundation`. It uses the existing React 19.3.0, TypeScript 5.9.3, Vite 8.3.4 and Tailwind 4.3.3 versions. No root configuration, lockfile, shared contracts, sibling workspace or backend edits are included.

## Run independently

Install the existing root lockfile dependencies once with `npm ci`, then:

```sh
npm --prefix apps/web run dev
```

Open http://127.0.0.1:5176. No other workspace server is required. `apps/web` consumes read-only source modules from the merged workspaces; it does not embed their standalone applications or require them to run. React is deduplicated in Vite. Root npm workspace commands currently do not include this directory.

Fallback commands from inside `apps/web`, using the repository's installed tools:

```sh
node ../../node_modules/vite/bin/vite.js
node ../../node_modules/typescript/bin/tsc --noEmit
node ../../node_modules/eslint/bin/eslint.js . --max-warnings=0
node ../../node_modules/vitest/vitest.mjs run
node ../../node_modules/vite/bin/vite.js build
```

With npm available, `npm --prefix apps/web run check` runs local lint, typecheck, tests and production build. Preview uses strict port 4176; development uses strict port 5176. Do not install another set of framework versions into this app. Root workspace enrollment needs separate approval; see [ROOT-CONFIGURATION.md](./ROOT-CONFIGURATION.md).

## Structure

`index.html` and `src/main.tsx` mount the root error boundary and application provider. `src/providers/` owns one auth store per mounted app and exposes current session, API configuration and unavailable organization capability. `src/routing/` contains the typed route manifest, History API subscription, accessible links and pure access-policy function. `src/components/` contains loading/error/not-found/permission panels and inert integration placeholders. `src/integrations/` contains auth, tenant, CRM and dashboard interfaces/adapters. `vite.config.ts`, `dev-proxy.ts`, `vitest.config.ts` and `tsconfig.json` provide local configuration without root edits.

## Routes and protection

| Route                                                 | Current behavior                                                                              |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `/`                                                   | Resolves to protected dashboard; never defaults to an authenticated view                      |
| `/login`                                              | Reuses Wajahat's login screen, validation, CSRF and session verification                      |
| `/dashboard`                                          | Session + organization boundary; no demonstration dashboard mounted                           |
| `/companies`, `/contacts`, `/leads`, `/opportunities` | Session + organization boundary; route adapters prepared, operational screens not yet mounted |
| `/activities`, `/tasks`                               | Session + organization boundary; future module placeholders                                   |
| `/settings`                                           | Verified session required; nonfunctional future settings placeholder                          |
| `/unauthorized`                                       | Public sign-in-required explanation                                                           |
| `/access-denied`                                      | Public permission-denied explanation                                                          |
| Unknown                                               | Public not-found page                                                                         |

Protected components are selected only after the access policy allows them. Initial checking, anonymous, server-denied and connection-unavailable states show no private page data or profile. Tenant-dependent routes additionally require membership matching the verified current user. The production provider has no ready organization setter, manual UUID input, local-storage tenant, environment tenant or mock-user mode. Because discovery is unavailable, business modules remain closed even for a verified user. A login response alone never unlocks routes: the reused client verifies the cookie with `/api/auth/me`.

## Integration boundaries

Authentication reuses `AuthSession`, `createAuthApi`, `LoginPage`, `Brand` and types from Wajahat's merged source. The `SessionAdapter` interface delegates subscription, restore, login and logout instead of cloning the implementation. Provider wiring restores on startup and revalidates on visible-page focus/visibility and every 60 seconds while authenticated. The server remains the authority on session validity. Login/logout fetch fresh CSRF and use cookies; failed logout retains the verified profile unless the server returns 401. No credentials are stored or logged.

The CRM adapter imports Umer's `CrmApi` and DTOs read-only, exports only CRM operations, and adds guarded transport with cookies, no-store, rejected redirects and cancellation. It checks account/tenant identity before requests and after full response parsing; disposal aborts old reads. It is **prepared, not connected**: the host does not construct it while organization discovery is missing. A future membership adapter must produce backend-confirmed `VerifiedOrganization` for the current user, recreate/dispose the adapter when context changes, and mount extracted route-level Umer views. The current Sprint 1 `Workspace` includes its own navigation and internal resource state, so mounting it directly would create competing route/shell ownership. Its manual development UUID access screen is not suitable for production tenant selection.

The dashboard boundary imports only Asad's existing theme identifiers/types; it does not mount `App`, fixtures, charts, demo profile, notification actions or metrics. `DashboardModule` defines shell/overview components; `DashboardShellProps` supplies verified profile, navigation callbacks, themes, logout, children and notifications; `DashboardServices` defines cancellable overview/notification loading. These are frontend interfaces, not invented HTTP endpoints. Money totals remain grouped by currency. Asad's widgets that embed fixtures need separate reusable data-prop exports before mounting. No four-theme dashboard implementation is copied into this foundation.

Wajahat's existing stylesheet is imported read-only to style the reused login component; host foundation styles use prefixed classes. This is a temporary source-level bridge. Shared stylesheet/global-token namespacing and stable package exports need team review before mounting all three modules together. No shared package migration is attempted here.

## API and deployment

Copy `.env.example` to `.env.local` for local configuration. `VITE_API_BASE_URL=/` or empty uses same-origin `/api`. A nonempty value must be an HTTPS origin, or HTTP loopback for development; credentials, paths, queries and fragments are rejected by the reused auth validator. Do not append `/api`. `WAUTECH_DEV_API_TARGET` is a development-only backend origin (default http://localhost:8080); the Vite proxy forwards cookies and strips backend cookie domain attributes without disabling authorization or CSRF.

Production must provide HTTPS, secure backend-managed session cookies, a same-origin `/api` reverse proxy and SPA fallback to `index.html` for application routes. `/api` must be routed to Spring Boot before the SPA fallback. Vite preview does not provide the development proxy. Cross-origin use additionally requires verified credentialed CORS and appropriate cookie settings; the inspected backend has no configured browser CORS. No network/security settings are changed by this app.

## Contracts and remaining blockers

Backend remote main and local source matched `74467a4e68b480387ca1ff16516feca4afb1d095` on 2026-10-12. Inspected authentication controller/service/DTOs, security/tenant filters and role policy, and company/contact/lead/opportunity controllers and request DTO validation. See [INTEGRATION.md](./INTEGRATION.md) for source details and integration handoffs.

There are no organization/membership HTTP controllers in the inspected backend; `/me` returns identity only, not tenant or role. Do not invent discovery endpoints or select an organization using an unverified UUID. Backend localhost:8080 refused connections; no valid provisioned account was supplied, so live login/cookies/CRM/RBAC were not verified. Tests use mocked responses and static component rendering; they are not evidence of live backend integration. Dashboard services, activities/tasks/settings functionality and full route-level CRM mounting remain future work.

Delivery results and PR readiness are recorded in [SPRINT-REPORT.md](./SPRINT-REPORT.md).
