# MCP Workflow Integration Plan

**Goal:** Add one local stdio MCP server that exposes existing Tattoo policy evaluation without duplicating policy logic.

**Architecture:** `@tattoo-ai/mcp` owns MCP transport, tool schema, and startup arguments. It loads JSON with `@tattoo-ai/config` and evaluates normalized change sets with `@tattoo-ai/core`. It has no repository observation or enforcement side effects.

**Tech Stack:** Strict TypeScript, `@modelcontextprotocol/server` 2.0.0, Zod 4, Vitest, and the existing pnpm workspace.

**Spec:** `docs/superpowers/specs/2026-09-12-mcp-workflow-design.md`

## Global constraints

- Expose one read-only `tattoo_check` tool.
- Keep the normalized `ChangeSet` and `EvaluationResult` contracts in core/config.
- Load the policy from server startup options; do not let the model select arbitrary policy files per call.
- Return invalid input/configuration as MCP tool errors; do not emit diagnostics on stdout.
- Use stdio only in this milestone. Do not add HTTP, resources, prompts, or new policy rules.

### Task 1: Package and failing server tests

Create `packages/mcp/package.json`, `tsconfig.json`, and tests. Add the package reference, runtime SDK/Zod dependencies, and client SDK dev dependency. Write tests first for tool discovery, deterministic evaluation, malformed changes, policy errors, and root/policy argument handling.

### Task 2: Minimal MCP implementation

Implement `createMcpServer`, `parseMcpArgs`, and the `tattoo-mcp` executable. Register `tattoo_check` with a narrow object schema, validate the complete change set through `parseChangeSetJson`, load the selected policy, call `evaluatePolicy`, and return JSON text. Serve with the official `serveStdio` entrypoint; log only to stderr.

### Task 3: Documentation, CI, review, and merge

Document the MCP host configuration, tool contract, and non-enforcement boundary. Pack/import the new public package in CI. Run `pnpm check`, the in-memory MCP tests, a packed consumer check, and an executable smoke check. Review the exact PR head, fix findings, merge, wait for post-merge `main` CI, and record final evidence.
