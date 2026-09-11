# Tattoo

> **Agents forget. Tattoos don't.**

Deterministic guardrails for AI coding agents. Tattoo turns explicit project constraints into auditable `allow`, `warn`, or `block` decisions.

Prompt instructions are useful context, but an agent can forget, misread, or rationalize around them. Tattoo evaluates the normalized facts supplied by an integration in code, without asking an LLM to grade its own work.

## What is implemented

Milestone 1 ships `@tattoo-ai/core`, a pure TypeScript policy engine with:

- path deny rules, including add, modify, delete, and rename operations;
- allow-only path scopes and operation-specific protection;
- deterministic production/development dependency-change guards;
- changed-file, added-line, and deleted-line budgets;
- runtime policy and input validation;
- stable structured violations and `allow | warn | block` decisions.

The core has no LLM, network, filesystem, process, Git, shell, hook, or agent-vendor dependency.

## Status

Milestone 1 provides path deny and allow-only rules, operation-specific path protection, dependency-change guards, diff budgets, runtime policy validation, deliberate repository-relative path normalization, and deterministic violation ordering. CLI, config-file loading, hooks and agent adapters are planned—not implemented.

## Conceptual flow

```text
AGENTS.md says: "Don't add dependencies."
        |
        v
adapter observes a package change
        |
        v
@tattoo-ai/core compares normalized before/after maps
        |
        v
block + structured violation
```

The runtime flow is:

`adapter-observed facts -> normalized ChangeSet -> @tattoo-ai/core -> EvaluationResult -> adapter enforcement`

Core guarantees deterministic evaluation of the normalized input it receives. It does **not** sandbox an agent. A malicious or broken adapter can omit or falsify observations, and an agent that can bypass the adapter can still change files directly.

## Usage

The package is currently workspace- and tarball-ready, but is not published to npm yet. From a consumer, import the public package entrypoint:

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

### Structured policy example

Core consumes JavaScript/TypeScript objects. Loading YAML, JSON, or TOML files is planned for a future configuration layer.

```ts
const policy = {
  rules: [
    {
      id: 'protect-migrations',
      type: 'path-deny',
      patterns: ['migrations/**'],
    },
    {
      id: 'small-diff',
      type: 'diff-budget',
      maxChangedFiles: 5,
      maxAddedLines: 200,
    },
  ],
};
```

## Architecture and security

Core receives normalized observations and decides only from those observations. Future configuration and agent adapters will sit outside the package. Planned integrations include Claude Code, Codex, Cursor, Gemini CLI, and OpenCode.

Tattoo guarantees deterministic evaluation of the input it receives. It does not sandbox an agent, observe changes by itself, or prevent a broken or bypassed adapter from omitting or falsifying facts. See the [architecture](docs/architecture.md) and [security model](docs/security-model.md).

## Roadmap

Configuration loading and a CLI are next, followed by enforcement adapters, MCP/workflow integrations, optional natural-language rule authoring, and empirical benchmarks. See the [roadmap](docs/roadmap.md); these features are not implemented in M1.

## Development

Requires Node 22+ and pnpm 10. Run `pnpm install --frozen-lockfile` followed by `pnpm check`.

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup and test expectations, and [SECURITY.md](SECURITY.md) for private vulnerability reporting.

## License

MIT. See [LICENSE](LICENSE).
