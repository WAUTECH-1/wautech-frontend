# Unified frontend integration — engineering record

## Repository preservation and delivery

Frontend integration branch: codex/unified-frontend-integration, based on origin/main 7349bf6. Wajahat's unique e5bad94 commit was cherry-picked as d012d2e. Original feature branches and all three independent workspaces remain intact. Latest Asad reusable exports and Umer CRM implementation were already merged in main.

Backend integration branch: codex/current-user-organizations, based on origin/main ec26f95. Backend changes remain exclusively in that repository. The user explicitly approved the principal-scoped read-only membership API design. Neither pull request is to be merged automatically.

## Architecture and behavior

apps/web owns the sole production React root, typed History API router and public API-origin configuration. The default root dev command starts web on 5176. Developer commands remain on 5173–5175.

Wajahat's AuthProvider owns the only initial/session-refresh lifecycle. The same AuthSession controls login, protected routes, restore and logout. A session epoch distinguishes reauthentication of the same account from ordinary /me refresh. API 401 invalidates identity immediately; tenant 403 stays local. Every account/tenant generation owns fresh requests and UI state; cancellation and pre/post-read checks discard obsolete results. No automatic mutation replay or persistent credential storage is introduced.

A backend-confirmed membership, not a manual UUID, establishes tenant context. Discovery returns only the enabled principal's ACTIVE memberships in non-archived organizations. Selected membership is revalidated. Single membership is selected automatically; multiple memberships require selection. Switching invalidates the old context synchronously and aborts old requests. The backend independently validates tenant membership and roles on every CRM request.

Umer's content-only export reuses the existing Workspace, forms, tables, validation and transitions. Standalone login/sidebar/navigation remain available in his app. Production supplies a controlled resource and operations-only interface; VIEWER write controls are disabled, with server authorization retained. Lists use server search/sort and explicitly local pagination. No nested application root or nested main landmark is mounted.

Asad's host-safe exports supply the premium shell, widgets, four themes, mobile drawer, profile and notification panels. Routing is controlled by web. Scoped dashboard/CRM/auth styles preserve the design and isolate standalone resets. Production maps authorized current collections and pipeline aggregates to view models; money stays separated by currency, invalid/absent money remains unavailable, and malformed datasets are not converted to plausible metrics.

Task completion/reopening and notification read-all send confirmed PATCH contracts with fresh CSRF, show failures and reload confirmed data. Historical analytics are explicitly unavailable; no synthetic revenue/growth/history exists. The assistant remains disconnected. Activities/tasks are presentation plus the supplied task status action; full activity/task authoring was not part of the completed source being integrated.

## Backend additions

GET /api/auth/organizations and GET /api/auth/organizations/{id}/membership return minimal caller-only DTOs with no-store headers. Existing CRM filters, admin role policy and membership management remain intact. No schema migration or real-account provisioning is performed.

Real HTTP testing exposed an existing PostgreSQL parameter-type failure for null task date filters. Explicit timestamp casts fix dueBefore/dueAfter without changing endpoint or tenant semantics.

## Verification evidence

- Clean npm ci with pinned Node/npm and root lockfile; no new third-party frontend packages or version upgrades.
- Root lint, strict TypeScript, workspace tests, formatting and all four production builds.
- Frontend suites: web 82, Asad 10, Umer 29, Wajahat 36 (157 total).
- Backend standard verify: 347 regression tests pass; four fixture-only live tests are opt-in/skipped in standard execution.
- Four real HTTP scenarios passed against a newly created disposable PostgreSQL database using real security filters/persistence: CSRF/login/me/logout/disabled session; organization discovery, selection and revocation; viewer permissions and cross-tenant object rejection; four-module CRUD/transitions plus dashboard endpoint contracts.
- Existing PostgreSQL volume/account data was preserved. The fixture container used tmpfs and was stopped after tests.
- Browser QA uses explicit mocks for UI interactions: organization selection, CRM creation/edit/archive, module navigation, browser Back/Forward, mobile drawer, theme switching/persistence and responsive layout. It is not live-account proof.
- The existing admin@wautech.local browser login remains unverified without the owner's private password. No password was requested in chat or changed.

## Commands and environment

Frontend: npm ci; npm run dev (or dev:web); npm run check; npm run verify:dev; npm run build --workspace=@wautech/web.

Backend from its root: docker compose up -d --wait postgres; then cd backend and ./mvnw.cmd spring-boot:run. Verify with ./backend/mvnw.cmd -f backend/pom.xml verify. Isolated real HTTP tests: ./scripts/Test-UnifiedIntegration.ps1 (Docker running, Java 25, port 15432 available).

Frontend variable names: VITE_API_BASE_URL, WAUTECH_DEV_API_TARGET. Backend: DB_URL, DB_USERNAME or DB_USER, DB_PASSWORD, DB_NAME, DB_PORT, SERVER_PORT, SESSION_COOKIE_SECURE. Isolated runner generates its own fixture variables and does not use the normal database.

## Manual acceptance and remaining release requirements

1. Review and merge/deploy the backend dependency, then review the frontend PR.
2. Sign in using the owner's existing admin@wautech.local password; refresh the page, select only discovered memberships and inspect dashboard data.
3. Test all four CRUD screens with isolated authorized fixtures, relationship validation and transitions. Never alter real records for acceptance.
4. Verify deep links, Back/Forward, themes, mobile menus, modal keyboard focus and profile/logout.
5. Verify API outages, expiration, tenant 403 versus session 401, revoked memberships and rapid tenant/account switching.
6. Validate production same-origin reverse proxy, HTTPS Secure/HttpOnly/SameSite cookies, no-store and SPA fallback excluding /api failures.

No production-readiness claim is made before deployment and existing-account browser acceptance. Unmerged backend discovery is a release dependency. Large unpaged CRM lists/membership sets need later scalability work; accounting precision/financial reconciliation and full accessibility audit remain release considerations. Historical analytics, AI and unsupported authoring are visibly unavailable rather than simulated.
