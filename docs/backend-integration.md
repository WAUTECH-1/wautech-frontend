# Integrated backend connection

The production frontend is apps/web; its backend is the separate wautech-crm repository. Phase 2–5 contracts are integrated and tested over real HTTP with disposable PostgreSQL. Use [release acceptance](./release-acceptance.md) for current evidence and limitations.

Set public VITE_API_BASE_URL=/ for same-origin /api calls. During local development, WAUTECH_DEV_API_TARGET configures the apps/web Vite proxy; never point fixture acceptance at a customer database. Production requires the separately validated reverse proxy in [deployment](./deployment.md). Vite preview is not that production proxy.

One host session and AuthProvider serve all feature modules. Session-cookie authentication, X-CSRF-TOKEN on writes, verified active organization selection and fresh server roles remain authoritative. Actual roles are OWNER, ADMIN, SALES_USER and VIEWER, with no MEMBER alias. Do not introduce duplicate auth providers or standalone workspace production roots. Provider keys stay server-side; all VITE values are public.

Read [business contracts](./business-data-contracts.md) and phase delivery documents for actual DTOs, bounds, date/currency semantics, optimistic revisions and task-confirmation behavior. Endpoints or mocked UI do not establish full release acceptance. Follow backend-first compatible promotion after review/checks; do not force-merge or bypass protection.
