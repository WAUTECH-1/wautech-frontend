# wautech-frontend

Frontend application for WAUTECH Intelligence Platform

The repository contains independent developer applications and the integrated unified web application.

## Requirements and installation

Use Node.js 24.19.0 (supported LTS line) and npm 11.6.2. Node versions are recorded in `.nvmrc` and `.node-version`; dependency versions are exact and the root lockfile is authoritative.

```sh
npm ci
```

Run npm from the repository root. Do not create per-workspace lockfiles. `npm run install:dependencies` also runs `npm ci`. After an intentional dependency change, run `npm install` and submit the root manifests and lockfile for shared review.

## Structure

```text
apps/web/                 Unified production application (@wautech/web)
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
| Web app   | `npm run dev:web`     | 5176 | `npm run dev --workspace=@wautech/web`   |

Run each command in a separate terminal. All development servers use `strictPort: true` and fail if their assigned port is occupied. Applications also support `npm run build --workspace=@wautech/<name>` and `npm test --workspace=@wautech/<name>`. Commands can also be run inside the application directory. Preview ports are 4173, 4174, 4175 and 4176 respectively, also strict. The default `npm run dev` starts the unified web application on port 5176.

## Validation

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run format:check
npm run verify:dev
```

`npm run check` runs lint, TypeScript, tests, formatting and builds in sequence. Root workspace patterns `apps/*`, `workspaces/*` and `packages/*` automatically include `apps/web` in TypeScript, tests and builds. Builds produce a separate `dist/` inside each application. CI uses `npm ci` and the same repository-level checks on pushes and pull requests, including formatting. Local execution does not establish a GitHub CI result.

React 19.3.0, Vite 8.3.4, Tailwind CSS 4.3.3, TypeScript 5.9.3, ESLint 10.12.0, Prettier 3.9.10, and Vitest 5.0.3 are pinned. TypeScript stays within the supported range of typescript-eslint 8.71.1. Tooling is shared at the root; React runtime dependencies belong to each application.

See [developer ownership](docs/developer-workflow.md) and [backend configuration](docs/backend-integration.md).
