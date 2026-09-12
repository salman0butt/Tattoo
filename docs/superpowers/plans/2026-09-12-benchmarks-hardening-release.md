# Benchmarks, Hardening, and First Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reproducible evaluator benchmarks and an audit-only release-readiness check for Tattoo's five public packages.

**Architecture:** Keep benchmark and release logic in root developer scripts using only Node's standard library. The benchmark imports built public entrypoints and asserts fixed behavior before timing; the release check reads package manifests and asks npm for dry-run pack metadata. Production package behavior remains unchanged.

**Tech Stack:** Node.js 22+, pnpm 10.15.1, TypeScript build output, Node `assert`, `perf_hooks`, `fs`, and `child_process` standard modules.

**Spec:** `docs/superpowers/specs/2026-09-12-benchmarks-hardening-release-design.md`

## Global Constraints

- No new runtime dependency and no changes to core evaluation semantics.
- Benchmark correctness assertions run before performance timing.
- Do not commit timing baselines or claim end-to-end agent results.
- `release:check` is audit-only; it must not publish, tag, release, or change versions.
- `pnpm check` and both new commands must pass before merge.

---

### Task 1: Advance durable milestone records

**Files:**

- Modify: `AGENTS.md`
- Modify: `docs/progress/STATUS.md`
- Modify: `docs/roadmap.md`
- Create: `docs/superpowers/specs/2026-09-12-benchmarks-hardening-release-design.md`
- Create: `docs/superpowers/plans/2026-09-12-benchmarks-hardening-release.md`

- [x] Record M6 as explicitly authorized and limit it to benchmark/release-readiness work; keep publication and release actions deferred.

### Task 2: Add the benchmark harness

**Files:**

- Create: `benchmarks/run.mjs`
- Modify: `package.json`

**Interfaces:**

- Produces `pnpm benchmark`, which emits JSON measurements and exits nonzero if any expected core/adapter result changes.

- [x] **Step 1: Write the fixed scenarios and expected decisions in `benchmarks/run.mjs` with assertions before the timing loop.
- [x] **Step 2: Run `node benchmarks/run.mjs` and confirm the initial dependency fixture fails before timing; correct the fixture before proceeding.
- [x] **Step 3: Add the minimal fixed warmup/iteration measurement and root `benchmark` script (`pnpm --silent build && node benchmarks/run.mjs`).
- [x] **Step 4: Run `pnpm --silent benchmark` and confirm JSON output plus passing correctness assertions.

### Task 3: Harden public package metadata and add the release audit

**Files:**

- Modify: `packages/core/package.json`
- Modify: `packages/config/package.json`
- Modify: `packages/cli/package.json`
- Modify: `packages/claude-code/package.json`
- Modify: `packages/mcp/package.json`
- Create: `scripts/release-check.mjs`
- Modify: `package.json`

**Interfaces:**

- Produces `pnpm release:check`, an audit-only command that validates package metadata and `npm pack --dry-run --json` files.

- [x] **Step 1: Add `publishConfig.access: public` and the exact repository URL/directory to each public package manifest.
- [x] **Step 2: Write `release-check.mjs` assertions for package identity, aligned versions, MIT license, Node floor, dist exports, public access, repository directory, and packed entrypoints.
- [x] **Step 3: Add the root `release:check` script (`pnpm --silent build && node scripts/release-check.mjs`).
- [x] **Step 4: Run `pnpm release:check` and confirm all five packages pass.

### Task 4: Wire CI and document limits

**Files:**

- Modify: `.github/workflows/ci.yml`
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `docs/security-model.md`
- Modify: `CHANGELOG.md`

- [x] **Step 1: Run benchmark and release audit in both CI Node matrix jobs after `pnpm check`.
- [x] **Step 2: Document commands, scenario coverage, and the fact that measurements are not agent-level effectiveness claims.
- [x] **Step 3: Run the full local gate, benchmark, release audit, and `git diff --check`.

### Task 5: Review, merge, and record completion

**Files:**

- Modify: `docs/progress/STATUS.md`
- Modify: `AGENTS.md`
- Modify: `docs/roadmap.md`
- Modify: `docs/superpowers/plans/2026-09-12-benchmarks-hardening-release.md`

- [x] **Step 1: Request skeptical review of the exact PR head and fix Critical/Important findings.
- [x] **Step 2: Push the branch, wait for exact-head CI, and merge only with green checks and no unresolved Important findings.
- [x] **Step 3: Verify post-merge `main` CI, update durable records with exact SHA/run, and confirm a clean worktree.
