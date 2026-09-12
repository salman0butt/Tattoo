# M6 Benchmarks, Hardening, and First Release Design

## Goal

Make the current local packages measurable and release-auditable without publishing them or claiming agent-level effectiveness.

## Benchmark harness

`pnpm benchmark` builds the workspace and runs `benchmarks/run.mjs`; use `pnpm --silent benchmark` when the JSON output is being piped to another tool. The runner imports the built public entrypoints for `@tattoo-ai/core` and `@tattoo-ai/claude-code`, executes fixed scenarios, asserts their expected decisions/output, then measures each scenario with a fixed warmup and iteration count. It emits JSON containing the Node version, iteration count, scenario names, total milliseconds, and average microseconds.

Scenarios cover an allowed empty change set, a new production dependency block, a protected test deletion block, an allow-only scope block, a diff-budget allow, a Claude `Edit` block, and an unsupported Claude tool that remains allowed. The harness measures deterministic evaluator/adapter behavior and overhead only; it does not run an AI coding agent or claim a with/without-Tattoo violation rate.

No timing baseline is committed because hardware and runner load vary. The assertions are the correctness gate; measurements are for local/CI comparison.

## Release hardening

All five public packages add explicit public scoped-package publishing metadata and repository directory metadata. `pnpm release:check` builds the workspace, validates aligned versions, MIT licensing, Node engine floor, `dist` entrypoints, public publish access, repository locations, and required packed files using `npm pack --dry-run --json`.

The check is audit-only. It does not call `npm publish`, create tags, create GitHub releases, or mutate package versions.

## Non-goals

- No new runtime dependency.
- No benchmark claims about agent behavior, bypass prevention, or productivity.
- No package publication, versioning, tagging, or release creation.
- No changes to deterministic core semantics unless a failing release/benchmark check proves one is required.
