# Sprint 3 platform delivery — Wajahat

## Baselines and release dependencies

Both repositories were clean at start. Origin/main was fetched. Frontend PR [#8](https://github.com/WAUTECH-1/wautech-frontend/pull/8) and backend PR [#20](https://github.com/WAUTECH-1/wautech-crm/pull/20) were verified **open/unmerged**. Sprint 3 branches start at their compatible heads, frontend `c8398c48aa31242ed373878e32c5b85d581764d7` and backend `39e8421731c1c799c9e0ec5a92a03eed92e26150`. Both contain origin/main. Those predecessor branches are preserved. No accounts, database records, migrations or production settings were changed during development.

Both dedicated branches: `feature/sprint3-wajahat-platform`. The small registration foundation was pushed early as `ef27112`. Final branch heads and PR links are reported in the delivery message; use `git log -1` for the latest revision after review amendments. The PRs target main and must not be merged automatically; their diffs include the unmerged predecessors until those land.

## Feature completion matrix

| Requirement                     | Delivered behavior                                                                                                                                                   | Boundaries                                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Feature registration            | Automatic manifests; lazy pages; providers; loading/error fallbacks; descriptors; role and tenant guards; example and tests                                          | One existing React root and History API router                                                                        |
| Organization profile/settings   | Current name, ID and role; confirmed name edit for admins/owners                                                                                                     | Name is the supported editable setting; other members see their organization name/role through verified discovery     |
| Membership management           | Admin/owner listing; existing-user ID creation; activation, suspension/reactivation; role changes                                                                    | No user directory, account provisioning or email delivery; new members start INVITED/VIEWER                           |
| User profile                    | Principal-only GET/PATCH; validated first/last name                                                                                                                  | Email remains read-only; shell session display name refreshes on next sign-in                                         |
| Account settings                | Organization switching, theme preference integration, confirmed logout, unavailable recovery/MFA labels                                                              | Themes use the existing shell preference storage; shell appears after a verified tenant is selected                   |
| UX/security                     | Direct URL guards, forbidden/not-found/session-expired screens, lazy fallbacks, API retries, empty lists, confirmed administrative writes, mobile header/table fixes | Backend remains authoritative; no access granted by UI state                                                          |
| Unsaved changes                 | Unload warning and in-app navigation confirmation for profile/admin edits                                                                                            | Browser Back/Forward and organization switching do not prompt; scoped pages are discarded when tenant/session changes |
| Other developers' Sprint 3 work | Registration/export boundary and integration procedure ready                                                                                                         | Their new feature branches have not been merged or claimed as tested/integrated                                       |

## New backend endpoints

| Method/path                                       | Authorization and behavior                                                                           |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| GET `/api/organization`                           | Active current tenant + ADMIN/OWNER; organization profile                                            |
| PATCH `/api/organization`                         | Same + CSRF; validated organization name                                                             |
| GET `/api/organization/memberships`               | Same; only current organization memberships                                                          |
| POST `/api/organization/memberships`              | Same + CSRF; validated existing user UUID; creates INVITED/VIEWER; sends no email                    |
| PATCH `/api/organization/memberships/{id}/status` | Same + CSRF; validated status enum; existing lifecycle transition/last-owner/enabled-user safeguards |
| PATCH `/api/organization/memberships/{id}/role`   | Same + CSRF; validated role enum; existing role-assignment/self-change/owner safeguards              |
| GET `/api/auth/profile`                           | Enabled authenticated principal only, no tenant header, no-store                                     |
| PATCH `/api/auth/profile`                         | Same + CSRF; first/last name only, no-store, audit event                                             |

All organization endpoints derive the ID from the existing authenticated request context established by the tenant filter. No organization ID in a URL/body can override it. Membership IDs are resolved with `findByIdAndOrganization_Id`. Existing organization/membership services provide method security, transactions, audit hooks and owner locking. No migration or second security mechanism was added. Frontend transports overwrite tenant headers, omit them for auth calls, abort stale requests and invalidate the sole session on 401.

## Permission matrix

| Capability                                                       | OWNER                       | ADMIN                    | SALES_USER | VIEWER |
| ---------------------------------------------------------------- | --------------------------- | ------------------------ | ---------- | ------ |
| Own profile/account/theme/organization switching                 | Yes                         | Yes                      | Yes        | Yes    |
| CRM reads                                                        | Yes                         | Yes                      | Yes        | Yes    |
| CRM writes (existing policy)                                     | Yes                         | Yes                      | Yes        | No     |
| Organization admin profile, edit and membership listing/creation | Yes                         | Yes                      | No         | No     |
| Assign ADMIN/SALES_USER/VIEWER to another non-owner              | Yes                         | Yes                      | No         | No     |
| Assign or change OWNER                                           | Yes, last-owner rules apply | No                       | No         | No     |
| Activate/deactivate other members                                | Yes, owner safeguards apply | Yes, cannot act on OWNER | No         | No     |
| Change own role                                                  | No                          | No                       | No         | No     |

The verified backend has SALES_USER, not MEMBER. No speculative MEMBER mapping is introduced. UI disables self-deactivation too; backend lifecycle rules remain authoritative for all API callers.

## Verification and reproduction

- Root ESLint, formatting, all five workspace TypeScript checks, all four workspace test suites and all four production builds pass. 170 frontend tests: web 95, Asad 10, Umer 29, Wajahat 36.
- Backend Maven verify and executable packaging pass: 356 tests passed, four opt-in live integration tests skipped. New coverage exercises actual tenant/security filters, real service method authorization, admin reads, viewer/sales denial, anonymous access, missing CSRF, foreign tenant and membership IDs, DTO validation, creation/role/activation/suspension, and principal-only profile updates. Existing owner protections and tenant-isolation suites also pass.
- The reproducible `apps/web/tests/administration-smoke.mjs` browser runner passed 16 assertions: admin listing, self-role prohibition, confirmation/cancel, role change, deactivate/reactivate, INVITED creation/no email, profile save, unavailable services, viewer navigation, organization switch, History API Back, logout, direct viewer URL denial, expired API session removal. It uses `tests/preview.html` with clearly labeled **in-memory mocks**, excluded from production entry/build. No live-account changes occur.
- Responsive browser check at 390 × 844: controls visible, table scrolls inside its container, document width does not exceed viewport. Header height adapts in host CSS; Asad/Umer implementations were not edited.
- The current shell lacks npm/npx on PATH; existing installed Node 24.19.0 ran the exact ESLint/Prettier/TypeScript/Vitest/Vite executables used by the root check scripts. No dependencies or lockfile edits. In a configured dev environment reproduce with `npm run check`; backend: `cd backend` then `mvnw.cmd verify` with Java 25.
- Browser runner: start `npm run dev:web`, bind the localhost preview tab with `cua_repl`, import `file:///C:/development/wautech-frontend/apps/web/tests/administration-smoke.mjs`, and call `runAdministrationSmoke(tab)`. The runner navigates only to the mock fixture.

## Registration contract and final three-developer integration

The dedicated typed interface is `apps/web/src/features/contract.ts`; [contract documentation](./sprint3-feature-contract.md) explains the automatic registration boundary. Existing sidebar items remain Asad's; registered descriptors use the shell's host navigation slot, filtered by the same access policy as URLs.

1. Review/merge backend #20 and frontend #8. Deploy the membership-discovery backend before releasing unified frontend code.
2. Review/merge backend Sprint 3 and frontend Sprint 3, in that order; deploy matching versions. No automatic merges or force pushes.
3. Asad and Umer continue against their verified baselines while review proceeds. Each produces self-contained content exports in their owned workspace and a lightweight `features/<module>/feature.ts` manifest adapter. They do not edit App.tsx, RouteView.tsx, package-lock or root config.
4. Wajahat reviews export/context compatibility and adds only narrow boundary adapters when necessary. Do not copy components or change their owned implementation files. Rebase/merge updated main into each owned feature branch and resolve collisions at the manifest boundary.
5. Merge one reviewed feature branch at a time; run root checks and browser route/role/tenant/session smoke after each. Use verified backend roles and supported endpoints only.
6. Validate real HTTP behavior against disposable test users/database before staging release, then perform deployed HTTPS/proxy/cookie/CSRF/session and accessibility acceptance. Do not alter real-user records without explicit approval.

## Remaining blockers and limitations

Prerequisite PRs #8/#20 remain unmerged. Sprint 3 PR review/merge and deployment are outstanding. No new real-HTTP/PostgreSQL administration run was performed; authorization controller tests use real security/services with mocked persistence, and browser tests use mocks. Email invitation delivery, password reset, email verification and MFA infrastructure are absent and labeled unavailable. Existing-user membership creation requires an administrator-supplied UUID. Membership listing is unpaged. Organization settings are limited to the existing supported name field. Unsaved-change protection does not intercept browser history or organization switching. Registered navigation lives in the host slot, preserving the owned sidebar. Live deployed acceptance and a comprehensive accessibility audit remain required.
