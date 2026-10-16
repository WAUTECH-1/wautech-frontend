# Deployment candidate and operations

This is a reviewable deployment runbook, not evidence of a deployed environment. Production deployment requires explicit approval. Hosting, domain, certificate, IAM, encryption, backup target, RPO/RTO and retention must be agreed before promotion. No production environment was changed.

## Artifact and environment contract

Build with Java 25 and the backend Maven wrapper; frontend Node 24.19.x/npm 11.6.x using `npm ci` and `npm run check`. Publish backend `backend/target/crm-0.0.1-SNAPSHOT.jar` and **only** frontend `apps/web/dist`. Preserve immutable artifacts keyed by full Git SHA and SHA-256; never rebuild an old release during rollback. Workspace apps are developer-only.

| Variable                                                                    | Production requirement                                                                                                     |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| DB_URL                                                                      | Approved PostgreSQL JDBC URL; configure verified TLS for remote DB; no fixture URL                                         |
| DB_USERNAME / DB_PASSWORD                                                   | Dedicated least-privilege runtime principal and secret delivery; migrations may need a separately controlled DDL principal |
| SERVER_PORT                                                                 | 8080 on private interface/network; block direct public access                                                              |
| SESSION_COOKIE_SECURE                                                       | `true`; HTTP-only/SameSite=Lax cookie already configured                                                                   |
| PASSWORD_BCRYPT_STRENGTH                                                    | Existing default 12; do not lower without reviewed performance/security evidence                                           |
| VITE_API_BASE_URL                                                           | `/` for same-origin proxy; public build-time value, never a secret                                                         |
| WAUTECH_DEV_API_TARGET                                                      | Local Vite proxy only; not a production proxy configuration                                                                |
| AI_ENABLED                                                                  | `false` until approved live-provider evaluation passes                                                                     |
| AI_PROVIDER / AI_MODEL / AI_API_KEY                                         | Existing server OpenAI adapter, approved model and server secret; no browser credential                                    |
| AI_DATA_RETENTION_ACKNOWLEDGED                                              | Required explicit operational acknowledgment before enabled inference                                                      |
| AI_DAILY_TOKEN_LIMIT / AI_MONTHLY_TOKEN_LIMIT / AI_TENANT_DAILY_TOKEN_LIMIT | Existing defaults 250000 / 2000000 / 100000; align with approved provider spend limits                                     |
| MONITORING_AUTH_ENABLED                                                     | Keep off unless approved JWT scrape integration configured                                                                 |
| MONITORING_ISSUER_URI / MONITORING_JWK_SET_URI / MONITORING_AUDIENCE        | Approved monitoring identity only; never public unauthenticated metrics                                                    |

Use environment/secret-manager injection; do not deploy repository `.env` files. All VITE values are public. AI `store=false` is not a zero-retention guarantee. Keep reminder scheduling off until ownership and single-instance execution are approved; the exact scheduler property is app.reminders.enabled=true (default off), and enabling it requires single-instance ownership.

## Proxy and startup

Review [Nginx candidate](../deploy/nginx.conf.example), substitute approved domain/certificates, and run `nginx -t` in the intended environment. It preserves `/api` paths/errors, hides actuator, provides API/login throttling and SPA deep-link fallback, and serves assets with missing-file 404s. Never route API failures to index.html. No Nginx runtime/TLS acceptance has run here. Keep backend unreachable except through the approved proxy/private monitoring network. IP-based throttling is an initial control; shared-IP behavior and distributed attacks need staged verification.

Start PostgreSQL and verify backup availability. Run the exact reviewed backend artifact with `java -jar crm-0.0.1-SNAPSHOT.jar`; Flyway validates/applies migrations and Hibernate validates the resulting schema. Backend readiness must pass before publishing web. Point `/srv/wautech/current/web` at the immutable web artifact and reload the validated proxy. Check `/api/health`, `/api/health/liveness`, `/api/health/readiness`, login/CSRF/cookie flags, a permitted read/write, a denied cross-tenant request and a browser deep link. Confirm unknown API URLs remain JSON/backend errors, not HTML. Record SHAs, operator, migration version and smoke results.

For shutdown, stop incoming traffic, allow active requests to finish, terminate the Java process using the service manager, and verify no requests remain. Configure and verify graceful shutdown/timeout in the approved runtime; current repository defaults do not establish this. Stop DB only after application shutdown. Service-manager/container configuration, restart behavior and resource limits remain unverified.

## Migration, backup and recovery

Never edit applied V1–V24 migrations. Before migration, obtain a consistent PostgreSQL custom-format dump (`pg_dump -Fc`) plus roles/configuration and record database/version/checksum. Encrypt backups with restricted access in the approved target. Define retention, automated schedule and restore alerts. Test restore into a separate authorized empty database using `pg_restore --exit-on-error`, then verify Flyway history, counts, relationships, sessions/authorization and application readiness. Never restore over live customer data without a separately approved recovery action.

Phase 6 disposable validation restored all 24 successful migrations and 5,101 fixture companies. This verifies a local logical dump/restore path, not production backup automation, point-in-time recovery, RPO/RTO, encryption or off-site retention.

Rollback: stop promotion on migration/startup/smoke failure. Repoint web and restart the previous immutable backend only if its schema compatibility is verified. Do not automatically downgrade or delete Flyway history. For incompatible schema changes, prefer a reviewed forward fix; restoring the pre-release database requires approval and analysis of writes since the backup. Record recovery duration and potential data loss. Re-run tenant/auth/readiness acceptance.

## Operations

Capture process stdout/stderr with rotation/access restrictions. Existing correlation IDs and AI request outcome/timing/token counters aid diagnosis; do not log credentials, request bodies, model prompts, customer descriptions or raw provider payloads. Configure private health/metrics monitoring and alerts for readiness failure, 5xx, login abuse, DB capacity, backup failure and AI budget denial. Incident/support ownership, thresholds, storage retention and tested alert delivery remain open. Repeat dependency scans at promotion; preserve advisory metadata and documented applicability exceptions. Perform a bounded disposable load smoke against agreed targets before claiming an SLO.
