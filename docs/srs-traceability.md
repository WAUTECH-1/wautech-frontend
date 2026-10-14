# SRS traceability — current source audit

## Phase 4 extension evidence — 2026-10-14

The approved Phase 4 copilot is a versioned extension to the SRS's cautiously scoped initial AI direction, not a fabricated new original FR identifier. It reuses FR-011/FR-013 current reporting evidence and existing tenant/session/role requirements. Provider configuration, bounded read tools, source validation, durable budget/rate controls and unified assistant UI are implemented and tested with mocks. Live model performance remains UNVERIFIED/BLOCKED; FR-016/release controls and unsupported historical/conversion metrics retain their prior limits. See [Phase 4 delivery](./phase4-delivery.md); no original requirement is marked COMPLETE solely because a fluent mocked answer renders.

Audit date: 2026-10-13. [Authoritative located source: WAU TECH CRM SRS v0.1](https://docs.google.com/document/d/1t6GuXbof6uZLHirEPNnSyZAKIK7UPHQYR6qnCY37F4k/edit), document date 3 October 2026, fetched from connected Drive. Drive metadata last modified 2 October 2026; the document's approval/sign-off is not evidenced. No later approved revision was found. This is an actual SRS comparison, not a fabricated provisional inventory.

All 18 FR and 12 NFR identifiers and exact requirement sentences below are copied from sections 7–8. The SRS does **not** provide individual executable acceptance tests. “Acceptance” below is the architect's proposed test derived from the original scope, to be accepted by the sole product owner. SRS §3.2 success criteria and §16 Definition of Done additionally require local/CI tests, tenant checks, human review and staging validation. No requirement is fully release-accepted merely because a code row is COMPLETE.

## Classification

COMPLETE = scoped source behavior plus passing automated coverage, with release evidence listed separately. PARTIAL = an explicit clause or integration/quality gap remains. MISSING = no implementation located. BLOCKED = essential dependency currently prevents the acceptance action. UNVERIFIED = evidence cannot establish a required operational outcome. Status applies to the whole original requirement; sub-behaviors can have different states. Effort is remaining single-developer focused engineering time, including meaningful tests and excluding approval/provisioning waits. Do not add all ranges to a 48-hour commitment.

Source/test keys E01–E15 resolve in [implementation-status](./implementation-status.md#source-evidence-catalog). Backend paths are relative to wautech-crm; frontend paths to this repository. Backlog IDs resolve in [execution plan](./48-hour-execution-plan.md). Runtime evidence is bounded by the recorded baselines and environments.

## Current Phase 2 matrix — 2026-10-14

### Phase 3 evidence update — 2026-10-14

The original SRS identifiers/scopes and whole-requirement statuses remain intact. Current evidence advances **FR-007/008/011/012/013/015**, SCOPE-01 and the B10/B17 reporting/productivity subset: PostgreSQL aggregate executive/reporting API, exact currency totals, documented current-status shares and UTC cohorts, completion-date metric, owner/assignee reports, safe report export, complete stage counts with paged cards, configured/legacy authorized transitions, bounded global search, shared confirmation and readable details. See [Phase 3 delivery](./phase3-delivery.md) for endpoint/source/test paths and limits.

**NFR-002/008** gain real HTTP reporting isolation, VIEWER/export, >5,000-record correctness and error tests. **NFR-003 remains UNVERIFIED** for agreed expected-pilot latency/load targets; large-fixture correctness is not a production SLO. **NFR-009 remains PARTIAL** pending full WCAG acceptance despite theme/responsive/keyboard checks. **FR-016 remains PARTIAL** for exhaustive API drift/schema gates; this phase documents its new contracts. Historical conversion/revenue definitions are not fabricated or claimed COMPLETE. Deployment/recovery/scanning/onboarding blockers and separately approved AI/voice/VR vision remain unchanged.

This table supersedes Phase 1 implementation classifications below. Original IDs and verbatim scope remain unchanged in the historical requirement sections. Required backend/frontend behavior and original proposed acceptance criteria continue to apply. Current implementation/test/security details are in [Phase 2 delivery](./phase2-delivery.md); the historical E01–E15 links remain pinned baseline evidence, not proof of Phase 2 implementation.

| ID      | Current classification | Phase 2 evidence / remaining work                                                                                                                                                                            | Priority / dependency / remaining effort                              |
| ------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| FR-001  | COMPLETE               | Scoped DB pages, assignment/pipeline composite tenant FKs, foreign IDs denied over real HTTP, viewer browser tenant isolation. Staging release checks remain.                                                | P0 B01/B11; 2–4h staged verification                                  |
| FR-002  | PARTIAL                | Actual login/session/CSRF/logout/disabled-session HTTP tests pass; recovery still absent.                                                                                                                    | P0/P1 B03; approved trusted channel, 12–20h                           |
| FR-003  | COMPLETE               | Existing server role policy plus new writes tested; scoped eligible-member lookup. Ownership endpoint denial/CSRF tests use mocked repositories.                                                             | P0 B01; staging verification                                          |
| FR-004  | PARTIAL                | Existing-user invite state/roles/activation and org rename integrated. Ownership endpoint/UI approved; disposable HTTP promotion/demotion and denial cases pass. New-user delivery/acceptance still missing. | P1 B03; channel decision 12–20h; new-user invitation channel required |
| FR-005  | COMPLETE               | Existing company CRUD/search now DB-paginated; real CRUD HTTP and browser create pass.                                                                                                                       | P1; no known scoped code gap                                          |
| FR-006  | COMPLETE               | Existing contact/company ownership validation and CRUD preserved, DB pages integrated; live relationship cases pass.                                                                                         | P1; no known scoped code gap                                          |
| FR-007  | COMPLETE               | Owner assignment, exact decimal transport, value/date/stage/status and CRUD integrated; real DB round trip and foreign/inactive recipient tests pass.                                                        | P1 B02/B06; staged journey                                            |
| FR-008  | COMPLETE               | Ordered configurable definitions/admin UI, explicit deal placement/moves, occupied/terminal guards and tenant roles tested. Legacy stages preserved.                                                         | P1 B08; no automatic migration of legacy deals                        |
| FR-009  | COMPLETE               | Existing activity lifecycle plus mounted notes CRUD, one-parent validation and contextual entry; real notes/role tests pass.                                                                                 | P1 B04; full keyboard/mobile release review P2                        |
| FR-010  | COMPLETE               | Task edit/complete/reopen, assignment, due dates/priorities and DB filters; live assignment/reminder/role tests pass.                                                                                        | P1 B06/B09; scheduler opt-in                                          |
| FR-011  | COMPLETE               | Existing authorized pipeline/task/activity summaries retained; confirmed writes refresh shell/report snapshots.                                                                                              | P2 B10; historical analytics not claimed                              |
| FR-012  | COMPLETE               | Allowlisted tenant-scoped DB search/filter/sort/pages; bounded query, archive and foreign-tenant tests.                                                                                                      | P1; pilot-load baseline P2                                            |
| FR-013  | COMPLETE               | Four supported CSV resources exposed through templates/preview/confirmed import/export; real multipart, atomicity, error/role/formula tests.                                                                 | P1 B05; documented file/row/export caps                               |
| FR-014  | COMPLETE               | Profile audit allowlist fixed; assignment/pipeline audited mutations use existing writer; profile audit DB test passes.                                                                                      | P0 B00; admin audit reader UI remains P2                              |
| FR-015  | COMPLETE               | In-app assignment/due/membership events; own reminder dedupe, read/unread/read-all and verified navigation.                                                                                                  | P1 B09; no email/realtime claim                                       |
| FR-016  | PARTIAL                | Authenticated endpoint delta/roles/security documented in delivery; exhaustive versioned catalog/drift gate absent.                                                                                          | P2 B16; 3–5h                                                          |
| FR-017  | COMPLETE               | Existing soft archive and active-only lookups preserved, new definitions archive safely; DB page/archive tests.                                                                                              | P2 B13 policy decisions remain                                        |
| FR-018  | PARTIAL                | Existing controlled diagnostics remain; deployed support/operations not established.                                                                                                                         | P0 B11; approved environment                                          |
| NFR-001 | PARTIAL                | Existing session/CSRF/least privilege retained; no production TLS/IAM/scanning evidence.                                                                                                                     | P0 B03/B11/B12; approval/access                                       |
| NFR-002 | COMPLETE               | New DB/HTTP tenant, role, parent and recipient tests plus existing security suites pass.                                                                                                                     | P0 B01; staged verification                                           |
| NFR-003 | UNVERIFIED             | Bounded DB pages implemented; no agreed pilot-load latency/throughput measurement.                                                                                                                           | P2 B10; target/load decision, 4–8h                                    |
| NFR-004 | UNVERIFIED             | No approved deployed AWS topology/availability outcome.                                                                                                                                                      | P0 B11; approved hosting                                              |
| NFR-005 | PARTIAL                | Existing health/log signals retained; production error tracking/alerts absent.                                                                                                                               | P0/P2 B11; runtime decisions                                          |
| NFR-006 | MISSING                | Backup automation and demonstrated restore remain absent.                                                                                                                                                    | P0 B14; approved RPO/RTO/retention/target, 6–10h                      |
| NFR-007 | PARTIAL                | FE lint/format/types pass, changed Java formatted, modular boundaries preserved; required human review/rules not verified.                                                                                   | P0 B12; owner review/settings                                         |
| NFR-008 | PARTIAL                | 360 backend + 255 frontend tests pass; 11 real HTTP scenarios run locally and added to CI. Manual browser bridge passes; automated CI browser gate incomplete.                                               | P0/P2 B01/B12; CI head validation and browser gate                    |
| NFR-009 | PARTIAL                | Native labelled controls, error states and responsive shared UI reused; full WCAG/keyboard/contrast/mobile acceptance outstanding.                                                                           | P2 B10; 4–8h review                                                   |
| NFR-010 | PARTIAL                | Minimal assignment member DTO and controlled CSV export; commercial retention/deletion policy absent.                                                                                                        | P2 B13; owner policy                                                  |
| NFR-011 | PARTIAL                | Modular monolith and additive DB evolution retained; multi-instance sessions/scheduler architecture unverified.                                                                                              | P2 B11; approved scaling design                                       |
| NFR-012 | PARTIAL                | Builds/wrapper/22 migrations and disposable CI configuration reproducible; AWS IaC/release/recovery absent.                                                                                                  | P0 B11/B14; approved topology                                         |

Additional obligations: SCOPE-01 saved views and SCOPE-03 profile/basic name settings are integrated; SCOPE-02 in-app due reminders are integrated with scheduler disabled by default. SCOPE-04/05/06 deployment/security/recovery remain unresolved. SCOPE-07 uses concrete tenant pipeline/task reminder persistence, without claiming queued import jobs. Existing SCOPE-08/09 vision/change-control limitations remain. No conceptual AI/voice/VR requirement is counted as completed CRM functionality.

## Historical Phase 1 requirement matrix

### FR-001 — Tenant isolation

> The system shall associate business data with an organization/tenant and prevent unauthorized cross-tenant access.

| Field                                      | Audit finding                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Original priority                          | Must                                                                                                    |
| Classification                             | **COMPLETE**                                                                                            |
| Required backend / existing subset         | Tenant ownership on all business entities; scoped queries/composite foreign keys.                       |
| Required frontend / existing subset        | Verified membership selection and scoped requests, stale-response rejection.                            |
| Implementation evidence / tests available  | E01; V10; TenantApiGateTest, CompanyAuthorizationIntegrationTest, UnifiedFrontendLiveTest.              |
| Missing functionality / evidence           | No known bypass in inspected paths; live browser/deployment acceptance remains.                         |
| Test result / real integration             | Unit/MVC security pass; current local PostgreSQL smoke blocked. Code integrated; deployment UNVERIFIED. |
| Security / tenancy                         | All API IDs must stay scoped, never trust browser header alone.                                         |
| Implementation priority / remaining effort | P0 · 4–6h release validation                                                                            |
| Proposed acceptance test                   | Two users/two tenants cannot list/read/mutate/link foreign IDs; revoked membership fails.               |
| Backlog / dependency                       | B01                                                                                                     |

### FR-002 — Authentication

> The system shall provide secure sign-in, sign-out, session management and account recovery.

| Field                                      | Audit finding                                                                                 |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Original priority                          | Must                                                                                          |
| Classification                             | **PARTIAL**                                                                                   |
| Required backend / existing subset         | Session sign-in/out, CSRF, BCrypt and disabled-account checks; add recovery.                  |
| Required frontend / existing subset        | Shared AuthSession and login/logout; recovery UI currently unavailable.                       |
| Implementation evidence / tests available  | E02; AuthenticationControllerTest; frontend auth/session tests.                               |
| Missing functionality / evidence           | No verified recovery channel/tokens or abuse controls.                                        |
| Test result / real integration             | Session/MVC tests pass; four real-HTTP scenarios skipped. Login integrated; recovery MISSING. |
| Security / tenancy                         | Generic recovery responses, hashed expiring single-use tokens; throttling.                    |
| Implementation priority / remaining effort | P0/P1 · 12–20h recovery after channel decision                                                |
| Proposed acceptance test                   | Login/logout/expiry work; token cannot be reused; revoked/disabled sessions lose access.      |
| Backlog / dependency                       | B01,B03                                                                                       |

### FR-003 — Authorization

> The system shall enforce server-side role/permission checks for protected actions.

| Field                                      | Audit finding                                                                           |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| Original priority                          | Must                                                                                    |
| Classification                             | **COMPLETE**                                                                            |
| Required backend / existing subset         | Persisted organization role policy on service entry points.                             |
| Required frontend / existing subset        | Route and mutation controls reuse actual roles.                                         |
| Implementation evidence / tests available  | E01; CrmAuthorizationTest, OrganizationRoleTest, routes.test.ts.                        |
| Missing functionality / evidence           | No platform-role bypass implemented; deployment checks outstanding.                     |
| Test result / real integration             | Unit/MVC authorization suites pass. Integrated for OWNER/ADMIN/SALES_USER/VIEWER.       |
| Security / tenancy                         | Admin cannot grant ADMIN/OWNER; owner protections persist.                              |
| Implementation priority / remaining effort | P0 · 2–4h expanded release test                                                         |
| Proposed acceptance test                   | VIEWER mutation 403; SALES_USER administration 403; cross-tenant owner action rejected. |
| Backlog / dependency                       | B01                                                                                     |

### FR-004 — Users

> Authorized admins shall invite, activate/deactivate and manage organization users.

| Field                                      | Audit finding                                                                                                                     |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Original priority                          | Must                                                                                                                              |
| Classification                             | **PARTIAL**                                                                                                                       |
| Required backend / existing subset         | Existing-user membership INVITED/ACTIVE/SUSPENDED/REVOKED and constrained roles.                                                  |
| Required frontend / existing subset        | Administration form/list/status/roles; existing UUID required.                                                                    |
| Implementation evidence / tests available  | E03; OrganizationMembershipServiceTest, OrganizationAdministrationControllerTest, platform/api.test.ts.                           |
| Missing functionality / evidence           | No discoverable user directory, new-user invitation delivery/acceptance or account provisioning HTTP.                             |
| Test result / real integration             | Mocked persistence tests pass; live onboarding absent. Existing-user administration integrated; usable invite onboarding MISSING. |
| Security / tenancy                         | No arbitrary global user directory; prevent last-owner loss and unauthorized grants.                                              |
| Implementation priority / remaining effort | P1 · 12–20h                                                                                                                       |
| Proposed acceptance test                   | Admin invites by email via approved channel; recipient accepts securely once; foreign tenant access denied.                       |
| Backlog / dependency                       | B03                                                                                                                               |

### FR-005 — Companies

> Users shall create, view, update, archive and search company/account records.

| Field                                      | Audit finding                                                                                 |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Original priority                          | Must                                                                                          |
| Classification                             | **COMPLETE**                                                                                  |
| Required backend / existing subset         | Company create/read/update/archive/search with DTO validation.                                |
| Required frontend / existing subset        | Mounted CrmContent forms/list/detail/search.                                                  |
| Implementation evidence / tests available  | E04; CompanyControllerTest, CompanyServiceTest; umer/api.test.ts.                             |
| Missing functionality / evidence           | Live release acceptance; unpaged list scalability tracked separately.                         |
| Test result / real integration             | Unit/MVC plus frontend fixtures pass. Production code integrated; live acceptance UNVERIFIED. |
| Security / tenancy                         | Tenant-scoped archive/read/search; VIEWER write denied.                                       |
| Implementation priority / remaining effort | P0/P2 · 2–3h acceptance                                                                       |
| Proposed acceptance test                   | Create→search→edit→archive disposable company; foreign lookup fails.                          |
| Backlog / dependency                       | B01                                                                                           |

### FR-006 — Contacts

> Users shall create, view, update, archive and associate contacts with companies.

| Field                                      | Audit finding                                                                                |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Original priority                          | Must                                                                                         |
| Classification                             | **COMPLETE**                                                                                 |
| Required backend / existing subset         | Contact CRUD/archive with active tenant company reference.                                   |
| Required frontend / existing subset        | Mounted contacts UI with required company association.                                       |
| Implementation evidence / tests available  | E04; ContactServiceTest, ContactControllerTest; forms.test.ts.                               |
| Missing functionality / evidence           | Release acceptance and relationship-label usability.                                         |
| Test result / real integration             | Unit/MVC and form tests pass. Integrated; deployed acceptance UNVERIFIED.                    |
| Security / tenancy                         | Contact/company must share tenant; archived parents rejected.                                |
| Implementation priority / remaining effort | P0/P2 · 2–3h acceptance                                                                      |
| Proposed acceptance test                   | Create contact on own company; foreign/archived company rejected; archive removed from list. |
| Backlog / dependency                       | B01                                                                                          |

### FR-007 — Opportunities

> Users shall create and manage opportunities including owner, value, stage, expected close date and status.

| Field                                      | Audit finding                                                                                                              |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Original priority                          | Must                                                                                                                       |
| Classification                             | **PARTIAL**                                                                                                                |
| Required backend / existing subset         | Value/currency/expected-close/stage CRUD exists; add owner model.                                                          |
| Required frontend / existing subset        | Opportunity CRUD exists; decimal-safe form writes and owner selector missing.                                              |
| Implementation evidence / tests available  | E04,E05; OpportunityServiceTest, OpportunityControllerTest; umer/forms.ts.                                                 |
| Missing functionality / evidence           | No owner field; no separate status beyond terminal stages; core form converts amounts to Number.                           |
| Test result / real integration             | Transition/DTO tests pass; precision round-trip missing. Integrated subset; ownership MISSING.                             |
| Security / tenancy                         | Validate active same-tenant owner; retain exact decimal value.                                                             |
| Implementation priority / remaining effort | P0/P1 · 3–5h precision; 8–12h ownership                                                                                    |
| Proposed acceptance test                   | Exact decimal round-trip survives unrelated edit; owner cannot reference foreign/inactive member; status mapping approved. |
| Backlog / dependency                       | B02,B06                                                                                                                    |

### FR-008 — Pipelines

> Admins shall configure pipelines and ordered stages; users shall move opportunities between stages.

| Field                                      | Audit finding                                                                                                    |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Original priority                          | Must                                                                                                             |
| Classification                             | **PARTIAL**                                                                                                      |
| Required backend / existing subset         | Fixed enum aggregation and transitions; need tenant pipelines/ordered stages.                                    |
| Required frontend / existing subset        | Fixed pipeline display and stage move; no admin configuration UI.                                                |
| Implementation evidence / tests available  | E05; PipelineServiceTest, OpportunityStage, PipelinePage.tsx.                                                    |
| Missing functionality / evidence           | No persisted Pipeline/PipelineStage, multiple pipelines, stage ordering/configuration.                           |
| Test result / real integration             | Fixed-stage tests pass. Fixed flow integrated; configurable pipelines MISSING.                                   |
| Security / tenancy                         | Admin-only configuration; migrations preserve existing deals and tenant boundaries.                              |
| Implementation priority / remaining effort | P1 · 18–28h                                                                                                      |
| Proposed acceptance test                   | Admin creates/reorders own stages; sales moves deal; foreign config denied; existing deals migrate without loss. |
| Backlog / dependency                       | B08                                                                                                              |

### FR-009 — Activities

> Users shall log calls, meetings, interactions and notes against relevant CRM records.

| Field                                      | Audit finding                                                                                                              |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Original priority                          | Must                                                                                                                       |
| Classification                             | **PARTIAL**                                                                                                                |
| Required backend / existing subset         | Activity CALL/EMAIL/MEETING/NOTE plus separate Note CRUD exist.                                                            |
| Required frontend / existing subset        | Activity logging integrated; separate rich note lifecycle absent.                                                          |
| Implementation evidence / tests available  | E06,E07; ActivityServiceTest, NoteServiceTest; workflows.test.tsx.                                                         |
| Missing functionality / evidence           | Standalone notes UI and parent-record discovery not mounted.                                                               |
| Test result / real integration             | Activity/note unit/MVC pass; workflow browser fixtures historical. Activity NOTE supported; separate notes not integrated. |
| Security / tenancy                         | Notes require exactly one own active parent; activities require at least one.                                              |
| Implementation priority / remaining effort | P1 · 3–5h notes UI                                                                                                         |
| Proposed acceptance test                   | Log each activity type; create/edit/archive dedicated note against own parent; foreign parent rejected.                    |
| Backlog / dependency                       | B04                                                                                                                        |

### FR-010 — Tasks

> Users shall create, assign, complete and track due-dated follow-up tasks.

| Field                                      | Audit finding                                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Original priority                          | Must                                                                                                         |
| Classification                             | **PARTIAL**                                                                                                  |
| Required backend / existing subset         | Task lifecycle/priority/due tracking exists; no assignee.                                                    |
| Required frontend / existing subset        | Task CRUD/status/due/search/views integrated; assignment unavailable.                                        |
| Implementation evidence / tests available  | E06; TaskServiceTest (28), TaskControllerTest; workflows.test.tsx.                                           |
| Missing functionality / evidence           | Task assignment; reminders additionally required in SRS §5.1.                                                |
| Test result / real integration             | Unit/MVC/frontend tests pass; task-assignment tests absent. Supported subset integrated; assignment MISSING. |
| Security / tenancy                         | Assignee must be active organization member; revoke/suspend policy needed.                                   |
| Implementation priority / remaining effort | P1 · 6–10h assignment                                                                                        |
| Proposed acceptance test                   | Assign/reassign task; foreign/inactive user rejected; complete/reopen and due tracking retained.             |
| Backlog / dependency                       | B06                                                                                                          |

### FR-011 — Dashboard

> The system shall show authorized users useful pipeline, task and activity summaries.

| Field                                      | Audit finding                                                                                                    |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Original priority                          | Must                                                                                                             |
| Classification                             | **COMPLETE**                                                                                                     |
| Required backend / existing subset         | Tenant pipeline aggregate and authorized task/activity data.                                                     |
| Required frontend / existing subset        | Executive dashboard with current summaries and per-source failures.                                              |
| Implementation evidence / tests available  | E08; PipelineServiceTest; intelligence.test.tsx.                                                                 |
| Missing functionality / evidence           | No historical analytics; not required by this wording; pilot usefulness validation pending.                      |
| Test result / real integration             | Exact decimal/mixed-currency/source-error tests pass. Integrated current-state summaries; deployment UNVERIFIED. |
| Security / tenancy                         | Never interpret failure as zero; no cross-currency revenue aggregation.                                          |
| Implementation priority / remaining effort | P2 · 2–4h acceptance                                                                                             |
| Proposed acceptance test                   | Dashboard reconciles own fixture collections/aggregate, preserves currencies, labels missing data.               |
| Backlog / dependency                       | B01,B10                                                                                                          |

### FR-012 — Search/filter

> Users shall search and filter core CRM entities within their authorized tenant.

| Field                                      | Audit finding                                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Original priority                          | Must                                                                                             |
| Classification                             | **COMPLETE**                                                                                     |
| Required backend / existing subset         | Tenant-scoped search/filter and sort allowlists.                                                 |
| Required frontend / existing subset        | Core CRM and workflow filters are server driven.                                                 |
| Implementation evidence / tests available  | E04,E06; SearchTextTest, ListSortTest; forms/workflows tests.                                    |
| Missing functionality / evidence           | Saved views are separately required by §5.1 and not integrated.                                  |
| Test result / real integration             | Search/filter allowlist tests pass. Integrated; lists locally paginated.                         |
| Security / tenancy                         | Validate filter fields/UUIDs; no tenant parameter from saved input.                              |
| Implementation priority / remaining effort | P2 · 2–4h acceptance                                                                             |
| Proposed acceptance test                   | Search/filter results contain only matching own records; invalid sort/filter returns safe error. |
| Backlog / dependency                       | B01,B05                                                                                          |

### FR-013 — Import/export

> Authorized users shall import supported CSV data and export permitted business data.

| Field                                      | Audit finding                                                                                                    |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Original priority                          | Should                                                                                                           |
| Classification                             | **PARTIAL**                                                                                                      |
| Required backend / existing subset         | CSV preview/import/export for four CRM resources; bounded, audited, all-or-nothing.                              |
| Required frontend / existing subset        | No unified import/export screen; reporting CSV is a different feature.                                           |
| Implementation evidence / tests available  | E09; CsvImportParserTest, DataTransferServiceTest, DataTransferAuthorizationIntegrationTest.                     |
| Missing functionality / evidence           | UI templates/upload/preview/error display/confirmation/download; import idempotency; export 1000 cap disclosure. |
| Test result / real integration             | Backend parser/service/security pass; no frontend integration tests. Backend HTTP exists; frontend MISSING.      |
| Security / tenancy                         | Imports OWNER/ADMIN only; export view roles; prevent formulas and cross-tenant references.                       |
| Implementation priority / remaining effort | P1/P2 · 5–8h UI; 4–8h idempotency later                                                                          |
| Proposed acceptance test                   | Bad CSV writes nothing; valid preview/confirm creates own rows; export cap and formula escaping visible.         |
| Backlog / dependency                       | B05                                                                                                              |

### FR-014 — Audit trail

> The system shall record defined security- and business-relevant events with actor, time and target information.

| Field                                      | Audit finding                                                                                                               |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Original priority                          | Must                                                                                                                        |
| Classification                             | **PARTIAL**                                                                                                                 |
| Required backend / existing subset         | Actor/time/target audit, transaction coupling and admin query exists.                                                       |
| Required frontend / existing subset        | No audit-history screen.                                                                                                    |
| Implementation evidence / tests available  | E10; AuditEventWriterTest, AuditMutationAspectTest, AuditEventAuthorizationIntegrationTest.                                 |
| Missing functionality / evidence           | USER_PROFILE_UPDATED absent from final SQL event allowlist; profile transaction expected to roll back.                      |
| Test result / real integration             | Mock tests pass; migration/profile persistence test missing. Most audit paths implemented; profile audit mismatch BLOCKING. |
| Security / tenancy                         | Never bypass audit to make profile save work; protect actor and retention access.                                           |
| Implementation priority / remaining effort | P0/P2 · 2–4h defect; 3–5h audit UI                                                                                          |
| Proposed acceptance test                   | Migrated PostgreSQL accepts profile event once; profile save/audit commit together; VIEWER audit denied.                    |
| Backlog / dependency                       | B00,B07                                                                                                                     |

### FR-015 — Notifications

> The system shall deliver in-app and/or email notifications for selected workflow events.

| Field                                      | Audit finding                                                                                                                       |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Original priority                          | Should                                                                                                                              |
| Classification                             | **PARTIAL**                                                                                                                         |
| Required backend / existing subset         | In-app notifications on membership activation/role changes; recipient scoping/dedupe/read APIs.                                     |
| Required frontend / existing subset        | Notification list/count/read/all-read/verified permitted target.                                                                    |
| Implementation evidence / tests available  | E11; NotificationServiceTest, NotificationAuthorizationIntegrationTest; workflows.test.tsx.                                         |
| Missing functionality / evidence           | No task/opportunity events, reminders or email; selected workflow event set not product-approved.                                   |
| Test result / real integration             | Recipient/role/read tests pass; UI fixtures pass historically. Membership events integrated; broader CRM event coverage incomplete. |
| Security / tenancy                         | Recipients derived server-side; no client-generated business events.                                                                |
| Implementation priority / remaining effort | P1/P2 · 6–10h reminders/events after ownership                                                                                      |
| Proposed acceptance test                   | Approved event yields one recipient-scoped notification; retry/restart does not duplicate; no foreign reads.                        |
| Backlog / dependency                       | B06,B09                                                                                                                             |

### FR-016 — API

> Core domain operations shall be exposed through a documented, authenticated application API.

| Field                                      | Audit finding                                                                                                    |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Original priority                          | Must                                                                                                             |
| Classification                             | **PARTIAL**                                                                                                      |
| Required backend / existing subset         | Authenticated controllers/DTOs/domain methods for core modules.                                                  |
| Required frontend / existing subset        | Typed handwritten adapters consume contracts.                                                                    |
| Implementation evidence / tests available  | E12; controller suites; CONTRACTS.md and feature adapters.                                                       |
| Missing functionality / evidence           | No exhaustive versioned API specification/OpenAPI/contract drift gate.                                           |
| Test result / real integration             | Controller tests pass; no generated-schema conformance. Authenticated API implemented; documentation incomplete. |
| Security / tenancy                         | Document CSRF, tenant header, pagination, error/status and role matrix.                                          |
| Implementation priority / remaining effort | P2 · 3–5h                                                                                                        |
| Proposed acceptance test                   | Endpoint catalog matches controllers and examples; unauthorized/error response examples validated.               |
| Backlog / dependency                       | B10                                                                                                              |

### FR-017 — Soft deletion/archive

> Business records shall use an appropriate archive/soft-delete strategy where recovery/audit requirements apply.

| Field                                      | Audit finding                                                                                                   |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Original priority                          | Should                                                                                                          |
| Classification                             | **COMPLETE**                                                                                                    |
| Required backend / existing subset         | Archived flags/active-only queries on CRM, task/activity/note/saved-view entities.                              |
| Required frontend / existing subset        | Archive controls for mounted CRM/workflows.                                                                     |
| Implementation evidence / tests available  | E04,E06,E07; domain archive tests and workflow CRUD tests.                                                      |
| Missing functionality / evidence           | No public restore UX/API; explicit retention/recovery policy still unresolved, not silently claimed.            |
| Test result / real integration             | Archive tests pass. Implemented appropriate soft deletion; policy PARTIAL.                                      |
| Security / tenancy                         | Archived parents cannot be newly linked; audit must retain history.                                             |
| Implementation priority / remaining effort | P2 · 3–5h retention policy                                                                                      |
| Proposed acceptance test                   | Archived rows vanish from active queries and persist for authorized audit; retention/restore policy documented. |
| Backlog / dependency                       | B13                                                                                                             |

### FR-018 — Admin support

> Platform operations shall provide controlled diagnostic/support capabilities without bypassing tenant security silently.

| Field                                      | Audit finding                                                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Original priority                          | Must                                                                                                                            |
| Classification                             | **PARTIAL**                                                                                                                     |
| Required backend / existing subset         | Minimal probes, organization-admin diagnostics, restricted actuator and optional JWT monitoring.                                |
| Required frontend / existing subset        | No operations console; operational procedures partial.                                                                          |
| Implementation evidence / tests available  | E13; OperationalAuthorizationIntegrationTest, MonitoringAuthorizationIntegrationTest.                                           |
| Missing functionality / evidence           | Platform support identity/audited cross-tenant access deliberately absent; deployed network controls unverified.                |
| Test result / real integration             | Health/security tests pass; hosted PostgreSQL startup successful. Diagnostics implemented; deployment/support model incomplete. |
| Security / tenancy                         | Keep monitoring private; no silent platform bypass or support impersonation.                                                    |
| Implementation priority / remaining effort | P0/P2 · 6–12h deployment/operations                                                                                             |
| Proposed acceptance test                   | Public probe leaks no details; unauthorized metrics denied; approved monitoring identity/private route works.                   |
| Backlog / dependency                       | B11                                                                                                                             |

### NFR-001 — Security

> Use secure-by-default authentication, least privilege, encrypted transport, protected secrets and dependency/security scanning.

| Field                                      | Audit finding                                                                                                         |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Original priority                          | No per-row priority in SRS                                                                                            |
| Classification                             | **PARTIAL**                                                                                                           |
| Required backend / existing subset         | CSRF/session/least privilege/validation implemented; secure deployment and scanning missing.                          |
| Required frontend / existing subset        | No stored credentials; cookie transport/error guards.                                                                 |
| Implementation evidence / tests available  | E01,E02,E13; SecurityConfiguration; application.yml; CI YAML.                                                         |
| Missing functionality / evidence           | Secure cookie defaults false for local use; no scanning workflow/rate limiting or verified deployed TLS/secrets.      |
| Test result / real integration             | Security tests pass; security scanners not configured. Application controls present; production hardening UNVERIFIED. |
| Security / tenancy                         | Enforce Secure over HTTPS; protect secrets; close internet monitoring surfaces.                                       |
| Implementation priority / remaining effort | P0 · 4–8h                                                                                                             |
| Proposed acceptance test                   | TLS cookies/CSRF/headers and abuse controls verified; dependency/secret scan produces actionable report.              |
| Backlog / dependency                       | B03,B11,B12                                                                                                           |

### NFR-002 — Tenant security

> Tenant boundaries shall be enforced in backend/data access paths and covered by automated tests.

| Field                                      | Audit finding                                                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Original priority                          | No per-row priority in SRS                                                                                                     |
| Classification                             | **COMPLETE**                                                                                                                   |
| Required backend / existing subset         | Service checks + organization repository predicates + composite FKs.                                                           |
| Required frontend / existing subset        | Verified membership context and aborted stale scopes.                                                                          |
| Implementation evidence / tests available  | E01; tenant/security suites; V10.                                                                                              |
| Missing functionality / evidence           | Latest real-database smoke blocked locally; deployed checks pending.                                                           |
| Test result / real integration             | Tenant automated tests pass; CI fresh-db migration succeeds. Implemented/tested in standard suite; real HTTP subset not rerun. |
| Security / tenancy                         | No platform bypass; global identity accessible only via approved principal/admin paths.                                        |
| Implementation priority / remaining effort | P0 · 4–6h acceptance                                                                                                           |
| Proposed acceptance test                   | Two-tenant adversarial matrix passes at HTTP and DB relationship layers.                                                       |
| Backlog / dependency                       | B01                                                                                                                            |

### NFR-003 — Performance

> Common interactive operations should normally respond within an agreed product target under expected pilot load; baselines will be measured before external launch.

| Field                                      | Audit finding                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Original priority                          | No per-row priority in SRS                                                                 |
| Classification                             | **UNVERIFIED**                                                                             |
| Required backend / existing subset         | Unpaged queries/in-memory sort; no agreed measured pilot SLO.                              |
| Required frontend / existing subset        | Full collection downloads; repeated overview and feature loads.                            |
| Implementation evidence / tests available  | E04,E08; CompanyService.listActive; ProductionApplication/loadSnapshot.                    |
| Missing functionality / evidence           | No approved p95/error/load target or performance baseline.                                 |
| Test result / real integration             | No load/performance suite located. Functional checks exist; performance acceptance absent. |
| Security / tenancy                         | Load only synthetic own-tenant fixtures, not production customer data.                     |
| Implementation priority / remaining effort | P2 · 4–8h baseline; 8–14h paging                                                           |
| Proposed acceptance test                   | Agree load/data size target; measure p50/p95/errors; bound API/pages/query count.          |
| Backlog / dependency                       | B10                                                                                        |

### NFR-004 — Availability

> Production architecture shall eliminate avoidable single points of failure appropriate to the selected AWS services and product stage.

| Field                                      | Audit finding                                                                                            |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Original priority                          | No per-row priority in SRS                                                                               |
| Classification                             | **UNVERIFIED**                                                                                           |
| Required backend / existing subset         | Single JVM local sessions; AWS runtime not selected.                                                     |
| Required frontend / existing subset        | Static hosting/reverse-proxy deployment absent.                                                          |
| Implementation evidence / tests available  | E02 ADR-002; E13 compose/CI.                                                                             |
| Missing functionality / evidence           | No deployed HA topology, failure tests or availability targets.                                          |
| Test result / real integration             | Startup/health only, no failover suite. Local architecture exists; production resilience unknown.        |
| Security / tenancy                         | Shared session/revocation design needed before multi-instance scale.                                     |
| Implementation priority / remaining effort | P0/P2 · 6–12h design; deployment depends on AWS                                                          |
| Proposed acceptance test                   | Document accepted alpha SPOFs; exercise restart/recovery; production topology meets agreed availability. |
| Backlog / dependency                       | B11                                                                                                      |

### NFR-005 — Observability

> Production shall provide structured logs, error tracking, metrics/health signals and actionable alerts.

| Field                                      | Audit finding                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Original priority                          | No per-row priority in SRS                                                                 |
| Classification                             | **PARTIAL**                                                                                |
| Required backend / existing subset         | Correlation logs, metrics, readiness, monitoring JWT gates.                                |
| Required frontend / existing subset        | Safe source errors and retry; no error-tracking service.                                   |
| Implementation evidence / tests available  | E13; CorrelationIdFilter; OperationalMetricsConfigurationTest.                             |
| Missing functionality / evidence           | Structured production log shipping, alerting, error tracking and retention not configured. |
| Test result / real integration             | Health/metrics/security tests pass. Signals implemented; deployed alerts UNVERIFIED.       |
| Security / tenancy                         | Redact secrets/PII; private metrics and scoped diagnosis.                                  |
| Implementation priority / remaining effort | P0/P2 · 4–8h                                                                               |
| Proposed acceptance test                   | Failure triggers actionable alert with correlation ID; no PII/credentials in logs.         |
| Backlog / dependency                       | B11                                                                                        |

### NFR-006 — Recoverability

> Automated backups and a tested restoration procedure shall exist; RPO/RTO targets will be finalized during architecture.

| Field                                      | Audit finding                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------- |
| Original priority                          | No per-row priority in SRS                                                      |
| Classification                             | **MISSING**                                                                     |
| Required backend / existing subset         | Define backup scheduling, encrypted storage, restore and RPO/RTO.               |
| Required frontend / existing subset        | Document operational status only; no customer restore bypass.                   |
| Implementation evidence / tests available  | E13 operations doc explicitly lists remaining backup work.                      |
| Missing functionality / evidence           | No backup automation/restore runbook or demonstrated recovery.                  |
| Test result / real integration             | No restore test located. Deployment blocker for external pilot.                 |
| Security / tenancy                         | Use disposable restore target, never overwrite active customer DB.              |
| Implementation priority / remaining effort | P0 · 6–10h after environment access                                             |
| Proposed acceptance test                   | Restore isolated backup, verify schema/counts/integrity; meet approved RPO/RTO. |
| Backlog / dependency                       | B11,B14                                                                         |

### NFR-007 — Maintainability

> Code shall follow documented conventions, automated formatting/linting, modular boundaries and review requirements.

| Field                                      | Audit finding                                                                                                              |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Original priority                          | No per-row priority in SRS                                                                                                 |
| Classification                             | **PARTIAL**                                                                                                                |
| Required backend / existing subset         | Modular monolith/ADRs/tests/review guidance; no Java formatter/static lint gate.                                           |
| Required frontend / existing subset        | TS strict/ESLint/Prettier/workspace contracts.                                                                             |
| Implementation evidence / tests available  | E14; pom, frontend package, CI, architecture docs.                                                                         |
| Missing functionality / evidence           | Stale ADR/status docs; backend format/static convention gate incomplete.                                                   |
| Test result / real integration             | Frontend lint/format/type checks pass; compiler emits warnings. Conventions partially enforced; PR reviews organizational. |
| Security / tenancy                         | No new architecture/library choice without owner approval.                                                                 |
| Implementation priority / remaining effort | P2 · 2–4h docs; 2–4h Java gate                                                                                             |
| Proposed acceptance test                   | Current docs accurately match source; chosen Java gate runs consistently in CI.                                            |
| Backlog / dependency                       | B10,B12                                                                                                                    |

### NFR-008 — Testability

> Critical domain logic, authorization and tenant isolation shall have automated tests; release gates shall run in CI.

| Field                                      | Audit finding                                                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Original priority                          | No per-row priority in SRS                                                                                         |
| Classification                             | **PARTIAL**                                                                                                        |
| Required backend / existing subset         | 356 standard passing tests; four opt-in real HTTP tests skipped; CI build/migration smoke.                         |
| Required frontend / existing subset        | 226 passing tests; browser smoke runners not in CI.                                                                |
| Implementation evidence / tests available  | E14; CI; UnifiedFrontendLiveTest; browser runners.                                                                 |
| Missing functionality / evidence           | Database profile regression, mounted UI/real backend smoke and browser CI absent.                                  |
| Test result / real integration             | Actual rerun counts recorded in implementation-status. Strong unit/MVC gates; end-to-end release gates incomplete. |
| Security / tenancy                         | Fixtures must not provision/change real accounts.                                                                  |
| Implementation priority / remaining effort | P0 · 4–8h integration/browser gate                                                                                 |
| Proposed acceptance test                   | CI runs two-tenant real HTTP and mounted UI core journey against disposable DB.                                    |
| Backlog / dependency                       | B00,B01                                                                                                            |

### NFR-009 — Accessibility

> The web UI shall follow practical WCAG 2.2 AA-oriented design and testing for core workflows.

| Field                                      | Audit finding                                                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Original priority                          | No per-row priority in SRS                                                                                                |
| Classification                             | **PARTIAL**                                                                                                               |
| Required backend / existing subset         | Validation errors support accessible frontend; no specific backend feature.                                               |
| Required frontend / existing subset        | Labels, skip links, native confirmations/themes/responsiveness.                                                           |
| Implementation evidence / tests available  | E15; Dialog/Confirmation/RecordForm and shell controls.                                                                   |
| Missing functionality / evidence           | No comprehensive WCAG 2.2 AA audit; browser Back/tenant switch unsaved loss; platform dialog focus needs verification.    |
| Test result / real integration             | SSR/accessibility assertions present; no automated axe gate found. Practical features present; AA conformance UNVERIFIED. |
| Security / tenancy                         | Keyboard role denial/navigation must not expose hidden data.                                                              |
| Implementation priority / remaining effort | P2 · 4–8h                                                                                                                 |
| Proposed acceptance test                   | Keyboard-only CRUD/confirm/Escape focus flow; contrast, zoom, labels and screen-reader errors checked.                    |
| Backlog / dependency                       | B10                                                                                                                       |

### NFR-010 — Privacy

> Collect only required customer data and support controlled export/deletion/retention processes as commercial requirements mature.

| Field                                      | Audit finding                                                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Original priority                          | No per-row priority in SRS                                                                                                      |
| Classification                             | **PARTIAL**                                                                                                                     |
| Required backend / existing subset         | Limited DTO data, tenant export/archive/audit metadata allowlist.                                                               |
| Required frontend / existing subset        | No raw secrets; authorized report exports.                                                                                      |
| Implementation evidence / tests available  | E09,E10; DTOs and V17 safe metadata.                                                                                            |
| Missing functionality / evidence           | Retention, hard erasure/legal hold, privacy process/data classification not approved.                                           |
| Test result / real integration             | Metadata/export safety tests pass; no retention/erasure acceptance. Privacy primitives present; operational process incomplete. |
| Security / tenancy                         | Avoid deleting audit/customer data without approved retention policy.                                                           |
| Implementation priority / remaining effort | P2 · 4–8h policy/design                                                                                                         |
| Proposed acceptance test                   | Inventory PII and lawful scope; approved tenant export/deletion/retention tests.                                                |
| Backlog / dependency                       | B13                                                                                                                             |

### NFR-011 — Scalability

> The architecture shall allow horizontal/application scaling and database evolution without redesigning the product from scratch.

| Field                                      | Audit finding                                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Original priority                          | No per-row priority in SRS                                                                       |
| Classification                             | **PARTIAL**                                                                                      |
| Required backend / existing subset         | Modular DB/Flyway but local JVM sessions and unpaged endpoints.                                  |
| Required frontend / existing subset        | Lazy features and scoped caching; no bounded collection pagination.                              |
| Implementation evidence / tests available  | E02,E04,E08; ADR-002; repositories/services.                                                     |
| Missing functionality / evidence           | Shared sessions, DB query/page limits and migration/rolling-release strategy missing.            |
| Test result / real integration             | No scale/rolling-deploy tests located. Architecture extensible; horizontal readiness UNVERIFIED. |
| Security / tenancy                         | Session revocation consistent across instances, tenant paging isolated.                          |
| Implementation priority / remaining effort | P2 · 8–14h paging; 6–12h scale design                                                            |
| Proposed acceptance test                   | Bounded paged queries; two-instance session isolation/revocation tested before enabling scale.   |
| Backlog / dependency                       | B10,B11                                                                                          |

### NFR-012 — Portability

> Infrastructure and configuration shall be reproducible through version-controlled infrastructure/configuration practices.

| Field                                      | Audit finding                                                                                                                 |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Original priority                          | No per-row priority in SRS                                                                                                    |
| Classification                             | **PARTIAL**                                                                                                                   |
| Required backend / existing subset         | Wrapper, env configuration, Flyway and local PostgreSQL Compose.                                                              |
| Required frontend / existing subset        | Pinned Node/npm/lockfile and Vite builds.                                                                                     |
| Implementation evidence / tests available  | E14; Docker Compose/CI/wrappers/config.                                                                                       |
| Missing functionality / evidence           | No application Dockerfile/AWS IaC/deployment pipelines or reproducible staging topology found.                                |
| Test result / real integration             | Four app builds and backend jar pass; no infrastructure tests. Local reproducibility verified; cloud reproducibility MISSING. |
| Security / tenancy                         | Environment-separated secret delivery; migrations reviewed with recovery plan.                                                |
| Implementation priority / remaining effort | P0/P2 · 8–16h approved deployment stack                                                                                       |
| Proposed acceptance test                   | Fresh approved environment provisioned from versioned config; build SHA and rollback procedure recorded.                      |
| Backlog / dependency                       | B11,B14                                                                                                                       |

## Additional obligations outside identified rows

The following are **traceability labels introduced by this audit**, not original SRS IDs. They prevent non-table scope from being lost. Sections 7–8 remain verbatim above; scope/change-control approval remains with the owner.

| Audit label / source     | Scope and status                                                                                                                             | Remaining acceptance / dependency                                                                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SCOPE-01 · §5.1, §3.2    | Basic saved views: backend CRUD/versioned configuration exists; no mounted UI. PARTIAL.                                                      | B05/B15: save/apply/edit/archive own tenant view; VIEWER cannot write; filters are allowlisted.                                                                           |
| SCOPE-02 · §5.1          | Reminders/follow-up dates: due dates exist, reminder scheduling/delivery absent. PARTIAL.                                                    | B09 after B06 and approved scheduler/channel: due reminder delivered once; complete/reassign/revoke suppresses invalid recipients.                                        |
| SCOPE-03 · §5.1, §6      | User profile/basic organization settings: name edits and profile form exist; profile audit mismatch. PARTIAL.                                | B00: profile plus audit persist; admin organization rename scoped; non-admin denied.                                                                                      |
| SCOPE-04 · §3.1, §12     | AWS staging/production, controlled versioned promotion, protected main/review policy. UNVERIFIED/MISSING in repository deployment artifacts. | B11/B12/B14: owner-approved environment, access and branch controls; deployed exact SHAs; API errors never served SPA HTML.                                               |
| SCOPE-05 · §13           | TLS, least-privilege IAM, encrypted stores, scanning, endpoint abuse protection, threat review. PARTIAL.                                     | B03/B11/B12: explicit threat/abuse matrix and deployment evidence. Existing application auth is not proof of IAM/TLS.                                                     |
| SCOPE-06 · §14, §16      | Classification, retention, backup/recovery, migration recovery and external-pilot gate. MISSING/PARTIAL.                                     | B13/B14: approved targets and successful disposable restore. No external pilot before restore and isolation acceptance.                                                   |
| SCOPE-07 · §9            | Task/Reminder, Pipeline/Stage and Import/Export Job are initial conceptual entities, with detailed design deferred.                          | Persisted configurable pipelines/reminders missing; synchronous CSV exists without job table. Do not infer asynchronous jobs are mandatory merely from the entity sketch. |
| SCOPE-08 · §11, §16, §20 | Tracked story/acceptance, human review and versioned scope decisions, staging validation. PARTIAL.                                           | Every B item needs accepted test/review, migrations/rollback where applicable. Planning this work does not approve security-sensitive implementation.                     |
| SCOPE-09 · §3.2, §15     | User feedback and internal Alpha/Beta/external-pilot progression. UNVERIFIED.                                                                | B01/B10: execute approved real lead-to-customer journeys with fixtures then record internal pilot feedback; no invented business conversion automation.                   |

## Deferred SRS scope and terminology

§5.2 explicitly defers advanced marketing/campaigns, full support ticketing, native mobile, complex ERP/accounting, marketplace/catalog integrations, advanced agents/enrichment/autonomous outreach, enterprise SSO and complex custom-object/compliance features unless pilots require them. These are not missing Release 1 FRs. Lead CRUD exists as supporting scope even though FR-007 is titled Opportunities; no lead-conversion acceptance step is specified in the table. Map terminal opportunity stages to status only with documented product agreement. The actual accepted ADR role is SALES_USER; do not introduce MEMBER aliases or privileged cross-tenant roles by inference.
