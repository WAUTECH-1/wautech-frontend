# Sprint 2 dashboard integration contract

Base frontend main: `3c1177f1c49d32224fc87cac67645726990dfd3b`. Branch: `feature/sprint2-asad-dashboard-integration`. Only `workspaces/asad/` is changed. The Sprint 1 dashboard is refactored, not replaced. `apps/web/README.md` remains the reviewed integration placeholder; this sprint does not mount anything there.

## Export entry and ownership

Import `src/integration.ts` for production reuse. It has no stylesheet side effects, DOM startup, network calls, auth imports, CRM client imports, or transitive demo imports. An automated dependency-graph test enforces that boundary.

`src/main.tsx` still starts the standalone app. `src/App.tsx` is now the demo adapter: it supplies `createDemoData`, the demo user, local task/read state and directory previews. `demo.ts`, `DemoDirectory.tsx`, `data.ts` and `components.tsx` are standalone/legacy compatibility files; do not import them into production. `App.test.tsx` is preserved unchanged, including Sprint 1 tests and compatibility chart assertions.

| Export                 | Contract / responsibility                                                                                                                                                                                                                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DashboardApplication` | Full viewport shell plus dashboard. Required: `data`, `user`, `period`, `periods`, `onPeriodChange`. Preserves navigation search, desktop collapse/mobile drawer, profile, notifications, appearance and disconnected assistant UI.                                                                                              |
| `DashboardView`        | Dashboard content only. Required: `data`, `period`. Optional navigation, task and inbox callbacks. `showProvenance` defaults true; only suppress it if the host visibly presents the same provenance.                                                                                                                            |
| `MetricCards`          | `metrics: readonly Metric[]`; labels, formatted values, optional comparisons and supplied sparklines. No inferred business metrics or invented trend.                                                                                                                                                                            |
| `PerformanceChart`     | `series: PerformanceSeries`; explicit single currency, point labels/current values/optional previous values. Computes scale from supplied values; keyboard samples include current/previous amounts. No embedded chart fixture. Invalid/nonfinite/negative point data produces an alert; empty series produces an empty message. |
| `PipelineWidget`       | `stages: readonly PipelineStage[]`, optional `onNavigate`. Groups totals and segment distributions separately by currency.                                                                                                                                                                                                       |
| `TaskList`             | `tasks: readonly DashboardTask[]`, optional `onToggle(id, completed)`. Controlled task state; read-only without callback.                                                                                                                                                                                                        |
| `OpportunityTable`     | `opportunities: readonly Opportunity[]`; per-record currency, explicit unavailable value when null.                                                                                                                                                                                                                              |
| `ActivityFeed`         | `activities: readonly Activity[]`; supplied text and time labels.                                                                                                                                                                                                                                                                |
| `PriorityList`         | `actions: readonly PriorityAction[]`, optional `onNavigate`. No embedded priority heuristic.                                                                                                                                                                                                                                     |
| `Card`, `Icon`         | Existing presentation primitives. `Card` accepts title, optional subtitle/action/className, and children.                                                                                                                                                                                                                        |
| `DataBoundary`         | Required `state`, children; optional retry/errorMessage/demo. No demo semantics by default. Use it around DashboardView when the host already has a shell.                                                                                                                                                                       |
| `ThemeScope`           | Controlled `theme`, children, optional className. Wraps widgets in the scoped style namespace.                                                                                                                                                                                                                                   |
| `useDashboardTheme`    | `(initialTheme?, preferenceKey?) => { theme, setTheme }`; optional safe browser persistence.                                                                                                                                                                                                                                     |
| Formatting/preferences | `formatMoney`, `pipelineTotals`, `resolveTheme`, `readPreference`, `savePreference`, `themes`, `navigation`.                                                                                                                                                                                                                     |

All interfaces and prop types are exported. React/ReactDOM 19.3.0 and the existing TypeScript/Vite toolchain are sufficient. No new dependency or root lockfile/configuration change is introduced. Reusable styles are plain CSS and need no Tailwind reset; Tailwind remains in the standalone stylesheet.

## Required view model

`DashboardData` requires provenance plus explicit arrays for metrics, opportunities, pipeline, tasks, priorities, activities and notifications, and a performance series. Empty arrays are valid and never trigger fixture fallback. `Provenance` is either `{ kind: 'demo', label }` or `{ kind: 'verified', label, asOf }`. Mark data verified only after the host has validated it against the live authorized source. This discriminator is display provenance, not an authentication/security boundary.

- `Metric`: id, label, formatted value, icon; optional change, detail and numeric trend. Host owns definitions, filters, completeness and comparisons. Missing change yields no comparison text or synthetic sparkline.
- `Money`: finite nonnegative numeric amount and uppercase three-letter currency. `formatMoney` uses currency-aware Intl display precision. JavaScript numbers are a presentation boundary, not an accounting ledger; validate decimal precision and safe range upstream.
- `Opportunity`: id, company, initials, name, stage, owner and `value: Money | null`. Missing backend amount/currency must map to null, not zero. No assumed backend owner field: use an explicit unavailable label if the source cannot provide an owner.
- `PipelineStage`: id, stage, count, and a list of currency totals. `pipelineTotals` never combines currencies; segment ratios are computed within each currency only.
- `PerformanceSeries`: currency, points `{ label, current, previous? }`, description, optional summary/change. Each point uses full units, not thousands or percentages. Summary must use the same currency and reporting definition as the series. Leave points empty and summary/change absent if no verified history exists. Period selection does not fabricate history.
- `DashboardTask`: id, title, detail, initials and completed. The host maps backend status/due dates; initials are optional presentation information represented by an explicit placeholder when unavailable.
- `PriorityAction`: id, title, description, icon and target Page. Host supplies only justified priorities.
- `Activity`: id, text, timeLabel. `Notification`: id, title, detail, read.
- `unreadNotificationCount` is optional and should come from the unread-count endpoint. Without it, counts explicitly refer to loaded notifications; an empty loaded page does not imply the global inbox is caught up. Supplied counts must be nonnegative integers. With a verified count of zero, the summary can say caught up.

## Shell, navigation and mutation callbacks

`WorkspaceUser` requires name, initials, roleLabel, workspaceName and authenticated. These are host display values; this component performs no session or role verification and never grants access.

`DashboardApplicationProps` additionally supports:

- `page` and `onNavigate(page: Page)`: controlled host routing, or omit page for the standalone local page state. Page names are exported in navigation. No URL/history/auth logic is imported.
- `renderPage(page)`: host-owned CRM destinations. The reusable shell shows a host-managed destination message if no renderer is supplied; it never substitutes a fictional directory. Tasks and activities use supplied dashboard data; Settings remains the appearance screen.
- `onTaskToggle(id, completed)`: send a mutation intent to the host. The host owns permission, pending/error handling and re-supplies confirmed data. Omitting it disables task checkboxes.
- `onMarkNotificationsRead()`: host owns the PATCH and updates notification/read-count props only after success. No local production fake success. Omit the callback for read-only notifications.
- `state`, `errorMessage`, `onRetry`: host load/retry state. On account/tenant changes, clear previous records and remount with a new tenant/user key; do not pass old tenant records while loading.
- `onPeriodChange(period)`: host changes the period and data together. `periods` defines permitted options.
- `navigationBadges`: optional host-supplied Page-to-string badges; the demo's 24-lead badge exists only in App.tsx.
- `initialTheme`, `preferenceKey`: initial theme and persistence namespace. Initial theme/key initialize once; remount when changing identity/persistence context. Default keys preserve Sprint 1 preferences.
- `demoControls`: false by default, and only enables load-state previews when provenance is demo. Never overrides host state for verified data.
- `idPrefix`: optional unique deterministic DOM prefix. Omit for React-generated collision-safe IDs; the standalone adapter uses the historic main/panel IDs. If supplied for multiple instances, it must be unique.

The full shell owns fixed viewport navigation and modal panels: mount one full shell per page. `DashboardView` and individual widgets are the preferred exports when apps/web already owns its shell. Modal focus/return, Escape, mobile focus containment/inert content and navigation search keyboard shortcut are preserved. A modal/drawer blocks the search shortcut from stealing focus.

## Theme/style integration

Import `themes.css` then `dashboard.css` once in the host's style entry. Do not import `styles.css`: it is standalone-only and includes Tailwind's global reset plus body margin. Every rule in the reusable files starts with `.wautech-dashboard` or `:where(.wautech-dashboard)`, including reset, typography, responsive and reduced-motion rules. Tokens attach to the scope, never :root/body. Review the host cascade order; scoping prevents outgoing style leakage but is not Shadow DOM isolation from incoming host styles.

All four Sprint 1 token sets remain unchanged: Midnight Glass, Arctic Light, Cyber Command and Executive Gold. Semantic token names cover background/surface/sidebar/raised/border/text/muted/accent/primary/cyan/green/shadow. ThemeScope provides a controlled wrapper, allowing independent scopes. The full shell sets its own namespace and data-theme automatically.

Example for a host that already owns routing/authentication:

```tsx
import {
  DashboardView,
  DataBoundary,
  ThemeScope,
} from './prepared-dashboard/integration';
import type {
  DashboardData,
  DashboardActions,
  DataState,
  Theme,
} from './prepared-dashboard/integration';
import './prepared-dashboard/themes.css';
import './prepared-dashboard/dashboard.css';

