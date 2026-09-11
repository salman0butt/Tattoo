# Claude Code Adapter Implementation Plan

**Goal:** Add one tested Claude Code `PreToolUse` adapter for `Write` and `Edit` that delegates policy decisions to the existing core engine.

**Architecture:** `@tattoo-ai/claude-code` owns Claude hook input validation, absolute-to-relative path translation, file-existence classification for `Write`, and Claude JSON/exit-code mapping. It reuses `@tattoo-ai/config` for policy loading and `@tattoo-ai/core` for evaluation; no adapter logic enters core.

**Tech Stack:** Strict TypeScript, Node.js `fs/promises` and `path`, Vitest, pnpm workspace packages.

**Spec:** `docs/superpowers/specs/2026-09-11-claude-code-adapter-design.md`

## Global Constraints

- Support only `PreToolUse` `Write` and `Edit` calls.
- Treat `block` as Claude `permissionDecision: "deny"`, `warn` as `"ask"`, and `allow` as no output.
- Fail closed with exit code 2 for malformed input, policy errors, file-state errors, and root escapes.
- Keep core and config vendor-independent and keep all path decisions deterministic.
- Document unsupported Bash/Git, delete, rename, and bypass cases.

### Task 1: Adapter package and pure translation

**Files:**

- Create: `packages/claude-code/package.json`
- Create: `packages/claude-code/tsconfig.json`
- Create: `packages/claude-code/src/index.test.ts`
- Create: `packages/claude-code/src/index.ts`
- Modify: `tsconfig.json`, `pnpm-lock.yaml`

**Interfaces:**

- Consumes: `Policy`, `FileOperation`, and `evaluatePolicy` from `@tattoo-ai/core`.
- Produces: `parseHookInput(value: unknown)`, `evaluatePreToolUse(input, policy, repositoryRoot, operation)`, and `ClaudeHookOutput` for the executable task.

- [ ] **Step 1: Write the failing test**

  Add tests that assert `Write`/`Edit` input becomes a relative `ChangeSet`, a denied file returns Claude `deny` JSON, a warning returns `ask`, an allowed file returns no output, unsupported tools return no output, and a path outside the root throws an adapter error.

- [ ] **Step 2: Run the focused test**

  Run `pnpm exec vitest run packages/claude-code/src/index.test.ts`.

  Expected result: FAIL because the package entrypoint and adapter functions do not exist.

- [ ] **Step 3: Write the minimal implementation**

  Define the validated hook input and output types. Validate `hook_event_name`, `tool_name`, `tool_input`, and absolute `file_path`; use `path.relative(repositoryRoot, filePath)` and reject `..`/absolute results; call `evaluatePolicy` with one file change; map only `block` and `warn` to `hookSpecificOutput`.

- [ ] **Step 4: Run focused tests to verify green**

  Run `pnpm exec vitest run packages/claude-code/src/index.test.ts` and require every adapter test to pass.

- [ ] **Step 5: Commit**

  Run `git add packages/claude-code tsconfig.json pnpm-lock.yaml && git commit -m "feat(m3): add Claude Code adapter translation"`.

### Task 2: Hook executable and fail-closed file boundary

**Files:**

- Modify: `packages/claude-code/src/index.test.ts`
- Modify: `packages/claude-code/src/index.ts`

**Interfaces:**

- Consumes: pure adapter function from Task 1 and `loadPolicyFile` from `@tattoo-ai/config`.
- Produces: `runClaudeHook(inputText, options)` and the `tattoo-claude-hook` executable.

- [ ] **Step 1: Write the failing test**

  Add tests for `Write` mapping to `add` when `lstat` returns `ENOENT`, `modify` when it succeeds, `Edit` mapping to `modify`, default and explicit policy/root paths, JSON-only output, exit code 0 for allow/warn, exit code 1 only if the adapter chooses process-level blocking, and exit code 2 for malformed input/config/file errors. The implementation must use exit code 0 with structured deny JSON for normal blocks, matching Claude's current hook contract.

- [ ] **Step 2: Run the focused test**

  Run `pnpm exec vitest run packages/claude-code/src/index.test.ts`.

  Expected result: FAIL for missing executable behavior and file-state classification.

- [ ] **Step 3: Write the minimal implementation**

  Read stdin, select `--root` then `CLAUDE_PROJECT_DIR` then `process.cwd()`, select `--policy` then `<root>/.tattoo/policy.json`, classify `Write` with `lstat`, load policy, call the pure evaluator, print exactly one JSON object for `deny`/`ask`, stay silent for allow/unsupported, and print diagnostics to stderr with exit code 2 on errors.

- [ ] **Step 4: Run focused tests to verify green**

  Run `pnpm exec vitest run packages/claude-code/src/index.test.ts` and require all tests to pass.

- [ ] **Step 5: Commit**

  Run `git add packages/claude-code && git commit -m "feat(m3): add Claude Code hook executable"`.

### Task 3: Documentation, CI, and final verification

**Files:**

- Modify: `README.md`, `docs/architecture.md`, `docs/security-model.md`, `docs/roadmap.md`, `docs/progress/STATUS.md`, `CHANGELOG.md`, `.github/workflows/ci.yml`

- [ ] **Step 1: Document the real integration**

  Add the `PreToolUse` settings JSON snippet using the adapter binary, describe the root/policy options, and list exactly what the adapter cannot observe or prevent.

- [ ] **Step 2: Extend CI package checks**

  Pack `@tattoo-ai/claude-code` with the existing packages and import its public entrypoint in the clean consumer check.

- [ ] **Step 3: Run the complete quality gate**

  Run `pnpm check`, `git diff --check`, and the CI-style packed consumer import. Require formatting, lint, typecheck, all tests, build, and clean status to pass.

- [ ] **Step 4: Review and commit**

  Inspect the full diff for unsupported-enforcement claims, then commit documentation/CI changes with `git add ... && git commit -m "docs(m3): document Claude Code enforcement boundary"`.

- [ ] **Step 5: Push, review, and merge**

  Push the branch, wait for exact-head Node 22/24 CI, inspect review findings, fix all Critical/Important findings, merge the PR, wait for post-merge `main` CI, and update the progress ledger with final SHA/run evidence.
