# Cleanup Legacy Refactor Leftovers Implementation Plan

**Goal:** Remove unused root-level files and directories left behind by the monorepo refactor so the repository cleanly reflects the active `apps/` and `packages/` structure.

**Current state:**
- Active code lives in:
  - `apps/express-api/`
  - `packages/ompdf/`
- Root `tsconfig.json` references only those two projects.
- Root `package.json` runs only Turbo workspace tasks.

---

## High-confidence cleanup targets

### Generated / stale artifacts
These appear safe to remove because they are build or test outputs from the old pre-monorepo layout:

- `dist/`
- `coverage/`

### Legacy refactor leftovers
These appear to be old root-level implementation/config files no longer used by the workspace setup:

- `scripts/copy-assets.mjs`
- `examples/` (empty leftover root directory)
- `jest.config.js`
- `test/`
- `src/`

---

## Why these look unused

### Workspace wiring now points elsewhere
- `tsconfig.json` references only:
  - `./packages/ompdf`
  - `./apps/express-api`
- `apps/express-api/tsconfig.json` resolves `ompdf` from:
  - `../../packages/ompdf/src/index.ts`
- Package-local build/test configs exist under:
  - `packages/ompdf/`
  - `apps/express-api/`

### Root-level leftovers are no longer in the active flow
- Root `package.json` uses Turbo only.
- Root `jest.config.js` targets the old root `src/` + `test/` layout.
- Active examples are now under `packages/ompdf/examples/`.
- Active copy-assets script is now under `packages/ompdf/scripts/copy-assets.mjs`.

---

## Cleanup steps

### 1. Reconfirm references before deletion
Run a final reference search for these paths before removing them:
- `scripts/copy-assets.mjs`
- `jest.config.js`
- `src/`
- `test/`
- `examples/`

### 2. Remove generated stale outputs
Delete:
- `dist/`
- `coverage/`

### 3. Remove stale root refactor leftovers
Delete:
- `scripts/copy-assets.mjs`
- `examples/`
- `jest.config.js`
- `test/`
- `src/`

### 4. Validate repository after cleanup
Run:

```bash
corepack pnpm build
corepack pnpm typecheck
corepack pnpm test
```

### 5. Final verification
Run one more stale-reference search to confirm no active code/config still points to removed root-level leftovers.

---

## Expected outcome

After cleanup, the repository should:
- contain only active monorepo code paths under `apps/` and `packages/`
- no longer expose misleading root `src/`, `test/`, or `jest.config.js`
- no longer keep stale root build/test output directories
- still pass workspace build, typecheck, and test validation

---

## Scope guardrails

This cleanup plan **does remove**:
- legacy root implementation leftovers
- stale root test/config leftovers
- generated output directories

This cleanup plan **does not remove**:
- archived historical plan docs under `docs/plans/`
- active workspace package/app files
- current package-local test/build configs
