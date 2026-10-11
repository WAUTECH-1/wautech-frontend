# Sprint 1 delivery report — 2026-10-11

## Scope and contracts

Frontend main was fetched and verified at `bc92df8b13cad4eeab31fbd9e553101b243ad9b1`; feature branch `feature/umer-crm` was created from origin/main. All tracked changes are inside `workspaces/umer/`. No dependencies or versions changed; no root lockfile/configuration, shared package, apps/web, other developer workspace or backend modifications.

Backend contracts were inspected before implementing the API client. Source snapshot: local wautech-crm main `74467a4e68b480387ca1ff16516feca4afb1d095`; remote backend freshness was not verified. See [CONTRACTS.md](./CONTRACTS.md) for source evidence, fields, DTO limits, relationships, errors and RBAC.

Confirmed routes: GET/POST `/api/companies`, `/api/contacts`, `/api/leads`, `/api/opportunities`; GET/PUT/DELETE `/{id}` under each collection. DELETE archives (204). PATCH `/api/leads/{id}/status` and `/api/opportunities/{id}/stage`. GET `/api/auth/csrf`, POST `/api/auth/login`, GET `/api/auth/me`, POST `/api/auth/logout` support independent development access. No bearer/Basic convention invented.

## Delivered screens

All four resources support list, detail, create, edit and archive; search, confirmed sorts, local pagination, validation, loading skeletons, empty/error states and notifications. Local sidebar, breadcrumbs, responsive tables, dialogs with keyboard focus trapping/Escape, and independent access screen are implemented. Contacts require company; leads optionally associate to company; opportunities require company and optionally matching company contact. Lead status and opportunity stage transitions are restricted to backend-defined choices.

## Verification results

| Check                                                  | Result                                                                             |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Root ESLint (`eslint . --max-warnings=0`)              | Passed                                                                             |
| Umer TypeScript (`tsc --noEmit`)                       | Passed                                                                             |
| Umer Vitest                                            | 29 tests passed across 4 files                                                     |
| Umer production build                                  | Passed; 23 transformed modules; JS ~243.5 kB, gzip ~75.8 kB                        |
| Workspace Prettier check and git diff whitespace check | Passed                                                                             |
| Browser QA                                             | Passed against explicitly marked mock network fixture                              |
| Live backend HTTP health                               | localhost:8080 connection refused                                                  |
| Live authenticated CRM CRUD                            | Not verified; backend unavailable and no provisioned account/organization supplied |

Vitest initially failed reading worker cache files in Windows sandbox temporary directories. Running the same suite outside that sandbox passed. No application workaround or dependency/version changes were made for this environmental issue. Installed the existing npm lockfile dependencies using local npm tooling because the bundled Node runtime did not include npm.

Automated mocked tests cover CRUD round trips for companies/contacts/leads/opportunities, response/error handling, login CSRF rotation, cookie/tenant headers, confirmed PATCH operations, cancellation, encoded search/sort/filter queries, required/length/email and association validation, paired money, valid transitions, pagination, list rendering/loading/empty/error states and the independent access shell. Static component tests do not simulate full browser interactions.

Manual browser QA used `/tests/preview.html`: company required-name feedback; create/detail/update/archive; page 2; empty search; 403 and 500 displays; contact creation with company; lead creation and NEW→CONTACTED; opportunity creation with matching contact, USD amount and QUALIFICATION→NEEDS_ANALYSIS. All of this used an injected mock transport, not Spring Boot. No actual backend CRUD operation is claimed verified.

## Authentication, tenancy and gaps

Cookies use `credentials: include`; mutating requests first obtain CSRF from the backend. CSRF refreshes after login. Organization header `X-Organization-ID` is confirmed in backend source and is verified server-side against persisted active membership. OWNER/ADMIN/SALES_USER write; VIEWER reads; backend rejection is displayed. No role discovery UI is implemented, so write controls remain visible to viewers. Accounts must already be provisioned. No organization discovery endpoint was found.

Backend list APIs lack page/size/total-count contracts: frontend pagination slices complete returned arrays. No field-level validation error response was confirmed, so forms provide local field feedback and display backend ProblemDetail messages. Company/contact status is free text. No lead/contact relationship is supported. Archive restoration is not exposed. Numeric precision beyond JavaScript number limits is not guaranteed for backend BigDecimal opportunity amounts. Real cookie behavior, deployment CORS/proxy configuration, database constraints and live transitions still need HTTP verification.

## Changed files

- Configuration: `.env.example`, `vite.config.ts`, `tsconfig.json`.
- UI: `src/App.tsx`, `src/Workspace.tsx`, `src/RecordTable.tsx`, `src/RecordForm.tsx`, `src/Dialog.tsx`, `src/styles.css`.
- Integration: `src/contracts.ts`, `src/api.ts`, `src/forms.ts`.
- Automated tests: `src/App.test.tsx`, `src/RecordTable.test.tsx`, `src/api.test.ts`, `src/forms.test.ts`.
- QA tooling: `tests/preview.html`, `tests/preview.tsx`, `tests/live-smoke.mjs`.
- Documentation: `CONTRACTS.md`, `README.md`, `SPRINT-REPORT.md`.

## Startup and integration readiness

From root: `npm ci`, then `npm run dev:umer`; port 5175 is strict. With empty `VITE_API_BASE_URL`, development uses `/api` proxy targeting `CRM_PROXY_TARGET` (default localhost:8080). Production requires equivalent same-origin routing or explicitly supported backend credentialed CORS. README includes lint/typecheck/test/build and live smoke commands. The live smoke script uses environment credentials, creates one uniquely named company and archives it after verification.

`Workspace` can later be mounted from apps/web with an authenticated user, selected organization and CrmApi. Remount with an account/organization key and fresh client on context changes. Global workspace CSS needs namespacing before coexisting with shared shells. This integration is documented only; apps/web and other developer applications were not edited.

Branch is ready for source review with the live verification blocker explicitly outstanding. Changes may be committed locally on `feature/umer-crm`; no push, PR or merge is authorized or performed.
