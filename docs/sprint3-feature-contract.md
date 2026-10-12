# Sprint 3 feature registration

Baseline: frontend PR #8 (`c8398c4`) and backend PR #20 (`39e8421`) are **open**, not merged. Sprint 3 starts from these compatible local heads. Deploy/merge the backend dependency before the unified frontend. This branch does not prove other developers' Sprint 3 modules are integrated.

The stable interface is `apps/web/src/features/contract.ts`. Add a directory with `feature.ts` exporting a default `FeatureModule`. Vite discovers `features/*/feature.ts` automatically. Keep the manifest lightweight and use `load: () => import('./Page')` (or an existing workspace export) for the page. `example/` is a working, tenant-protected example at `/feature-example` with no navigation entry.

Each route declares path, title, session/tenant access, optional exact backend roles, optional navigation label/order, lazy page loader, optional provider and loading fallback. Pages and providers consume `useFeatureApplication()` for the existing session, verified tenant, organization discovery/switching, API configuration and current-context getter. Never create another React root/router/session manager. The host supplies suspense and an error boundary. Route changes and tenant generations unmount providers/pages.

Navigation descriptors appear in the existing shell's host controls, with the same route guards as direct URLs. Existing sidebar and visual design remain owned by Asad. Existing paths can be replaced by an explicit feature registration; duplicate feature IDs/paths fail at startup. Keep replacement paths scoped to the developer's agreed module.

Asad/Umer can develop against their verified baseline and export content-only pages from their own workspace. Their registration boundary is a new `apps/web/src/features/<module>/feature.ts`; no edits to App.tsx, RouteView.tsx, root configuration or package-lock are needed. Wajahat reviews and merges those boundary adapters. Do not copy owned components.

Backend authorization remains authoritative. Role restrictions on session-only routes are rejected. Tenant routes require both the current authenticated user and their verified membership; stale requests must use the host context and scoped transport patterns. Do not accept arbitrary tenant/user identifiers as authorization.

Integration order: review/merge backend #20, frontend #8, backend Sprint 3, frontend Sprint 3; rebase the two feature branches on the resulting main; merge each reviewed content export and manifest adapter; run root checks and browser smoke after each merge. Use ordinary merges/rebases on owned branches, never force-push shared branches. Final release requires live environment cookie/HTTPS/CSRF acceptance.
