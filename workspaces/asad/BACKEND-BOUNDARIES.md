# Verified dashboard API boundaries

Verified read-only against backend GitHub main **74467a4e68b480387ca1ff16516feca4afb1d095** on October 12, 2026. Source contracts are confirmed; no live HTTP success, session, tenant, CORS or credentials are claimed. No backend code is modified.

[Backend source at inspected commit](https://github.com/WAUTECH-1/wautech-crm/tree/74467a4e68b480387ca1ff16516feca4afb1d095/backend/src/main/java/com/wautech/crm).

| GET endpoint                      | Confirmed shape/filter boundary                                                                                     | Dashboard use                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `/api/companies`                  | List of CompanyResponse; search, sortBy, sortDirection                                                              | Count only the complete authorized active list; resolve company names.                                                 |
| `/api/contacts`                   | List of ContactResponse; companyId, search, sortBy, sortDirection                                                   | Contact count and name lookup.                                                                                         |
| `/api/leads`                      | List of LeadResponse; status, companyId, search, sortBy, sortDirection                                              | Counts/status breakdown with explicitly agreed meaning of open/qualified.                                              |
| `/api/opportunities`              | List of OpportunityResponse; companyId, contactId, stage, search, sortBy, sortDirection                             | Value/name/stage list. amount/currency can be absent; do not synthesize zero. No owner field was verified in this DTO. |
| `/api/activities`                 | List of ActivityResponse; companyId, contactId, leadId, opportunityId, type, search, sortBy, sortDirection          | Recent activity records; host formats time/text and validates sorting fields.                                          |
| `/api/tasks`                      | List of TaskResponse; association IDs, status, priority, dueBefore/dueAfter, overdue, search, sortBy, sortDirection | Upcoming/overdue tasks; source has status, dueAt, completedAt and overdue.                                             |
| `/api/pipeline`                   | PipelineResponse `{ stages }`; companyId, contactId. Stages expose stage, opportunityCount, totalsByCurrency        | Map each currency entry into PipelineStage.totals; keep currency groups separate.                                      |
| `/api/notifications`              | NotificationPageResponse `{ content, page, size, totalElements, totalPages, first, last }`; page/size defaults 0/20 | Inbox page; map title/message and readAt to view fields. Do not infer a global unread count from this page.            |
| `/api/notifications/unread-count` | UnreadNotificationCountResponse                                                                                     | Supply the verified optional dashboard unreadNotificationCount.                                                        |

All eight resource controllers also expose GET `/{id}` except pipeline. Task completion source defines PATCH `/api/tasks/{id}/status`; notification source defines PATCH `/api/notifications/{id}/read` and `/api/notifications/read-all`. The shell emits intent callbacks, not requests. Before wiring any callback, verify deployed request DTOs/status enum, permission policy and HTTP behavior; no task-status value is invented here.

Controller source filenames use each resource's `controller/*Controller.java`. Verified pipeline DTOs are `pipeline/dto/PipelineResponse.java` and `PipelineStageSummary.java`; notification DTOs are `notification/dto/NotificationPageResponse.java` and `NotificationResponse.java`; opportunity/task DTOs are `opportunity/dto/OpportunityResponse.java` and `task/dto/TaskResponse.java`.

`platform/security/ActiveOrganizationContextFilter.java` requires `X-Organization-ID` for authenticated CRM calls and validates persisted active membership. Authentication uses the existing session flow; mutation calls require the source-verified CSRF policy. The future host/client must own cookie credentials, CSRF and tenant headers, membership discovery, role verification, cancellation and stale-response protection. Never infer a trusted organization or owner from display props.

## Replacement plan

1. Reuse the agreed host/API client, rather than importing or copying another workspace's implementation. Verify response shapes at runtime and handle unavailable fields explicitly.
2. Map authorized lists to typed view models. IDs must be stable and unique; text/time/initials are supplied by the host. Pass empty arrays while unavailable, with loading/error state, rather than demo defaults.
3. Set verified provenance with source/filter/completeness label and observation timestamp only after real validation. Keep demo provenance if any fixtures remain; do not silently relabel a partly synthetic snapshot verified.
4. For each monetary value, carry currency throughout mapping, formatting and grouping. Reject invalid/nonfinite/negative values. Preserve null/missing value separately. Backend BigDecimal precision must be checked before converting to the numeric presentation boundary. No currency conversion is defined by this sprint.
5. Count companies/contacts/leads only from complete datasets under the same tenant/filter; notification lists are paginated and need the unread-count route. Pipeline totals are backend aggregates by currency. No aggregate dashboard KPI, revenue, historical chart or period-comparison endpoint has been verified. Current-value lists cannot establish historical growth, revenue or win rate. Leave unknown metrics and historical chart data absent/empty until definitions and a reliable source exist.
6. Wire task/notification intents through host mutation status. Re-supply confirmed data, disable mutation handlers while pending if needed, and surface failures. Never mark persisted records complete/read locally and imply backend success.
7. Revalidate backend contracts and source version during deployment; run authorized live smoke and integrated tenant/session/browser tests. Source inspection and mocked/fixture tests are not production integration proof.

No real API client or speculative aggregate route is added. AI remains disconnected independently of dashboard data provenance.
