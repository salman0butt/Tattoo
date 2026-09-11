# AGENTS.md

## Product boundary

Tattoo core is a local-first deterministic policy evaluator. Keep `packages/core` vendor/model independent and free of network, filesystem, process, Git, shell, config-file and LLM access.

## Durable workflow

- GitHub state is the source of truth; recover branches, PRs, issues and CI before writing.
- Read this file, the relevant docs, `docs/roadmap.md`, and `docs/progress/STATUS.md` before coding.
- Never document or imply an unimplemented feature. Update docs when public behavior changes.
- Preserve backward compatibility unless the active milestone explicitly permits a breaking change.

## Engineering rules

- Follow `docs/AUTONOMOUS-DEVELOPMENT.md`.
- Use strict TypeScript and small justified dependencies.
- Add behavior with meaningful failing tests first; preserve RED/GREEN evidence honestly.
- Configuration failures are errors; policy violations are structured decisions.
- Never mutate caller input. Keep output deterministic.
- Document trust boundaries without claiming sandboxing or universal bypass prevention.
- `pnpm check` must remain a real quality gate.
- Run the complete quality gate before claiming completion.
- Never weaken or delete tests, disable checks, or hide failures to get green CI.
- Avoid speculative abstractions, unrelated cleanup, and unnecessary dependencies.
- Document security-sensitive decisions and keep validation at trust boundaries.

## Current milestone: M3 — Claude Code enforcement adapter

M3 implements one Claude Code `PreToolUse` adapter for `Write` and `Edit` calls. Keep `packages/core` and `packages/config` vendor-independent; the adapter may read stdin, the policy file, and target-file metadata. Bash/Git observation, deletes, renames, other vendors, MCP, NL rule compilation, cloud features, publication and releases remain deferred.
