# Natural-Language Rule Authoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bounded deterministic phrase compiler and a `tattoo add` command that appends its structured rule to an existing policy.

**Architecture:** Keep the compiler as a pure module in the existing CLI package because it has one consumer and only returns existing `@tattoo-ai/core` rule values. The CLI loads and validates policy files through `@tattoo-ai/config`, appends one rule, and writes JSON; core remains unchanged and model/vendor independent.

**Tech Stack:** TypeScript, Node.js standard filesystem APIs, Vitest, existing `@tattoo-ai/core`, `@tattoo-ai/config`, and pnpm workspace tooling.

**Spec:** `docs/superpowers/specs/2026-09-12-natural-language-authoring-design.md`

## Global Constraints

- Exact normalized phrase matching only; unsupported wording is rejected.
- No LLM, provider, network, repository observation, or new dependency.
- Generated rules use existing core rule types and remain editable JSON.
- `pnpm check` must remain green and the installed `tattoo` executable must be smoke-tested.

---

### Task 1: Advance durable milestone records

**Files:**

- Modify: `AGENTS.md`
- Modify: `docs/progress/STATUS.md`
- Modify: `docs/roadmap.md`
- Create: `docs/superpowers/specs/2026-09-12-natural-language-authoring-design.md`
- Create: `docs/superpowers/plans/2026-09-12-natural-language-authoring.md`

- [x] Record M5 as explicitly authorized and in progress, with the bounded scope in the spec and roadmap.

### Task 2: Add the compiler test first

**Files:**

- Create: `packages/cli/src/authoring.test.ts`
- Create: `packages/cli/src/authoring.ts`

**Interfaces:**

- Produces `compileRuleText(text: string): Rule` and `UnsupportedRuleTextError` for the CLI.

- [x] **Step 1: Write the failing test** for the four exact mappings, normalization, and unsupported text rejection in `authoring.test.ts`.
- [x] **Step 2: Run `pnpm --filter @tattoo-ai/cli test -- authoring.test.ts` and confirm it fails because the compiler is not implemented.
- [x] **Step 3: Implement the exact-match compiler in `authoring.ts` with a four-entry mapping and input normalization.
- [x] **Step 4: Re-run the focused test and confirm it passes.

### Task 3: Add the CLI command test first

**Files:**

- Modify: `packages/cli/src/index.test.ts`

- [x] **Step 1: Add tests for `add --json`, appending a rule, unsupported text, and duplicate generated ids.
- [x] **Step 2: Run the CLI tests and confirm the new tests fail because `add` is not parsed.

### Task 4: Implement `tattoo add`

**Files:**

- Modify: `packages/cli/src/index.ts`

- [x] **Step 1: Extend argument parsing with `add`, phrase words, `--policy`, and `--json`; reject missing phrases and invalid options.
- [x] **Step 2: Load the policy, compile one rule, reject duplicate ids, append without mutating the loaded object, and write formatted JSON.
- [x] **Step 3: Fix the CLI direct-entry check to resolve the installed bin symlink before comparing module URLs.
- [x] **Step 4: Run focused CLI tests and confirm they pass.

### Task 5: Document and verify the public workflow

**Files:**

- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `.github/workflows/ci.yml`

- [x] **Step 1: Document only the four supported phrases, the reviewable JSON result, and rejection boundary.
- [x] **Step 2: Pack the public packages and add an installed `tattoo add` smoke test to CI.
- [x] **Step 3: Run `pnpm check`, package smoke tests, and `git diff --check`.

### Task 6: Review, merge, and record completion

**Files:**

- Modify: `docs/progress/STATUS.md`
- Modify: `AGENTS.md`
- Modify: `docs/roadmap.md`

- [ ] **Step 1: Request skeptical review of the exact PR head and fix Critical/Important findings.
- [ ] **Step 2: Push the branch, wait for exact-head CI, and merge only with green checks and no unresolved Important findings.
- [ ] **Step 3: Verify post-merge `main` CI, update durable records with exact SHA/run, and confirm a clean worktree.
