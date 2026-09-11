# M2 Configuration and CLI Plan

Status: IN PROGRESS

## Goal

Load explicit JSON policy and normalized change-set files at a trust boundary, then provide a local CLI that evaluates them through `@tattoo-ai/core`.

## Design

- `packages/config` owns JSON parsing, file reads, default `.tattoo/policy.json` naming, and actionable configuration errors.
- `packages/cli` owns argument parsing, `init`, `check`, `explain`, output formatting, and process exit codes.
- `packages/core` remains synchronous, deterministic, and free of filesystem/process/config-file access.
- `check` and `explain` require a caller-supplied normalized change-set JSON file; repository/Git observation is deferred.
- JSON is the only M2 file format. YAML/TOML are deferred until a real need justifies a parser dependency.

## Commands

- `tattoo init`: create `.tattoo/policy.json` with an empty rule set; never overwrite without `--force`.
- `tattoo check --changes <path> [--policy <path>]`: evaluate and print a concise result.
- `tattoo explain --changes <path> [--policy <path>]`: evaluate and print detailed human output.
- `--json` selects stable machine-readable output for evaluation commands.

Exit codes are `0` for allow/warn, `1` for block, and `2` for usage or configuration/input errors.

## Verification

Write parser and CLI tests before implementation, run the complete repository quality gate, verify the packed public package imports, and review the final diff for accidental core side effects or undocumented behavior.
