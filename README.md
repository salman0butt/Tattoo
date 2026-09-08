# Tattoo

> **Agents forget. Tattoos don't.**

Tattoo is a local-first deterministic policy engine for AI coding-agent constraints. Milestone 1 implements only `@tattoo-ai/core`: structured facts go in, an auditable `allow`, `warn`, or `block` decision comes out. Core makes no LLM, network, filesystem, process, Git, shell, or agent-vendor calls.

## Status

Milestone 1 provides path deny and allow-only rules, operation-specific path protection, dependency-change guards, diff budgets, runtime policy validation, deliberate repository-relative path normalization, and deterministic violation ordering. CLI, config-file loading, hooks and agent adapters are planned—not implemented.

## Conceptual flow

`adapter-observed facts -> normalized ChangeSet -> @tattoo-ai/core -> EvaluationResult -> adapter enforcement`

Core guarantees deterministic evaluation of the normalized input it receives. It does **not** sandbox an agent. A malicious or broken adapter can omit or falsify observations, and an agent that can bypass the adapter can still change files directly.

## Usage

```ts
import { evaluatePolicy } from '@tattoo-ai/core';

const result = evaluatePolicy(
  {
    rules: [
      {
        id: 'protect-tests',
        type: 'path-deny',
        patterns: ['**/*.test.ts'],
        operations: ['delete'],
      },
    ],
  },
  { files: [{ operation: 'delete', path: 'src/core.test.ts' }] },
);

console.log(result.decision); // block
```

Rules default to `block`; set `effect: 'warn'` for advisory violations. Any block wins over warnings. Configuration errors throw `PolicyConfigurationError` rather than masquerading as policy decisions.

`Mode` includes `chill | normal | strict | prison` as product vocabulary, but M1 intentionally gives modes no implicit semantics. Explicit rules remain the complete source of policy behavior.

## Architecture and security

See [architecture](docs/architecture.md), [security model](docs/security-model.md), and [roadmap](docs/roadmap.md). The core accepts structured JS/TS objects; it does not load YAML/TOML/JSON files.

## Development

Requires Node 22+ and pnpm 10. Run `pnpm install --frozen-lockfile` followed by `pnpm check`.

Contributions are welcome; read [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE).
