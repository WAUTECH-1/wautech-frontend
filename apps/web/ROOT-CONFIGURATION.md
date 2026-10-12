# Proposed shared configuration changes — approval required

No root files were modified for Sprint 2. The current root `workspaces` list contains only `workspaces/*` and `packages/*`, so apps/web is deliberately not included in root workspace scripts or CI aggregation yet. The existing root dependency tree can run its workspace-local commands.

After explicit approval, the minimal root `package.json` changes are:

```diff
 "workspaces": [
+  "apps/*",
   "workspaces/*",
   "packages/*"
 ],
 "scripts": {
+  "dev:web": "npm run dev --workspace=@wautech/web",
   ...
 }
```

Then regenerate only the necessary `package-lock.json` workspace registration using the specified Node/npm versions (for example, `npm install --package-lock-only`). Review the diff to preserve the existing package resolutions. `apps/web/package.json` declares the same React/react-dom versions already used by all workspaces; it adds no new library. Root `--workspaces` typecheck/test/build aggregation will automatically discover @wautech/web after registration. Root ESLint and Prettier already scan apps/web, so their configuration needs no changes. Changing the default `dev` script is optional and is not requested by this proposal.

Until approved, use `npm --prefix apps/web run dev` and `npm --prefix apps/web run check`. No approval is needed to review or run these local app files. This document is a proposal, not permission to modify shared files.
