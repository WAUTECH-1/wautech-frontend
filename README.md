# wautech-frontend

Frontend application for WAUTECH Intelligence Platform

Repository foundation only. No CRM, authentication, dashboards, or AI features are implemented.

## Requirements and installation

Use Node.js 24.19.0 (supported LTS line) and npm 11.6.2. Node versions are recorded in `.nvmrc` and `.node-version`; dependency versions are exact and the root lockfile is authoritative.

```sh
npm ci
```

Run npm from the repository root. Do not create per-workspace lockfiles. `npm run install:dependencies` also runs `npm ci`. After an intentional dependency change, run `npm install` and submit the root manifests and lockfile for shared review.

## Structure

```text
apps/web/                 Reserved integration application
workspaces/wajahat/       Wajahat's independent application
workspaces/asad/          Asad's independent application
workspaces/umer/          Umer's independent application
packages/contracts/      Empty shared type boundary
docs/                    Ownership and backend integration guidance
.github/workflows/        Frontend CI
```

## Development

| Developer | Root command          | Port | Workspace command                        |
| --------- | --------------------- | ---- | ---------------------------------------- |
| Wajahat   | `npm run dev:wajahat` | 5173 | `npm start --workspace=@wautech/wajahat` |
| Asad      | `npm run dev:asad`    | 5174 | `npm start --workspace=@wautech/asad`    |
| Umer      | `npm run dev:umer`    | 5175 | `npm start --workspace=@wautech/umer`    |

Run each command in a separate terminal. All development servers use `strictPort: true` and fail if their assigned port is occupied. Each workspace also supports `npm run build --workspace=@wautech/<developer>` and `npm test --workspace=@wautech/<developer>`. Commands can also be run inside the workspace (`npm start`, `npm run build`). Preview ports are 4173, 4174, and 4175 respectively, also strict.

## Validation

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run format:check
npm run verify:dev
```

`npm run check` runs lint, type checks, tests, and builds in sequence. Builds produce a separate `dist/` inside each developer workspace. Tests verify each application's exact placeholder heading using React's server renderer. CI uses `npm ci` and runs all four required checks on pushes and pull requests. Local execution does not establish a GitHub CI result.

React 19.3.0, Vite 8.3.4, Tailwind CSS 4.3.3, TypeScript 5.9.3, ESLint 10.12.0, Prettier 3.9.10, and Vitest 5.0.3 are pinned. TypeScript stays within the supported range of typescript-eslint 8.71.1. Tooling is shared at the root; React runtime dependencies belong to each application.

See [developer ownership](docs/developer-workflow.md) and [backend configuration](docs/backend-integration.md).
