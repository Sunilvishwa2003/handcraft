# MahabsCrafto Monorepo Cleanup Plan

This document captures the current repository state and a safe migration plan before any moves or deletions.

## Current State

The repository already behaves like a monorepo at the root:

- `frontend/` contains the active Next.js app
- `backend/` contains the active Express.js app
- root `package.json` is a workspace-style launcher for `frontend` and `backend`

At the same time, the repository root still contains a second, older Next.js-style app layout:

- `src/`
- `public/`
- `next.config.ts`
- `next-env.d.ts`
- `tsconfig.json`
- `postcss.config.mjs`
- `eslint.config.mjs`
- `.next/`

These root-level frontend files are legacy duplicates and should not remain long-term, but they should not be deleted until the blockers below are resolved.

## Findings

### Safe To Keep At Root

These are valid repo-root or monorepo-root files:

- `.git/`
- `.github/`
- `frontend/`
- `backend/`
- `package.json`
- `package-lock.json`
- `.gitignore`
- `README.md`
- `render.yaml`
- `DEPLOYMENT.md`
- project docs and logs

### Likely Legacy Frontend Duplicates At Root

These appear to belong to the old root Next.js app rather than the active monorepo frontend:

- `src/`
- `public/`
- `next.config.ts`
- `next-env.d.ts`
- `tsconfig.json`
- `postcss.config.mjs`
- `eslint.config.mjs`
- `.next/`
- root-level frontend logs

### Root `src/` vs `frontend/src/`

`src/` is mostly an older subset of `frontend/src/`.

Root-only files currently found in `src/`:

- `src/app/custom-order/page.tsx`
- `src/lib/notifications.ts`
- `src/lib/test-notifications.ts`

Frontend-only files show that `frontend/src/` is the more complete and actively developed app.

### Root `public/` vs `frontend/public/`

The root `public/` folder is redundant.

- Root `public/` contains only common starter assets
- `frontend/public/` already contains those assets plus the MahabsCrafto-specific assets

This means `frontend/public/` is the real active asset folder.

## Migration Blockers

### 1. `custom-order` route still lives only in the old root app

The active frontend links to `/custom-order`, but the route file currently exists only at:

- `src/app/custom-order/page.tsx`

Before removing the root legacy app, this route must be migrated to:

- `frontend/src/app/custom-order/page.tsx`

### 2. Root notification utilities need a disposition decision

These files exist only in the legacy root app:

- `src/lib/notifications.ts`
- `src/lib/test-notifications.ts`

They appear to be isolated and are not referenced by the active `frontend/src/` app.

Most likely outcomes:

1. Move them into `backend/` if they are still wanted for server-side admin notification workflows.
2. Archive or delete them later if they are no longer used.

Do not delete them until that decision is made.

## Recommended Cleanup Sequence

### Phase 1. Migrate missing active functionality

1. Copy or port `src/app/custom-order/page.tsx` into `frontend/src/app/custom-order/page.tsx`
2. Test the `/custom-order` route from the active frontend
3. Decide whether `src/lib/notifications.ts` should move to `backend/` or be retired

### Phase 2. Verify active frontend is fully self-contained

Confirm the active frontend can run without any root-level app files:

1. `frontend/src/` contains all required routes and components
2. `frontend/public/` contains all required assets
3. `frontend/next.config.ts` is the only Next config needed
4. `frontend/tsconfig.json`, `frontend/postcss.config.mjs`, and `frontend/eslint.config.mjs` are sufficient

### Phase 3. Archive or remove legacy frontend duplicates

After Phase 1 and Phase 2 are complete, the following can likely be archived or deleted:

- root `src/`
- root `public/`
- root `next.config.ts`
- root `next-env.d.ts`
- root `tsconfig.json`
- root `postcss.config.mjs`
- root `eslint.config.mjs`
- root `.next/`

### Phase 4. Keep the monorepo root clean

After cleanup, the repo root should primarily contain:

- `frontend/`
- `backend/`
- repo metadata and docs
- deployment/config files that truly belong at the monorepo root

## Recommended Next Action

The safest next implementation step is:

1. migrate `src/app/custom-order/page.tsx` into `frontend/src/app/custom-order/page.tsx`
2. verify the route works
3. then re-audit the remaining root legacy frontend files

