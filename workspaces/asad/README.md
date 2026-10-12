# WAUTECH Intelligence — Asad Sprint 1

Independent React 19 / TypeScript / Vite 8 / Tailwind 4 application. Implementation stays within `workspaces/asad/`, with no imports from sibling workspaces, shared contracts, or `apps/web`. No new dependencies or shared configuration changes.

## Run

From the repository root, using the foundation's Node 24.19.0 and npm 11.6.2:

```sh
npm ci
npm run dev:asad
```

Open http://localhost:5174. Vite uses strict port 5174; preview uses 4174. Build with `npm run build --workspace=@wautech/asad`, run tests with `npm test --workspace=@wautech/asad`. Repository validation is `npm run check` and `npm run format:check`.

## Screens and components

- Executive overview: business metrics, company/contact overview, leads, opportunity performance chart, sales pipeline, priority actions, tasks, recent opportunities, activity feed and notifications summary.
- Companies, contacts, leads and opportunities: sample directories with appropriate columns. Sales pipeline: stage/value table. Activities: sample timeline. Tasks: interactive checklist. Settings: appearance picker.
- Collapsible desktop sidebar, mobile drawer, top navigation, searchable navigation (Ctrl/Cmd K), demo profile, notification inbox, and Intelligence assistant panel.
- `Card`, `Icon`, `PerformanceChart`, `DataBoundary`, `TaskList` and `DealTable` provide reusable presentation primitives. `data.ts` owns isolated fictional fixtures, currency formatting and resilient browser preference helpers.
- Loading, empty and error previews replace all dashboard data; recovery returns to the demo. Task completion and notification read state are session-only.

## Theme architecture and accessibility

`styles.css` defines semantic custom properties on `.app[data-theme]`: background, surface, raised surface, sidebar, border, text, muted text, accent, primary button, cyan, green and shadow. Midnight Glass, Arctic Light, Cyber Command and Executive Gold reuse the same components. Theme and desktop collapse preferences persist in localStorage, with safe fallbacks when storage is unavailable.

Native modal dialogs provide focus containment and Escape dismissal; focus returns to the opener. Mobile navigation contains keyboard focus, makes underlying content inert, and hides closed navigation from keyboard access. A skip link, labeled controls, visible focus indicators, semantic tables, checkbox labels and keyboard-readable chart samples support accessibility. Reduced-motion media queries remove transitions. Tables scroll within their card; grids adapt to narrow screens. No heavy chart, animation or 3D dependencies.

## Backend verification and integration

Read-only source inspection used the accessible local reference at `C:/Development/wautech-crm/backend/src/main/java/com/wautech/crm/`. Remote repository retrieval was unavailable. These routes are **verified in source only**, not tested against a running service:

| GET route                         | Source / purpose                                         |
| --------------------------------- | -------------------------------------------------------- |
| `/api/companies`                  | CompanyController: company list                          |
| `/api/contacts`                   | ContactController: contact list                          |
| `/api/leads`                      | LeadController: lead list                                |
| `/api/opportunities`              | OpportunityController: opportunity list                  |
| `/api/activities`                 | ActivityController: activity list                        |
| `/api/tasks`                      | TaskController: task list                                |
| `/api/pipeline`                   | PipelineController: optional companyId/contactId filters |
| `/api/notifications`              | NotificationController: page/size pagination             |
| `/api/notifications/unread-count` | NotificationController: unread count                     |

PipelineResponse contains `stages`; each PipelineStageSummary contains `stage`, `opportunityCount`, and `totalsByCurrency`. Never sum different currencies into a single financial metric. Notification source also defines PATCH `/{id}/read` and `/read-all` under `/api/notifications`; current UI actions do not call these routes. Controllers resolve the authenticated organization. SecurityConfiguration uses session authentication and CSRF protection (`X-CSRF-TOKEN`); source includes `/api/auth/csrf` and `/api/auth/me`.

No consolidated dashboard KPI endpoint was established. Runtime origin, deployed version, credentials, CORS, authorization and full DTO contracts still need integration verification. This application makes no API calls and does not assume authentication. `VITE_API_BASE_URL` is reserved by the foundation and intentionally unused.

All numbers, chart series, timestamps, companies, contacts, leads, opportunities, activities and notifications are demonstration data. Metrics are illustrative and are not calculated from a complete CRM dataset; the four pipeline records reconcile to USD 230,000. Chart values are independent illustrative weekly samples, not booked revenue or a financial forecast. Switching reporting periods previews a different series rather than querying business data. Directories are small previews, not full CRM management screens. The demo profile is not authenticated.

The assistant displays suggested prompts and a local draft/conversation layout. It explicitly states the AI service is not connected, sends nothing, and fabricates no AI response.

## Future apps/web integration

After team review, move the shell and semantic theme tokens into the integration application, then extract widgets into dedicated files and introduce a verified data adapter. Replace fixtures with validated paginated DTOs, cancel obsolete requests, handle per-widget errors, and preserve demo provenance whenever fixtures remain. Confirm session cookie/CORS settings and CSRF behavior with the backend team. Derive counts and period comparisons from complete authorized datasets or a backend aggregate endpoint, not a single page. Keep opportunity value separate from booked revenue and group totals by currency. Add real routing, authentication, task persistence and notification mutations only after contracts are agreed. Keep assistant submission disabled until an approved service exists.

## Validation

Vitest covers server rendering/provenance, accessible shell controls, loading/empty/error recovery, chart period changes and sample labels, sample pipeline reconciliation, four themes and safe SSR preferences. Browser checks cover navigation search, sidebar collapse, persisted themes, assistant drafts and Escape, tasks, notification read state, preview states and mobile navigation/layout. Production compilation, lint and repository checks are recorded in the delivery message. These checks do not constitute a complete WCAG audit or live backend validation.

## Scope and delivery

Changed files: `src/App.tsx`, `src/App.test.tsx`, `src/styles.css`; added `src/components.tsx`, `src/data.ts` and this README. Shared configuration, sibling workspaces and backend code are unchanged. Branch: `feature/asad-dashboard`. No push, pull request or merge is authorized.

## Sprint 2 integration preparation

The current branch prepares this existing dashboard for host integration without rebuilding it. See [INTEGRATION.md](./INTEGRATION.md) for exports, typed props, scoped themes, callbacks and mounting guidance; [BACKEND-BOUNDARIES.md](./BACKEND-BOUNDARIES.md) records current source verification and data replacement requirements.

Use `src/integration.ts` in a future host. `App.tsx`, `demo.ts` and compatibility adapters remain standalone-only. Standalone startup is unchanged: `npm run dev:asad`. Format only this workspace with `npm run format --workspace=@wautech/asad`.
