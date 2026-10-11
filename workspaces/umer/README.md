# Umer CRM operations — Sprint 1

Owned entirely by `workspaces/umer/` on `feature/umer-crm`. React 19.3.0, TypeScript 5.9.3, Vite 8.3.4 and Tailwind 4.3.3 preserved; no dependencies or shared files changed. [CONTRACTS.md](./CONTRACTS.md) records the inspected backend source, DTO validation, endpoints, RBAC, tenant requirements and limitations.

## Start locally

From repository root with Node 24.19.x and npm 11.6.2:

```sh
npm ci
npm run dev:umer
```

Open http://localhost:5175. Copy this workspace's `.env.example` to `.env.local` if configuration is needed. Empty `VITE_API_BASE_URL` uses a same-origin Vite `/api` proxy to `CRM_PROXY_TARGET` (default http://localhost:8080). `VITE_API_BASE_URL` is the origin/base prefix before `/api`, not a URL ending in `/api`. Restart Vite after changing environment variables. A direct cross-origin URL needs backend credentialed CORS, allowed organization/CSRF headers and compatible cookie settings; these are not changed by this workspace. Production and Vite preview need a deployment-level same-origin `/api` proxy or supported CORS.

Sign in using an already provisioned backend account and administrator-provided active organization UUID, or use an existing backend session. Credentials and tenant records are not persisted to local/session storage. The independent sign-in uses the backend's confirmed CSRF + session flow; no Wajahat imports. Every CRM request includes the backend-defined `X-Organization-ID`; server membership and role checks remain authoritative. 401/403 errors are displayed; sign out and reconnect for account/organization changes. Logout clears all UI data after successful backend invalidation. VIEWER writes are rejected by the backend; this version does not obtain roles to hide write controls.

## Screens and operations

Companies, contacts, leads and opportunities each have list, detail GET, create POST, edit PUT, archive DELETE, server search/sort, validation, loading/empty/error states and local pagination. Contact/company association is required; leads may have no company. Opportunities require a company and only allow contacts from that company, with paired nonnegative amount/currency. Lead status and opportunity stage changes use separate PATCH routes and expose only source-confirmed transitions. New opportunities use the backend's QUALIFICATION default; choosing another initial stage is not exposed. List filters support company, lead status, opportunity stage and opportunity contact. Company/contact status is free text.

The backend returns complete arrays; pagination is explicitly local, not server pagination. Large datasets will need a future backend paging contract. No organization discovery endpoint or lead/contact association was found. Related names use active association lists; archived/unavailable associations display their IDs in table/detail views and must be replaced to submit valid associations. Monetary values use JSON numbers, so backend BigDecimal precision beyond JavaScript safe numeric precision remains a limitation.

## Verification

```sh
npx eslint workspaces/umer --max-warnings=0
npm run typecheck --workspace=@wautech/umer
npm run test --workspace=@wautech/umer
npm run build --workspace=@wautech/umer
```

Mocked-network tests cover all four API CRUD workflows, CSRF rotation, cookie/tenant headers, confirmed PATCH endpoints, query encoding, filters, cancellation, 400/401/403/404/500/network failures and malformed responses. Validation and static component tests cover relationships, paired money, required/length/email fields, pagination, loading, empty and error states. These tests are not proof of live integration or full browser interaction coverage.

For manual browser QA, open `/tests/preview.html` on the development server. This separate, clearly marked mock-network fixture never calls a real backend and is excluded from the production entry. It resets on reload. Search `forbidden` for 403 or `backend-error` for 500. The fixture is intentionally limited and does not replicate backend validation/security enforcement.

Live smoke script (not yet successfully executed): set `CRM_SMOKE_BASE_URL`, `CRM_SMOKE_ORGANIZATION_ID`, `CRM_SMOKE_EMAIL`, `CRM_SMOKE_PASSWORD` in your local environment, then run `node workspaces/umer/tests/live-smoke.mjs`. It signs in, creates one uniquely named company, verifies list/detail/update/search, archives it, verifies absence and logs out. Use a development backend/account; credentials are never printed. Cleanup is attempted if a later assertion fails.

## Later apps/web integration

`Workspace` accepts a `CrmApi`, authenticated `User`, trusted selected organization ID, sign-out callback and state. Host routing can mount it after shared authentication/tenant selection; construct a fresh client and remount with a tenant key whenever account or organization changes to discard records and cancel old reads. Keep cookie credentials and CSRF handling intact. Replace the local shell/styles with shared components only in a separately approved integration change; CSS currently contains global rules and needs namespacing before coexistence with other applications. No root, shared package, apps/web, authentication workspace, dashboard workspace or backend changes are included.

See [SPRINT-REPORT.md](./SPRINT-REPORT.md) for verification results, changed files and readiness.