function IntegratedDashboard(
  props: DashboardActions & {
    data: DashboardData;
    state: DataState;
    period: string;
    theme: Theme;
    onRetry: () => void;
  },
) {
  return (
    <ThemeScope theme={props.theme}>
      <DataBoundary state={props.state} retry={props.onRetry}>
        <DashboardView {...props} />
      </DataBoundary>
    </ThemeScope>
  );
}
```

This is an integration pattern, not code added to apps/web. After shared ownership approval, move the prepared files into the agreed host location and adapt imports. Keep the new tests. Do not include demo/compatibility/preview files in a production entry. The host owns live adapters and existing API-client reuse; Asad does not duplicate Umer's client or borrow Wajahat's authentication logic.

For client rendering, useDashboardTheme persists `${preferenceKey}-theme` and gracefully handles denied storage. For SSR hydration, prefer controlled ThemeScope with server/client-aligned theme state; the optional localStorage hook reads the client preference at initial render and should not be independently used to hydrate a server default.

## Verification and limits

Run `npm run dev:asad` on 5174. Run root lint/typecheck/test/build and `npm run format --workspace=@wautech/asad`. The workspace-local format command deliberately respects the root ignore file and does not write to another workspace, shared configuration or apps/web. Root format:check remains read-only and available.

Manual CSS isolation fixture: http://localhost:5174/tests/integration-preview.html. It imports only the integration entry plus reusable CSS, shows an outside host heading/button and mixed-currency demonstration pipeline, and excludes Tailwind preflight. It makes no backend calls and is not in the production startup/export graph.

Current limitations: no live dashboard adapter, history/aggregate endpoint, confirmed global KPI definition, complete accessibility audit or unified host routing. Authenticated tenant discovery and roles require backend/host coordination. Financial arithmetic uses JavaScript numbers for display; no FX conversion or cross-currency total is performed. The assistant remains explicitly disconnected, with only a local draft and no generated response or provider connection.

### Workspace package entry

The workspace manifest exposes source exports for Vite/TypeScript consumers:

```tsx
import { DashboardView, ThemeScope } from '@wautech/asad';
import type { DashboardData } from '@wautech/asad';
import '@wautech/asad/themes.css';
import '@wautech/asad/dashboard.css';
```

These are source exports for the existing monorepo toolchain, not a separately published/precompiled Node library. The future host must declare its workspace dependency through the agreed shared configuration review; this sprint does not edit host dependencies. The relative/moved-file integration example above is an alternative after integration ownership approval.
