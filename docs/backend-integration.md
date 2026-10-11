# Future Spring Boot connection

The existing backend is maintained separately at https://github.com/WAUTECH-1/wautech-crm. This foundation does not change it or define its API endpoints.

Copy your workspace's `.env.example` to `.env.local` inside that same workspace. Vite loads environment files from the application directory, so the root example is documentation rather than shared runtime configuration. Set `VITE_API_BASE_URL` to the backend origin verified with the backend team. `http://localhost:8080` is an illustrative local value, not a confirmed backend address.

Future frontend code can read `import.meta.env.VITE_API_BASE_URL`. Validate the configured value when a real API client is introduced. Vite substitutes these variables at build time; deployment configuration changes require rebuilding. Every `VITE_*` value is public browser data. Never put passwords, tokens, credentials, or secrets in these variables.

Confirm the backend's actual endpoint paths, request/response schemas, authentication requirements, and local port before implementing calls. Confirm CORS with the backend team for localhost ports 5173, 5174, and 5175 and the eventual deployment origin. No proxy, API paths, auth behavior, DTOs, or network calls are assumed in this foundation.
