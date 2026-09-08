# AGENTS.md

## Product boundary

Tattoo core is a local-first deterministic policy evaluator. Keep `packages/core` vendor/model independent and free of network, filesystem, process, Git, shell, config-file and LLM access.

## Engineering rules

- Follow `docs/AUTONOMOUS-DEVELOPMENT.md`.
- Use strict TypeScript and small justified dependencies.
- Add behavior with meaningful failing tests first; preserve RED/GREEN evidence honestly.
- Configuration failures are errors; policy violations are structured decisions.
- Never mutate caller input. Keep output deterministic.
- Document trust boundaries without claiming sandboxing or universal bypass prevention.
- `pnpm check` must remain a real quality gate.

## M1 scope

Implement only deterministic core and repository foundation. CLI, config loaders, adapters, MCP, NL rule compilation, cloud features, publication and releases are deferred.
