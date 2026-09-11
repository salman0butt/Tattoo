# Autonomous Development Status

This file is the durable handoff for fresh autonomous runs. GitHub state remains authoritative; every run must verify this status against branches, PRs, reviews, commits, and exact-head CI before writing.

## Current milestone

**M2 — Configuration and CLI: IN PROGRESS**

Current branch: `feat/m2-config-cli`
Current PR: none
M1 implementation and dependency maintenance are merged; the latest verified `main` commit is `8e64a6184e1d57d4d84d3dfeb631b065ce70f721`, with post-merge CI run `34628898896` green on Node 22 and Node 24.
M2 scope: deterministic JSON policy/change-set loading plus local `init`, `check`, and `explain` commands. No repository observation or agent adapter is in scope.

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
- [x] Install/format/lint/typecheck/tests/build observed green on final `main`
- [x] Packed-package public import observed green on final `main`
- [x] Skeptical full-diff review completed; five Important findings were fixed and no Critical findings were found
- [x] Final exact PR-head GitHub Actions green
- [x] PR merged to `main`
- [x] Post-merge `main` CI green and final SHA recorded

### Review findings resolved

1. Core previously validated policy configuration but could accept malformed normalized file/dependency facts when no relevant rule forced access to them. Added test-first validation for invalid operations, rename facts, paths, line metrics, and dependency map values.
2. CI previously imported `packages/core/dist/index.js` directly. It now packs `@tattoo-ai/core`, installs the tarball into a clean consumer directory, and imports the package by its public name.
3. Malformed runtime `operations` and `forbid` values now fail with `PolicyConfigurationError` instead of raw `TypeError`.
4. Absolute and drive-qualified paths are rejected instead of being reinterpreted as repository-relative.
5. Violation ordering uses code-point comparison instead of locale-sensitive comparison.

### Current next action

Implement the smallest tested M2 slice, then update this ledger with exact-head PR and post-merge CI evidence.

## Milestone ledger

Detailed scopes are defined in `docs/roadmap.md`.

- **M1 — Deterministic Core:** COMPLETE — merged and verified; do not add M2 work here.
- **M2 — Configuration and CLI:** IN PROGRESS — JSON config/change-set loading and local CLI.
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
6. When a milestone is explicitly advanced, update this ledger before implementation and keep later milestones deferred.
