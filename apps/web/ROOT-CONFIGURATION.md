# Root workspace and CI enrollment

Checkpoint A enrolls `apps/web` as `@wautech/web` through root workspace patterns `apps/*`, `workspaces/*` and `packages/*`. The root lockfile is regenerated with npm 11.6.2 to register the app and its workspace link; no framework dependency version change is required.

From the repository root:

```sh
npm ci
npm run dev:web
npm run check
```

`dev:web` delegates to the existing app dev script (strict port 5176). The default dev command and Wajahat/Asad/Umer development scripts are unchanged. Root typecheck/test/build commands use existing `--workspaces` execution, so apps/web now participates automatically. Root ESLint and formatting checks already scan apps/web and need no configuration change.

Root `check` runs lint, TypeScript, tests, formatting and production builds. The existing frontend CI workflow runs npm ci and these same repository-level checks, including the added formatting check. No deployment infrastructure or application integration is introduced by enrollment.

The app's dependencies remain React/react-dom 19.3.0, shared with the other frontend workspaces. Do not create a separate dependency tree in apps/web; install from the root lockfile. Existing workspace-local npm commands remain available for focused development.
