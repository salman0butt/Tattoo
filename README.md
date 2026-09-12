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

Milestone 3 adds `@tattoo-ai/claude-code`, a fail-closed Claude Code `PreToolUse` adapter for `Write` and `Edit` file calls.

Milestone 4 adds `@tattoo-ai/mcp`, a local stdio MCP server with one read-only `tattoo_check` workflow tool.

Milestone 5 adds bounded natural-language rule authoring to the CLI. It accepts four documented phrases and writes the corresponding structured rule; unsupported wording is rejected.

Milestone 6 adds a reproducible evaluator benchmark harness and an audit-only release-readiness check for the public packages. Packages are not published yet.

The core has no LLM, network, filesystem, process, Git, shell, hook, or agent-vendor dependency.

## Status

Milestone 4 is the first workflow integration. Its `tattoo_check` tool accepts a normalized change set, loads the configured policy, and returns the deterministic core result as JSON text. It does not observe or block agent actions. M3 remains the only enforcement adapter; it observes the absolute target path in Claude Code `Write` and `Edit` calls and maps it to a repository-relative `add` or `modify` change.

M5 adds a bounded authoring convenience: `tattoo add` converts four documented phrases into reviewable structured rules. It rejects unsupported wording and does not call a model or enforce changes by itself.

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
node packages/cli/dist/index.js add "never add a new dependency"
node packages/cli/dist/index.js check --changes changes.json
node packages/cli/dist/index.js explain --policy .tattoo/policy.json --changes changes.json --json
```

`init` creates `.tattoo/policy.json` and never overwrites it without `--force`. `check` prints a concise decision; `explain` includes violation metadata. `--json` emits machine-readable evaluation output. Exit codes are `0` for `allow`/`warn`, `1` for `block`, and `2` for usage or configuration/input errors.

`add` appends one generated rule to an existing policy. The supported phrases are `never add a new dependency`, `never delete an existing test`, `only modify src/auth/**`, and `don't touch database migrations`. Matching is case-insensitive with repeated whitespace normalized, but arbitrary or unsupported wording is rejected rather than guessed. Review or edit the generated JSON before relying on it.

### Claude Code hook

Build the adapter and register it as a `PreToolUse` command hook:

```bash
pnpm --filter @tattoo-ai/claude-code build
```

In Claude Code project settings, use the repository checkout's executable:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PROJECT_DIR}/packages/claude-code/dist/index.js\""
          }
        ]
      }
    ]
  }
}
```

The adapter reads `${CLAUDE_PROJECT_DIR}/.tattoo/policy.json` by default. Use `--root <path>` and `--policy <path>` to override the repository root or policy path. `Write` targets are classified as `add` when they do not exist and `modify` when they do; `Edit` targets are `modify`. A `block` becomes Claude's `deny` decision, a `warn` becomes `ask`, and an `allow` emits no response. Malformed input, invalid policy, outside-root paths, and unreadable file state fail closed with exit code `2` and stderr output.

### MCP workflow server

Build and run the local stdio server:

```bash
pnpm --filter @tattoo-ai/mcp build
node packages/mcp/dist/index.js --root "$PWD"
```

Register the command in an MCP host that supports stdio servers:

```json
{
  "mcpServers": {
    "tattoo": {
      "command": "node",
      "args": [
        "/absolute/path/to/Tattoo/packages/mcp/dist/index.js",
        "--root",
        "/absolute/path/to/repository"
      ]
    }
  }
}
```

The server loads `/absolute/path/to/repository/.tattoo/policy.json` by default; `--policy <path>` overrides it. Call `tattoo_check` with a normalized change set such as `{ "changes": { "files": [{ "operation": "modify", "path": "src/index.ts" }] } }`. The tool returns the existing `allow`, `warn`, or `block` result as JSON text. This is a workflow check over caller-supplied facts, not repository observation or agent enforcement. Stdio protocol output stays on stdout; diagnostics go to stderr.

## Architecture and security

Core receives normalized observations and decides only from those observations. `@tattoo-ai/config` reads and validates JSON outside core, while the CLI handles files, arguments and output. The Claude Code adapter handles only `PreToolUse` `Write` and `Edit`; Bash/Git changes, deletes, renames, dependency observation, and other vendors remain outside this milestone.

Tattoo guarantees deterministic evaluation of the input it receives. It does not sandbox an agent, observe changes by itself, or prevent a broken or bypassed adapter from omitting or falsifying facts. See the [architecture](docs/architecture.md) and [security model](docs/security-model.md).

## Roadmap

Configuration loading and a local CLI are implemented in M2. The first Claude Code enforcement adapter is implemented in M3, the first local MCP workflow tool is implemented in M4, bounded natural-language rule authoring is implemented in M5, and evaluator benchmarks/release auditing are implemented in M6. Additional adapters, broader language understanding, end-to-end agent benchmarks, and package publication remain planned. See the [roadmap](docs/roadmap.md).

## Development

Requires Node 22+ and pnpm 10. Run `pnpm install --frozen-lockfile` followed by `pnpm check`. Run `pnpm --silent benchmark` for machine-readable fixed evaluator measurements and `pnpm release:check` for the package audit; both commands build first and do not publish or change versions.

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup and test expectations, and [SECURITY.md](SECURITY.md) for private vulnerability reporting.

## License

MIT. See [LICENSE](LICENSE).
