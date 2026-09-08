# Autonomous Development Status

This file is the durable handoff for fresh autonomous runs. GitHub state remains authoritative; every run must verify this status against branches, PRs, reviews, commits, and exact-head CI before writing.

## Current milestone

**M1 — Deterministic Core: IN PROGRESS**

Current branch: `feat/bootstrap-core`
Current PR: #1
Last known PR head: `933fd6f407cb2c23b23a4d29be5603e00fed91a2`

### M1 completion checklist

- [x] Repository/open-source foundation authored
- [x] pnpm TypeScript monorepo and `@tattoo-ai/core` authored
- [x] Path deny / allow-only / operation filters authored
- [x] Dependency guard authored
- [x] Diff budgets and decision precedence authored
- [x] Validation, deterministic ordering, path normalization tests authored
- [x] Architecture, security model, roadmap, and Superpowers M1 records authored
- [ ] `pnpm-lock.yaml` committed
- [ ] Install/format/lint/typecheck/tests/build/public-import observed green
- [ ] Skeptical full-diff review completed; all Critical/Important findings resolved
- [ ] Exact PR-head GitHub Actions green
- [ ] PR merged to `main`
- [ ] Post-merge `main` CI green and final SHA recorded

### Last verified blocker

CI run 34213417046 failed before install because `actions/setup-node` cache requires `pnpm-lock.yaml`, which is absent. Do not weaken frozen-lockfile CI. Generate the lockfile from the committed manifests, commit it to the M1 branch, then rerun the full gate.

## Milestone ledger

The detailed product roadmap is `docs/roadmap.md`. This ledger is operational state, not permission to advance scope.

| Milestone               | Status      | Autonomous action                         |
| ----------------------- | ----------- | ----------------------------------------- |
| M1 — Deterministic Core | IN PROGRESS | Finish verification/review/CI/merge only. |
| M2+                     | DEFERRED    | Do not implement during M1-scoped runs.   |

## Fresh-run recovery order

1. Read `AGENTS.md`, `docs/AUTONOMOUS-DEVELOPMENT.md`, `docs/roadmap.md`, and this file.
2. Fetch default branch, recent commits, branches, open PRs/issues, review threads, and exact-head CI.
3. Reconcile this file with GitHub. GitHub wins if stale.
4. Priority: broken main → failed CI → unresolved Critical/Important review findings → unfinished current PR/branch → unfinished current milestone task.
5. Update this file whenever durable milestone state materially changes.
6. When M1 is genuinely complete and merged, mark it COMPLETE with final main SHA and post-merge CI evidence. M1-scoped runs must then remain read-only and must not begin M2.
