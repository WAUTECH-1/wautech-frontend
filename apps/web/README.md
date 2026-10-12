# WAUTECH Intelligence — unified application

`apps/web` is the production React/TypeScript/Vite application. It reuses Wajahat's authentication, Asad's dashboard/theme exports and Umer's CRM operations through declared npm workspace dependencies. The three developer applications remain independently runnable.

## Startup

From the frontend root, with Node 24.19.0 and npm 11.6.2:

```sh
npm ci
npm run dev
```

`npm run dev` and `npm run dev:web` start http://127.0.0.1:5176. No sibling application server is needed. Backend startup is documented in its repository: `docker compose up -d --wait postgres`, then `backend/mvnw.cmd spring-boot:run` from backend/. Existing admin@wautech.local credentials must be entered by their owner; no password or tenant UUID is hardcoded.

## Configuration

Public frontend variables: VITE_API_BASE_URL and WAUTECH_DEV_API_TARGET. Defaults use same-origin /api via the development proxy to localhost:8080. Copy this directory's .env.example only if overrides are needed. Never include passwords, tokens or organization IDs in VITE_* variables.

Production serves apps/web/dist and must reverse-proxy /api to Spring, preserve cookies/CSRF/tenant headers and no-store behavior, and serve index.html for frontend deep links. Vite's proxy is development-only. HTTPS, secure session cookies and actual deployment configuration require acceptance checks.

## Integrated behavior

- One auth provider/store and refresh lifecycle, cookie session restoration, verified login, CSRF and logout.
- Authenticated membership discovery/selection; tenant context is cleared on account/organization changes. This requires the separate backend codex/current-user-organizations branch.
- Dashboard/current counts, pipeline, opportunities, tasks, activities, priorities from overdue tasks and notifications from authorized backend APIs.
- Companies, contacts, leads and opportunities: existing list/detail/create/edit/archive/forms/search/sorting/filtering/local pagination and transitions.
- Four persisted themes, responsive navigation, profile and logout.
- Historical charts remain empty/unavailable; AI stays explicitly disconnected. No demo fixtures enter the production build.

## Verification

Run npm run check and npm run verify:dev from root (stop existing servers first for verify:dev). Root checks cover all four apps. See ../../docs/unified-integration.md for detailed evidence and limitations.

The optional /tests/preview.html is an explicitly labeled mocked browser fixture served only by the development server, not the production HTML/build entry. It is not proof of live backend integration.
