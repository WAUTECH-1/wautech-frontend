Current integration behavior supersedes this historical foundation handoff. See [engineering record](../../docs/unified-integration.md).

# Integration handoffs and confirmed contracts

Inspected frontend origin/main `3c1177f1c49d32224fc87cac67645726990dfd3b` (all three Sprint 1 implementations merged) and backend main `74467a4e68b480387ca1ff16516feca4afb1d095`; the latter matches the remote reference queried on 2026-10-12. Backend was inspected read-only at `D:/Development/wautech-crm/backend/src/main/java/com/wautech/crm/`.

## Authentication and tenancy

Sources: `identity/controller/AuthenticationController.java`, `identity/service/AuthenticationService.java`, `identity/dto/{LoginRequest,AuthenticatedUserResponse,CsrfTokenResponse}.java`, `platform/security/{SecurityConfiguration,ActiveOrganizationContextFilter,CrmAuthorization}.java`, `organization/entity/OrganizationRole.java` and organization module file inventory.

| Method | Endpoint           | Confirmed behavior                                         |
| ------ | ------------------ | ---------------------------------------------------------- |
| GET    | `/api/auth/csrf`   | headerName/parameterName/token; header is X-CSRF-TOKEN     |
| POST   | `/api/auth/login`  | email/password JSON; CSRF required; creates Spring session |
| GET    | `/api/auth/me`     | verified session profile: id/email/firstName/lastName only |
| POST   | `/api/auth/logout` | CSRF required; invalidates session; 204                    |

Login email max 254, nonblank email; password nonblank, DTO max 256, service bcrypt limit 72 UTF-8 bytes. Reused validation handles these rules. Login fixes session ID; HTTP Basic is disabled and no bearer convention exists. Wajahat's API client validates profiles, rejects redirects, uses cookies/no-store, fetches fresh CSRF before login/logout, and verifies `/me` after login. His session store prevents obsolete restore responses from restoring a logged-out profile. apps/web delegates to these implementations.

Every non-auth CRM request must send X-Organization-ID. The filter parses UUID and validates persisted active membership before setting trusted organization context; role checks remain server-side. OWNER/ADMIN/SALES_USER can write CRM; VIEWER can read. `/me` supplies no organization/role. No organization or membership controller exists. The production tenant provider therefore remains unavailable, without client-only selection or inferred roles.

Handoff: expose stable shared auth exports after review, preserving SessionAdapter's subscribe/getSnapshot/restore/login/logout shape. Add separately verified backend membership discovery/selection contracts before replacing TenantState unavailable. Associate membership with the current authenticated user and invalidate all tenant-scoped views/caches on changes. Never infer roles from email/name/profile.

## CRM

Sources: each company/contact/lead/opportunity controller and DTO, plus previously inspected entity/service transition rules in Umer's CONTRACTS.md. All four collection routes provide GET/POST; item `/{id}` provides GET/PUT/DELETE. Collections are `/api/companies`, `/api/contacts`, `/api/leads`, `/api/opportunities`. DELETE archives (204). PATCH `/api/leads/{id}/status` and `/api/opportunities/{id}/stage` change state. Lists return arrays with search/sortBy/sortDirection, not server pages.

Company fields/limits: required name 200; website 2048; industry 120; phone 40; email 254; free-text status 40 defaults ACTIVE. Contact requires companyId and first/last names (100); phone 40, jobTitle 120, email 254, status 40. Lead has optional companyId and the person fields, creation status NEW; update excludes status. Opportunity requires name 200/companyId; description 10000; paired nonnegative amount and `[A-Z]{3}` currency; optional company-matching contactId/expectedCloseDate; state transitions via PATCH. Active relationships are scoped to the selected organization; server validates association/transition constraints. Existing Umer DTOs, client and validation are reused rather than regenerated.

Handoff: split route-level presentational exports out of Umer's internal navigation shell under his ownership or approved shared extraction. Accept the host CRM operations interface and selected resource; retain existing forms/table validations. Mount only after both session and trusted membership resolve; use fresh scoped adapters on account/tenant changes and dispose old requests. Keep list pagination explicitly local until server paging is introduced. Reconcile raw backend ProblemDetail handling and BigDecimal/JavaScript precision limitations before financial production use.

## Dashboard

Inspected Asad's App.tsx, components.tsx, data.ts, styles.css and README. Existing components include Card, Icon, PerformanceChart, DataBoundary, TaskList and DealTable. Current App owns internal navigation, demo profile, fictional metrics, tasks/notifications and assistant layout. Four identifiers are Midnight Glass, Arctic Light, Cyber Command and Executive Gold; semantic CSS variables live on `.app[data-theme]`.

Handoff: accept DashboardShellProps (host route/navigation callbacks, verified current user, theme/change callback, logout, notification data state and children). Export shell and individual widgets without fixture dependence. DashboardModule and DashboardServices reserve these shapes without mounting the demo or fabricating backend metrics. Backend collection/pipeline APIs may eventually inform widgets, but no aggregate dashboard API is assumed. Keep financial totals per currency; no sum across currencies or single-page aggregate masquerading as complete KPI.

Dashboard notification updates require separately verified data/mutation adapters; no fake notification counter or read action is included. Activities, tasks and settings currently provide only safe route boundaries. An AI service is not added or implied.
