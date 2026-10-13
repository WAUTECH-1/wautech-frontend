# Sprint 3 intelligence — Wajahat Syed

Developer name follows the user's correction to the pasted brief. Branch keeps the brief's exact name: `feature/sprint3-asad-intelligence`.

## Baseline and ownership

Frontend origin/main was fetched and the clean branch started from `8f60f39` (merged frontend #8 unified app and #9 registration/platform work). Backend origin/main was fetched at `9173373f29ac1d3840ed95b81c8d1c1ddb506703`; its existing pipeline, opportunity, task and activity contracts match the inspected local source. Prior platform branches and work are preserved.

All production additions are isolated under `apps/web/src/features/intelligence/`. The only change outside that directory is the existing route-inventory test expectation for `/reports`. App.tsx, RouteView, router implementation, authentication/providers, platform/admin features, Umer's implementation, all developer workspaces, root configuration and package-lock are unchanged. Existing Asad Card/shell and Umer CRM operations are consumed through exports. No second root/router/login or new dependency is introduced.

## Implemented feature matrix

| Feature              | Delivered                                                                                                                                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Executive dashboard  | Current company/contact/lead/opportunity counts; lead statuses; opportunity stage distribution; won/lost counts; open value by currency; pending/completed/cancelled tasks; recent activity                             |
| Pipeline             | Stage groups/counts; exact currency-separated filtered totals; search/stage/currency filters; 30-record visible pages; read-only detail retrieval and navigation to existing CRM workspace; confirmed stage transitions |
| Reports              | Current stage/currency distribution, lead qualification cohort and qualified share, won/lost counts, task statuses, activity count, authorized CSV export                                                               |
| State handling       | Loading, empty, per-dataset errors, retry/refresh, invalid-money indicators, denied writes, terminal-stage restrictions, context invalidation                                                                           |
| Performance          | Scoped cache with 30-second freshness; coalesced concurrent consumers; pending request cancellation on final unmount; generation checks; 5,000-record and streaming 10MB response bounds                                |
| Layout/accessibility | Existing premium shell, scoped theme-aware styles, keyboard controls, focus outlines, native confirmation dialog/focus return, responsive stage grid, contained table scrolling                                         |

## Real data versus unavailable metrics

| Metric                             | Definition/source                                                                    | Limit                                                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Company/contact totals             | Length of verified non-archived lists                                                | No aggregate/pagination contract exists; above 5,000 records the metric fails explicitly                                          |
| Lead statuses/qualified share      | Current statuses; QUALIFIED divided by current leads in the selected creation cohort | Not a true lead-to-opportunity conversion metric; archived/deleted leads are not a historical cohort                              |
| Opportunity counts/stages/won/lost | Existing `/pipeline` server aggregate of non-archived opportunities                  | Current state, not closed-date revenue or a historical win rate                                                                   |
| Open pipeline value                | Server aggregate by currency, excluding CLOSED_WON/CLOSED_LOST                       | Backend omits records with missing amount/currency; value is not a forecast                                                       |
| Filtered pipeline values           | Exact sums of the full loaded, filtered opportunity list; separate currency buckets  | Invalid/missing values are excluded and counted; records are loaded for the pipeline experience, not solely for dashboard metrics |
| Tasks/activity                     | Current task statuses and recorded activity timestamps                               | Activities have no completion state; no fabricated activity completion metric                                                     |
| Lead date filter                   | Inclusive UTC creation dates, applied explicitly                                     | Applies only to lead qualification breakdown/CSV lead cohort; other summaries remain current snapshots                            |
| Owner breakdowns                   | Unavailable                                                                          | Verified contracts do not expose ownership                                                                                        |
| True lead conversion               | Unavailable                                                                          | No authoritative lead-to-opportunity links or conversion event contract                                                           |
| Trends/growth/forecasts/revenue    | Unavailable                                                                          | No historical/revenue-recognition contract; CLOSED_WON value is explicitly not recognized revenue                                 |

Money is read from bounded raw JSON with decimal number tokens preserved before JS floating-point conversion. Nonnegative fixed decimals are validated and added using BigInt with aligned scales; currency buckets never combine. Database opportunity values use NUMERIC(19,4). Formatting retains exact decimal text rather than converting large totals to Number. Invalid aggregate financial data rejects that dataset; invalid individual opportunity values remain unavailable rather than zero. CSV quotes every field, escapes quotes/newlines and prefixes spreadsheet formula-like cells.

## API contracts used / added

No backend endpoint, migration, account or production record was changed. No backend branch/PR is needed for this delivery.

| API                                   | Use                                                                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| GET `/api/companies`, `/contacts`     | Verified active record counts                                                                                                               |
| GET `/api/leads`                      | `id`, `status` (NEW/CONTACTED/QUALIFIED/DISQUALIFIED), `createdAt`; validated lead status cohorts                                           |
| GET `/api/pipeline`                   | `{stages:[{stage,opportunityCount,totalsByCurrency}]}`; six verified stages, nonnegative integer counts, exact values separated by currency |
| GET `/api/opportunities`              | Pipeline list with `id`, `name`, `stage`, `amount`, `currency`, `companyId`, `createdAt`                                                    |
| GET `/api/opportunities/{id}`         | Read-only detail from the existing endpoint, with response ID validation                                                                    |
| PATCH `/api/opportunities/{id}/stage` | Existing `createCrmAdapter().operations.changeOpportunityStage`; CSRF refresh and confirmed response                                        |
| GET `/api/tasks`                      | OPEN/IN_PROGRESS pending; COMPLETED/CANCELLED summary; backend overdue flag                                                                 |
| GET `/api/activities`                 | `subject`, `occurredAt`; most recent ten entries sorted by timestamp                                                                        |

All reads/writes reuse the sole session, trusted tenant, credentials policy and scoped transport. Session 401 invalidates identity; tenant 403 remains a denial. Captured user ID, tenant ID/member identity/source/generation and session epoch must still match before data can be published. VIEWER and unknown roles cannot initiate stage writes. OWNER/ADMIN/SALES_USER can request only existing allowed stage transitions; CLOSED_WON/CLOSED_LOST are terminal. Backend authorization remains authoritative. There is no optimistic update; failed/unconfirmed responses cannot alter displayed records.

## Route/navigation exports and exact registration

`index.ts` exports DashboardPage, PipelinePage, ReportsPage, intelligenceRoutes, intelligenceNavigation, intelligencePermissions, scoped runtime/data adapters and CSV helpers. `feature.ts` is the lightweight default `FeatureModule`; page imports are lazy. All routes require a verified tenant. Required read roles are OWNER/ADMIN/SALES_USER/VIEWER; writes require OWNER/ADMIN/SALES_USER and a permitted transition.

1. Review and merge the intelligence PR into main containing the registration contract from frontend #9.
2. Keep `apps/web/src/features/intelligence/feature.ts` in place. The existing `features/*/feature.ts` glob discovers it automatically; do not add imports to App.tsx or RouteView.
3. `/dashboard` and `/pipeline` replace the matching core page renderers. Their existing sidebar labels remain Overview and Sales pipeline. `/reports` adds a Reports descriptor in the existing shell's host navigation slot.
4. Content pages use `useFeatureApplication()` and existing API adapters. Do not create another shell/root/router/session. For manual assembly elsewhere, consume the exported pages/descriptors and wrap them in the existing verified tenant/application context; the scoped CSS is imported by the pages.
5. Merge other developers' exports through their own manifests, preserving unique IDs/paths. This delivery does not claim their new branches are integrated.
6. Run `npm run check` and the browser smoke after integration, then verify actual staging backend/HTTPS/session/CSRF behavior with disposable accounts before release.

## Tests and builds

- Root ESLint and formatting pass; all five workspace TypeScript checks pass.
- 207 frontend tests pass: web 132, Asad 10, Umer 29, Wajahat 36. Intelligence coverage includes precision/currency separation, missing/invalid money, stage transitions, roles, filters, UTC dates, tenant/account switching, stale/racing/aborted requests, cache coalescing, empty datasets, API failure/rejection, CSV escaping/formula protection and actual registered dashboard/report rendering.
- All four production builds pass with lazy Dashboard/Pipeline/Reports chunks. Production JS was scanned and contains none of the mock fixture banner, user email or opportunity names.
- The reproducible `browser/smoke.mjs` runner passed 13 browser assertions: executive currency totals, recent activity, pipeline filters/details, stage cancel/confirmation, defined qualification metric, unavailable metrics, applied UTC date filtering, CSV download, tenant clearing and partial outage. It runs only on `browser/preview.html` using **labeled in-memory mocks**, excluded from the production import graph. This is not live backend/browser evidence.
- Browser checks at 390×844 verified both reports and pipeline have document width 375px (no page horizontal overflow), responsive navigation/grid and contained table scrolling.
- Existing bundled Node 24.19.0 directly ran the same installed ESLint/Prettier/TypeScript/Vitest/Vite tools as the root scripts because npm is absent from this shell PATH. In a configured environment reproduce with `npm run check`.
- Browser reproduction: start `npm run dev:web`; bind a localhost tab through `cua_repl`; import `file:///C:/development/wautech-frontend/apps/web/src/features/intelligence/browser/smoke.mjs`; call `runIntelligenceSmoke(tab)`.
- Backend verification is not rerun because backend source was unchanged. Existing reporting/service authorization was inspected rather than reimplemented.

## Known limits / release acceptance

Unpaged list APIs remain a backend limitation. The module fails explicitly over 5,000 records or 10MB instead of exporting misleading partial totals; a future paged/aggregate backend contract is required for larger tenants. A 30-second cache is a snapshot, not live push; explicit Refresh reconciles external changes. Component navigation cancels pending loads; confirmed server mutations can finish after navigation if the same account/tenant remains valid.

The inherited host still loads its overview/notification bundle for shell widgets on route changes. The module caches/coalesces its own requests, but cannot eliminate overlap with that host bundle without a separately reviewed central integration change. The central owner can supply the same scoped snapshot to shell widgets or conditionally avoid the legacy overview bundle for intelligence routes. This branch deliberately preserves shared assembly.

Date cohorts exclude archived records and are current-state breakdowns, not historical conversion. All other date/trend/owner/revenue metrics remain unavailable. Opportunity details are read-only here; full CRUD stays in the existing CRM workspace. No live PostgreSQL/frontend acceptance was performed. Deployed cookie/CSRF authorization, aggregate performance for large tenants and a comprehensive accessibility audit remain release checks. No automatic merge is authorized.

The final delivery message reports branch head, PR URL and CI status; use the PR head for the latest revision after review amendments.
