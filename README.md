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

Milestone 2 adds `@tattoo-ai/config` for validated JSON policy and change-set files, plus `@tattoo-ai/cli` with local `init`, `check`, and `explain` commands.

The core has no LLM, network, filesystem, process, Git, shell, hook, or agent-vendor dependency.

## Status

Milestone 2 provides deterministic JSON loading and a CLI for evaluating caller-supplied normalized change sets. Repository/Git observation, hooks and agent adapters are planned—not implemented.

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

Core consumes JavaScript/TypeScript objects. The M2 configuration layer loads the same policy shape from JSON; YAML and TOML remain future formats.

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

### Local CLI

The CLI does not inspect Git or the repository yet. It evaluates a normalized change-set JSON file supplied by a caller:

```bash
pnpm --filter @tattoo-ai/cli build
node packages/cli/dist/index.js init
node packages/cli/dist/index.js check --changes changes.json
node packages/cli/dist/index.js explain --policy .tattoo/policy.json --changes changes.json --json
```

`init` creates `.tattoo/policy.json` and never overwrites it without `--force`. `check` prints a concise decision; `explain` includes violation metadata. `--json` emits machine-readable evaluation output. Exit codes are `0` for `allow`/`warn`, `1` for `block`, and `2` for usage or configuration/input errors.

## Architecture and security

Core receives normalized observations and decides only from those observations. `@tattoo-ai/config` reads and validates JSON outside core, while the CLI handles files, arguments and output. Future observation adapters remain separate; planned integrations include Claude Code, Codex, Cursor, Gemini CLI, and OpenCode.

Tattoo guarantees deterministic evaluation of the input it receives. It does not sandbox an agent, observe changes by itself, or prevent a broken or bypassed adapter from omitting or falsifying facts. See the [architecture](docs/architecture.md) and [security model](docs/security-model.md).

## Roadmap

Configuration loading and a local CLI are implemented in M2. Enforcement adapters, MCP/workflow integrations, optional natural-language rule authoring, and empirical benchmarks remain planned. See the [roadmap](docs/roadmap.md).

## Development

Requires Node 22+ and pnpm 10. Run `pnpm install --frozen-lockfile` followed by `pnpm check`.

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup and test expectations, and [SECURITY.md](SECURITY.md) for private vulnerability reporting.

## License

MIT. See [LICENSE](LICENSE).
