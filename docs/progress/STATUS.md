# Autonomous Development Status

This file is the durable handoff for fresh autonomous runs. GitHub state remains authoritative; every run must verify this status against branches, PRs, reviews, commits, and exact-head CI before writing.

## Current milestone

**M1 — Deterministic Core: IN PROGRESS**

Current branch: `feat/bootstrap-core`
Current PR: #1
Last verified implementation head: `f911594527f3e05c386fb3949c8ce4d4ea299c40`
Last verified CI run: `34233759403` — Node 22 and Node 24 both green, including frozen install, `pnpm check`, and packed-package consumer import.

### M1 completion checklist

- [x] Repository/open-source foundation authored
- [x] pnpm TypeScript monorepo and `@tattoo-ai/core` authored
- [x] Path deny / allow-only / operation filters authored
- [x] Dependency guard authored
- [x] Diff budgets and decision precedence authored
- [x] Runtime policy and normalized `ChangeSet` validation covered by tests
- [x] Deterministic ordering and path normalization covered by tests
- [x] Architecture, security model, roadmap, and Superpowers M1 records authored
- [x] `pnpm-lock.yaml` committed
- [x] Install/format/lint/typecheck/tests/build observed green on the verified implementation head
- [x] Packed-package public import observed green on the verified implementation head
- [x] Skeptical full-diff review completed; two Important findings were fixed and no Critical findings were found
- [ ] Final exact PR-head GitHub Actions green after durable status/roadmap update
- [ ] PR merged to `main`
- [ ] Post-merge `main` CI green and final SHA recorded

### Review findings resolved

1. Core previously validated policy configuration but could accept malformed normalized file/dependency facts when no relevant rule forced access to them. Added test-first validation for invalid operations, rename facts, paths, line metrics, and dependency map values.
2. CI previously imported `packages/core/dist/index.js` directly. It now packs `@tattoo-ai/core`, installs the tarball into a clean consumer directory, and imports the package by its public name.

### Current next action

Verify CI for the exact final PR head containing this durable status update, re-check the complete PR diff and review threads, merge only if every gate remains green, then verify post-merge `main` CI. Do not begin M2.

## Milestone ledger

Detailed scopes are defined in `docs/roadmap.md`.

- **M1 — Deterministic Core:** IN PROGRESS — finish final CI, merge, and post-merge verification only.
- **M2 — Configuration and CLI:** NOT STARTED — do not implement during M1-scoped runs.
- **M3 — Enforcement Adapters:** NOT STARTED — do not implement during M1-scoped runs.
- **M4 — MCP and Workflow Integrations:** NOT STARTED — do not implement during M1-scoped runs.
- **M5 — Natural-Language Rule Authoring:** NOT STARTED — do not implement during M1-scoped runs.
- **M6 — Benchmarks, Hardening, and First Release:** NOT STARTED — do not implement during M1-scoped runs.

## Fresh-run recovery order

1. Read `AGENTS.md`, `docs/AUTONOMOUS-DEVELOPMENT.md`, `docs/roadmap.md`, and this file.
2. Fetch default branch, recent commits, branches, open PRs/issues, review threads, and exact-head CI.
3. Reconcile this file with GitHub. GitHub wins if stale.
4. Priority: broken main → failed CI → unresolved Critical/Important review findings → unfinished current PR/branch → unfinished current milestone task.
5. Update this file whenever durable milestone state materially changes.
6. When M1 is genuinely complete and merged, M1-scoped runs must remain read-only and must not begin M2.
