# Sprint 2 delivery — Umer unified application foundation

Date: 2026-10-12. Branch: `feature/sprint2-umer-web-foundation`. Base: freshly fetched origin/main `3c1177f1c49d32224fc87cac67645726990dfd3b` (Sprint 1 implementations merged). Backend remote main matched the inspected local source at `74467a4e68b480387ca1ff16516feca4afb1d095`. All changes are inside `apps/web/`; other workspaces, packages/contracts, backend and root package/lock/configuration files were inspected read-only.

## Application structure and routes

Entry: `index.html`, `src/main.tsx`. App providers: `src/providers/`. Routing: `src/routing/` with typed manifest, History API subscription/links and access policy. Components: safe loading/error/not-found/permission panels, route view and inert integration placeholders. Adapters: `src/integrations/` for authentication, tenant, CRM and dashboard boundaries. Configuration: app-local package.json/tsconfig.json/vite.config.ts/vitest.config.ts/dev-proxy.ts/.env.example. Documentation: README.md, INTEGRATION.md, ROOT-CONFIGURATION.md and this report. Tests are seven app-local files under src.

Routes created: `/login`, `/dashboard`, `/companies`, `/contacts`, `/leads`, `/opportunities`, `/activities`, `/tasks`, `/settings`, `/unauthorized`, `/access-denied`; `/` resolves to protected dashboard; unknown routes show not-found. The production provider starts with session checking and exposes no fabricated current user or organization. Public navigation labels contain no business data. Authentication failures/outages deny private views. All tenant-dependent routes remain blocked until backend membership discovery exists. Settings is only an inert placeholder behind a verified session.

## Integration architecture

Authentication **reuses** Wajahat's AuthSession, createAuthApi, LoginPage, Brand and types/styles through read-only imports. SessionAdapter defines the host boundary without copying authentication logic. Startup restores via `/api/auth/me`; login is accepted only after cookie verification; login/logout use fresh CSRF, credentials include, no-store and rejected redirects. Focus/visibility and visible-page interval checks delegate to the same store. Error boundaries show safe generic UI and never output caught exception detail. Reused login validation handles actual email/password limits. No credentials are stored or logged.

CRM **reuses** Umer's CrmApi and existing DTOs. Prepared adapter exposes only CRM methods, checks current identity/membership before requests and after full response parsing, adds no-store/rejected redirects and cancels requests on disposal. The actual X-Organization-ID requirement is preserved, with backend membership/RBAC authoritative. No adapter is constructed by production while organization discovery is missing. Route-level CRM views need extraction from the existing standalone shell to avoid duplicate navigation; operational CRM screens have not been rebuilt or mounted in apps/web.

Dashboard interfaces accept premium shell/overview components, four existing themes, verified profile, notification data state, host navigation/logout/theme callbacks and cancellable data services. Only Asad's theme identifiers/types are imported; no demo application, metrics, fixtures, chart service or simulated notifications are mounted. Reusable exports and backend data adapters remain future integration work. Activities/tasks/settings remain protected route foundations, not working operational modules.

## Shared configuration proposal

Root npm workspaces currently exclude apps/web. No root modification was needed for local execution. ROOT-CONFIGURATION.md proposes adding `apps/*`, adding `dev:web`, and regenerating workspace registration in package-lock.json **after explicit approval**. Existing root typecheck/test/build workspace scripts would then discover @wautech/web automatically. No new framework/library or duplicate version was introduced. React/React DOM remain 19.3.0; TypeScript/Vite/Tailwind use installed repository versions.

Independent startup: `npm --prefix apps/web run dev` after root `npm ci`; strict port 5176. In this environment the installed Node runtime lacks npm, so startup was verified with `node ../../node_modules/vite/bin/vite.js` from apps/web. This is also documented as a temporary local command. No sibling development server is required. Production deployment needs HTTPS, same-origin /api reverse proxy and SPA route fallback; Vite's dev proxy is not a production proxy.

## Validation results

| Check                                         | Result                                                                                                         |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Root ESLint, max-warnings=0                   | Passed                                                                                                         |
| apps/web TypeScript noEmit                    | Passed                                                                                                         |
| apps/web Vitest                               | 55 tests passed across 7 files                                                                                 |
| apps/web production bundle                    | Passed; 35 modules; JS ~238.8 kB (~74.4 kB gzip)                                                               |
| apps/web formatting and Git whitespace checks | Passed                                                                                                         |
| Browser UI verification                       | Session outage protection, reused login required-field feedback/focus, not-found and responsive layouts passed |
| Backend HTTP health probe                     | localhost:8080 refused connections                                                                             |
| Live login/session/tenant/CRM integration     | Not verified                                                                                                   |

Automated tests cover app/provider startup, every route's access boundary, unknown/root routes, API origin/proxy validation, delegated auth session restore/login/logout, malformed/error responses, missing organization state, safe nonfunctional placeholders, error fallback, CRM adapter cookie/tenant transport, context-change rejection, late-result rejection and cancellation, plus dashboard theme interface. Authenticated users/organizations appear only in explicitly mocked tests; no production mock mode exists. UI tests use static rendering rather than complete browser interaction automation. Tests were run outside the Windows sandbox because its Vitest temporary-file access issue had been established during Sprint 1.

Browser checks used the actual independent Vite server with the real unavailable backend, not a simulated successful session. 390px mobile and 1280px desktop checks found no document horizontal overflow. Required-field validation reused Wajahat's UI and focused the email input. No business data, demo profile or synthetic authentication was displayed.

## Blockers, handoff and readiness

1. Backend has no organization/membership HTTP controller or discovery/switch/current-role contract; `/me` returns identity only. Business routes deliberately stay blocked.
2. Backend unavailable and no development account supplied: live authentication/cookies/RBAC/CSRF/CRM remain unverified.
3. Asad's premium shell/widgets need reusable exports without fixtures. No consolidated dashboard service endpoint is assumed.
4. Umer's standalone Workspace needs route-level exports/adapted navigation before mounting individual CRM routes.
5. Source imports and Wajahat's global stylesheet are temporary bridges; shared stable package exports and CSS scoping require later coordinated review.
6. Root workspace/lockfile enrollment requires explicit approval. Current local commands work without it; root workspace aggregate checks do not yet include apps/web.

The foundation is ready for source review with these limits documented. Functional delivery is entry/providers/routing/guards, reuse of existing authentication UI/client/store, API configuration/proxy, error/loading states, tests and build. Future delivery is tenant discovery, mounted CRM routes, premium dashboard, operational activities/tasks/settings and production deployment verification. The commit SHA is supplied in the delivery message (or `git log -1`); no push, PR or merge is performed in this sprint request.
