# Developer ownership and coordination

| Developer | Exclusive workspace   |
| --------- | --------------------- |
| Wajahat   | `workspaces/wajahat/` |
| Asad      | `workspaces/asad/`    |
| Umer      | `workspaces/umer/`    |

No developer may modify another developer's workspace. Each developer must work on a separate branch, never directly on `main`. Suggested names are `codex/wajahat/<task>`, `codex/asad/<task>`, and `codex/umer/<task>`; choose a distinct task name for every change.

Before starting, update your local main branch from the approved remote state, create your own branch, run `npm ci`, and start only your assigned application. Asad uses `npm run dev:asad`; Umer uses `npm run dev:umer`. Wajahat uses `npm run dev:wajahat`.

Changes to root configuration, the lockfile, shared tooling, CI, `apps/web/`, or `packages/contracts/` require review and coordination with the team before merging. Do not independently upgrade shared dependencies or add speculative contracts. Ownership is a team policy; Git does not enforce folder boundaries automatically. GitHub branch protection and required reviewers must be configured separately by repository administrators; no GitHub usernames have been assumed.

Before requesting review, run `npm run check` and `npm run format:check`. Commit only source/configuration and the root lockfile; never commit node_modules, build output, local environment values, or secrets. Keep pull requests scoped to your owned directory unless a shared change has been coordinated. Push and merge only with the relevant approval.
