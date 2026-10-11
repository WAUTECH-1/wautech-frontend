# Confirmed backend contracts

Inspected local `D:/Development/wautech-crm`, main commit `74467a4e68b480387ca1ff16516feca4afb1d095`, on 2026-10-11. Remote freshness of the backend is not established. Source paths below are relative to `backend/src/main/java/com/wautech/crm/`.

| Resource    | Collection                     | Item operations                                | Filters                             |
| ----------- | ------------------------------ | ---------------------------------------------- | ----------------------------------- |
| Company     | `/api/companies` GET, POST     | `/{id}` GET, PUT, DELETE                       | search                              |
| Contact     | `/api/contacts` GET, POST      | `/{id}` GET, PUT, DELETE                       | companyId, search                   |
| Lead        | `/api/leads` GET, POST         | `/{id}` GET, PUT, DELETE; `/{id}/status` PATCH | companyId, status, search           |
| Opportunity | `/api/opportunities` GET, POST | `/{id}` GET, PUT, DELETE; `/{id}/stage` PATCH  | companyId, contactId, stage, search |

Confirmed in each resource's `controller/*Controller.java`, `dto/*Request.java`, `dto/*Response.java`, `service/*Service.java`, and entities. POST returns 201 and DTO; PUT/PATCH return DTO; DELETE archives and returns 204. Lists return arrays of active records. No server page/size parameters or total count: frontend pagination slices the returned array. All lists support `sortBy` and `sortDirection=asc|desc`. UI exposes confirmed common createdAt/updatedAt sorts and name (companies/opportunities) or lastName (contacts/leads). IDs break sort ties. Search is server-side, case insensitive through SearchText/repository queries.

Company: required name (200); website (2048), industry (120), phone (40), email (254, email validation), status (40). Contact: required companyId, firstName/lastName (100); email (254), phone (40), jobTitle (120), status (40). Company/contact status is free text, default ACTIVE, not an enum. Lead: optional companyId, required firstName/lastName (100), email/phone/jobTitle with contact limits; creation always NEW; update excludes status. NEW → CONTACTED/QUALIFIED/DISQUALIFIED; CONTACTED → QUALIFIED/DISQUALIFIED; terminal statuses cannot transition.

Opportunity: required name (200) and companyId; description (10000), amount >= 0 paired with currency matching `[A-Z]{3}`, optional expectedCloseDate, contactId, stage. Default stage QUALIFICATION. Transitions: QUALIFICATION → NEEDS_ANALYSIS → PROPOSAL → NEGOTIATION → CLOSED_WON; each open stage can instead move to CLOSED_LOST; closed stages terminal. PUT does not update stage; use PATCH. Active related entities must belong to selected tenant, and contact must belong to opportunity company. Backend enforces these constraints independently of frontend validation.

Responses include id, request fields, createdAt, updatedAt, archived; Lead adds status and Opportunity adds stage. Nullable fields remain nullable. Errors use Spring ProblemDetail (status/title/detail/type/instance), generally generic 400 for invalid DTO input, 404 missing/foreign/archived records, 400 invalid transitions/relationships, 401 unauthenticated, 403 membership/permission denied. No confirmed per-field error map.

Authentication: `identity/controller/AuthenticationController.java`, `platform/security/SecurityConfiguration.java`, `ActiveOrganizationContextFilter.java`, `CrmAuthorization.java`, and `organization/entity/OrganizationRole.java`. GET `/api/auth/csrf` returns `{headerName,parameterName,token}`; POST `/api/auth/login` accepts `{email,password}` with CSRF and session cookies. GET `/api/auth/me` returns `{id,email,firstName,lastName}`; POST logout invalidates session (204). Refresh CSRF after login. HTTP Basic and bearer conventions are not supported. Every CRM request requires `X-Organization-ID` (UUID), verified against persisted active membership on every request. OWNER/ADMIN/SALES_USER write; VIEWER reads. No organization discovery controller was found; use an administrator-provided development organization UUID.

Existing tests inspected: Company/Contact/Lead/Opportunity ControllerTest and ServiceTest; CompanyAuthorizationIntegrationTest, OperationalAuthorizationIntegrationTest, AuthenticatedOrganizationContextTest, TenantApiGateTest. Company authorization tests exercise real session/tenant filters and service authorization with mocked persistence. They cover viewer read/write denial and foreign organization rejection. These backend tests were inspected, not executed.

Live blocker: localhost:8080 refuses connections; no valid development account or active organization was supplied. Mock verification cannot establish live backend behavior.
