# Sprint 3 workflows delivery

Owner in the supplied brief: Umer Ellahi. Unified application: `apps/web`.

## Completed feature matrix

| Area          | Delivered                                                                                                                                                                                 | Backend limits                                                                                                |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Tasks         | List, create, detail, edit, complete, reopen, start, cancel, archive; priority and local due date; search, status/priority filters, sorting, overdue/upcoming seven days; related CRM IDs | No assignment or reminder DTOs                                                                                |
| Activities    | List, create, detail, edit, archive; CALL/EMAIL/MEETING/NOTE filtering; search, sorting and default descending chronology; occurrence date and related CRM context                        | No user attribution DTO                                                                                       |
| Notifications | Recipient-scoped pages, unread count, read state, mark read, confirmed read-all, manual refresh, current-page unread filter                                                               | No mark-unread or verified real-time delivery                                                                 |
| Integration   | Company/contact/lead/opportunity associations, server revalidation before save, relationship-filter links between task/activity pages, verified membership notification target            | Only ORGANIZATION_MEMBERSHIP targets exist; links open the administration list, not a membership detail route |
| Access        | Verified shared membership/session context; organization header, existing cookie/CSRF transport; role restrictions; stale/aborted requests discarded                                      | Actual roles are OWNER/ADMIN/SALES_USER/VIEWER, not MEMBER                                                    |
| UX            | Loading, errors/retry, empty states, native form validation, unsaved-edit navigation warning, confirmation dialogs with Escape and focus restoration, mobile form layout                  | Task/activity list APIs are unpaged                                                                           |

## Existing endpoints used; none added or updated

- `/api/tasks`: GET (companyId/contactId/leadId/opportunityId, search, status, priority, overdue, dueAfter/dueBefore, sortBy/sortDirection), POST.
- `/api/tasks/{id}`: GET, PUT, DELETE (archive); `/api/tasks/{id}/status`: PATCH.
- `/api/activities`: GET (relationship IDs, type, search, sortBy/sortDirection), POST.
- `/api/activities/{id}`: GET, PUT, DELETE (archive).
- `/api/notifications?page=N&size=20`: GET; `/api/notifications/unread-count`: GET.
- `/api/notifications/{id}/read`: PATCH; `/api/notifications/read-all`: PATCH, confirmed via `updatedCount`.
- `/api/companies`, `/api/contacts`, `/api/leads`, `/api/opportunities`: GET suggestions; corresponding `/{id}` GET verifies relationships.
- `/api/organization/memberships`: GET verifies an ADMIN/OWNER notification target belongs to the active organization before navigation.
- `/api/auth/csrf`: GET uses existing shared session transport; organization header is omitted for auth endpoints.

Existing backend services validate related entities and reject cross-tenant relationships. Task status transitions mirror the service: OPEN → IN_PROGRESS/COMPLETED/CANCELLED; IN_PROGRESS → OPEN/COMPLETED/CANCELLED; COMPLETED/CANCELLED → OPEN. Backend enforcement remains authoritative. No backend changes, migrations, branch, or PR were necessary; backend tests were not rerun for this frontend-only change.

## Exports and exact registration

`index.ts` exports `TaskPage`, `ActivityPage`, `NotificationPage`, `workflowRoutes`, `workflowNavigation`, `workflowPermissions`, `createWorkflowApi`, parsing functions and workflow types. Scoped CSS is imported by the workflow frame. Pages consume the existing ApplicationContext, have no login or second router, and mount inside the unified shell.

**No manual registration edit is needed.** The existing registry eagerly discovers `src/features/*/feature.ts`; this module supplies `id: workflows`, tenant routes `/tasks`, `/activities`, `/notifications`, and lazy page imports. Existing task/activity routes are replaced through that contract. Existing shell task/activity navigation is reused; the new notification route declares navigation order 15. The shared route inventory test receives one additional expected path; runtime router/auth/App/RouteView files are untouched.

All four roles can read workflows. OWNER/ADMIN/SALES_USER can create/edit/change status/archive. VIEWER has read-only task/activity access but may mark their own notifications read. Membership administration targets require OWNER/ADMIN and a matching current-organization membership response.

Deep links: `/tasks?id=<uuid>`, `/activities?id=<uuid>`; either list accepts `companyId`, `contactId`, `leadId`, or `opportunityId` query filters. `workflowLink` encodes validated IDs. Query-only changes subscribe to existing popstate events without changing the shared router. Association inputs support real server suggestions and manual existing IDs; every nonempty relationship is fetched again before save.

## Verification

- 226 tests passed across all four frontend applications: web 151, asad 10, umer 29, wajahat 36.
- 17 new workflow tests cover task/activity CRUD methods and CSRF/header scoping, completion/reopening, viewer write denial and personal read actions, notification contracts, permitted target verification, failed relationship validation, stale scopes, session expiry, API errors, disposal, search/filter/sort validation, deep links, invalid dates, malformed/duplicate responses, exports and accessible form semantics.
- Full ESLint, all four TypeScript projects, repository Prettier check, and all four production Vite builds passed.
- Disposable browser smoke: 17 assertions covering task create/edit/detail, due persistence, complete/reopen/archive, activity create/edit/archive, related activity link, search/empty state, notifications read/count/read-all, tenant switch/viewer restrictions, dialog autofocus and Escape focus restoration.
- Additional manual browser checks: membership target navigates to `/administration`; mobile form at 390×844 has no document horizontal overflow. Administration page data itself is outside this workflow fixture's scope.
- Browser fixtures live only in this owned `browser/` directory and are not imported by the production manifest. No live CRM records were changed. Browser validation is against mocked HTTP contracts; a live backend end-to-end mutation smoke was not performed.

Reproduce browser checks: start the unified Vite app on port 5177; open `/src/features/workflows/browser/preview.html`; run `runWorkflowSmoke(tab)` from `browser/smoke.mjs` through the CUA browser API. The page carries a visible MOCK WORKFLOW TEST banner. Query `?fail=tasks` or `?fail=activities` exercises source errors. It uses isolated in-memory data and reload resets it.

## Branches and delivery

- Frontend baseline fetched from `origin/main`: `83e2b06` (PR #10 merged).
- Frontend branch: `feature/sprint3-umer-workflows`.
- Backend baseline inspected from `origin/main`: `9173373f29ac1d3840ed95b81c8d1c1ddb506703`.
- Final commit and PR URL are reported with the delivery response; PR is left unmerged.

## Remaining limitations

No fabricated assignment, reminders, attribution, notification generation, mark-unread, or real-time delivery. Upcoming means pending OPEN/IN_PROGRESS tasks due within seven days; overdue is computed by the backend. Dates use local browser inputs and ISO instants at the API boundary. Task/activity list rendering pages 25 records locally and rejects responses over 5,000 records with an actionable error; server pagination would be a separate backend extension. Suggestions show the first 500 real records per resource; manual existing IDs remain available. Notifications use server pages of 20 and the unread-only toggle filters the current page. Verified relationship labels are shown with IDs and task/activity links; existing entity-detail UI is not modified. All feature-specific implementation remains within workflows; the only outside change is the notification route inventory test expectation.
