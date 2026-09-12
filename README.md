# Tattoo

> Agents forget. Tattoos don't.

Tattoo is a small, local-first policy engine for AI coding agents. It turns important project rules into deterministic `allow`, `warn`, or `block` decisions that can be reviewed, tested, and reused across agent tools.

An instruction in `AGENTS.md` or `CLAUDE.md` is useful context, but it is still something an agent can forget or interpret differently. Tattoo gives the important constraints a separate, machine-checkable home.

## What Tattoo does

Tattoo evaluates facts about a proposed change:

- which files are being added, modified, deleted, or renamed;
- which production or development dependencies changed;
- how many files and lines changed.

It then applies the rules in `.tattoo/policy.json` and returns a stable result. The core evaluator does not call a model, access the network, inspect Git, or run shell commands.

Tattoo is a guardrail, not a replacement for an agent and not a security sandbox. An integration must observe the agent action and pass accurate facts to Tattoo. If an agent bypasses the integration, Tattoo cannot see that action.

## Packages

The repository contains five small packages:

| Package                  | Purpose                                                     |
| ------------------------ | ----------------------------------------------------------- |
| `@tattoo-ai/core`        | Pure deterministic policy evaluation                        |
| `@tattoo-ai/config`      | JSON policy and change-set loading with validation          |
| `@tattoo-ai/cli`         | Local `init`, `add`, `check`, and `explain` commands        |
| `@tattoo-ai/claude-code` | Claude Code `PreToolUse` enforcement for `Write` and `Edit` |
| `@tattoo-ai/mcp`         | Local stdio MCP server exposing `tattoo_check`              |

The first release is `v0.1.0`. All packages require Node.js 22 or newer.

## Quick start

Install the CLI in the project where you want to keep a policy:

```bash
npm install --save-dev @tattoo-ai/cli
```

Create a policy and add a rule:

```bash
npx tattoo init
npx tattoo add "never add a new dependency"
```

Tattoo checks normalized change-set JSON supplied by an integration or script:

```bash
npx tattoo check --changes changes.json
```

Use `--json` for automation and `explain` when you want the violation metadata:

```bash
npx tattoo check --changes changes.json --json
npx tattoo explain --changes changes.json --json
```

Exit codes are simple:

- `0`: allowed or warning-only result;
- `1`: at least one blocking rule was violated;
- `2`: invalid arguments, policy, or change-set input.

## The basic flow

Every integration follows the same shape:

```text
agent tool call
      |
      v
integration observes the action
      |
      v
normalized ChangeSet
      |
      v
@tattoo-ai/core evaluates policy
      |
      v
allow / warn / block
```

The core is deliberately independent of Claude, OpenAI, GitHub, MCP, and other agent vendors. Adapters translate a vendor's hook payload into the common `ChangeSet` shape and translate the result back into that vendor's response format.

## Writing a policy

The policy is a JSON file at `.tattoo/policy.json` by default. A minimal policy looks like this:

```json
{
  "rules": [
    {
      "id": "protect-migrations",
      "type": "path-deny",
      "patterns": ["migrations/**"]
    },
    {
      "id": "no-production-dependencies",
      "type": "dependency-guard",
      "forbid": ["new-production"]
    },
    {
      "id": "small-diff",
      "type": "diff-budget",
      "maxChangedFiles": 5,
      "maxAddedLines": 200,
      "maxDeletedLines": 100
    }
  ]
}
```

Supported rule types:

- `path-deny`: blocks or warns when a changed path matches one of the patterns;
- `path-allow-only`: restricts changes to an allowed set of patterns;
- `dependency-guard`: detects new, removed, or version-changed dependencies;
- `diff-budget`: limits changed files, added lines, and deleted lines.

Rules block by default. Set `"effect": "warn"` for an advisory rule. A blocking violation always wins over warnings. Results and violations are sorted deterministically, so the same policy and input produce the same output.

Paths are repository-relative. Tattoo normalizes separators and rejects absolute paths and traversal outside the repository root.

## Natural-language rule authoring

`tattoo add` is intentionally bounded. It recognizes these exact rule phrases, ignoring case and repeated whitespace:

```bash
npx tattoo add "never add a new dependency"
npx tattoo add "never delete an existing test"
npx tattoo add "only modify src/auth/**"
npx tattoo add "don't touch database migrations"
```

The command compiles the phrase into a normal, reviewable JSON rule. It does not call an LLM or guess what unsupported wording means. Unsupported phrases are rejected instead of silently creating a policy that looks right but does something else.

## Change-set input

The CLI and MCP server accept the same normalized input. For example:

```json
{
  "files": [
    {
      "operation": "modify",
      "path": "src/auth/login.ts",
      "addedLines": 12,
      "deletedLines": 3
    }
  ],
  "dependencies": {
    "before": {
      "production": {
        "react": "18.3.1"
      }
    },
    "after": {
      "production": {
        "react": "18.3.1",
        "zod": "4.6.2"
      }
    }
  }
}
```

A file change uses one of `add`, `modify`, `delete`, or `rename`. A rename includes both `path` and `previousPath`. Dependency snapshots use separate `production` and `development` maps.

## Claude Code

Tattoo provides a Claude Code `PreToolUse` command hook for `Write` and `Edit`. It runs before the file operation, loads the policy, maps the absolute target path to a repository-relative path, and returns Claude's permission response.

Install the adapter in the project:

```bash
npm install --save-dev @tattoo-ai/claude-code
```

Add this to the project's `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "npx --no-install tattoo-claude-hook --root \"$CLAUDE_PROJECT_DIR\""
          }
        ]
      }
    ]
  }
}
```

The adapter maps decisions as follows:

- `block` becomes Claude's `deny` response;
- `warn` becomes Claude's `ask` response;
- `allow` produces no hook output, leaving the normal Claude permission flow in place.

Malformed input, an invalid policy, an outside-root path, or unreadable file state fails closed with exit code `2`.

This adapter deliberately covers only `Write` and `Edit`. It does not automatically observe changes made through Bash, Git, deletes, renames, dependency installation, or another tool.

## MCP hosts: Claude, Codex, Copilot, and others

Tattoo also provides a local stdio MCP server. MCP is the most portable way to expose the evaluator to hosts that support MCP, including Claude Code, Codex, GitHub Copilot, VS Code, Cursor, and custom clients.

Install it in the project:

```bash
npm install --save-dev @tattoo-ai/mcp
```

The server exposes one read-only tool, `tattoo_check`. It performs the normal policy evaluation over the `changes` object supplied by the host:

```json
{
  "changes": {
    "files": [{ "operation": "modify", "path": "src/auth/login.ts" }]
  }
}
```

For a direct local run:

```bash
npx --no-install tattoo-mcp --root "$PWD"
```

Claude Code uses an MCP server configuration such as:

```json
{
  "mcpServers": {
    "tattoo": {
      "command": "npx",
      "args": [
        "--no-install",
        "tattoo-mcp",
        "--root",
        "/absolute/path/to/repository"
      ]
    }
  }
}
```

Codex uses the same server through its MCP configuration. The server entry is written in Codex's TOML format:

```toml
[mcp_servers.tattoo]
command = "npx"
args = ["--no-install", "tattoo-mcp", "--root", "/absolute/path/to/repository"]
```

MCP support means the host can ask Tattoo to evaluate a change set. It does not automatically give Tattoo permission to observe or block every native tool call. Native enforcement still depends on an adapter or hook for that host.

## Codex and GitHub Copilot support

The common core is vendor-independent, but native hook payloads are not identical between products.

| Host                           | Available in `v0.1.0` | What it means                                                                                                                |
| ------------------------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Claude Code                    | Yes                   | Native `Write`/`Edit` `PreToolUse` enforcement                                                                               |
| Codex CLI                      | MCP workflow check    | `tattoo_check` can be registered as an MCP server; a native Codex `apply_patch`/Bash enforcement adapter is not included yet |
| GitHub Copilot CLI/cloud agent | MCP workflow check    | Copilot can use the MCP server; a complete native camelCase hook adapter is not included yet                                 |
| Other MCP hosts                | MCP workflow check    | Any host that supports local stdio MCP can discover and call `tattoo_check`                                                  |

This distinction is intentional. Tattoo does not claim universal enforcement when an agent can make changes through a tool that the integration does not observe.

## Web search and network tools

Web search belongs to the agent or model platform, not to Tattoo. For example, Codex can expose a hosted web-search tool, and Claude and Copilot have their own web or fetch tools. Tattoo's local evaluator does not inspect the content of those hosted calls.

If web access needs to be restricted, configure the vendor's own URL, network, sandbox, or tool allow-list controls. Use Tattoo for deterministic project-change rules such as protected paths, dependency changes, and diff budgets.

## Using the core from TypeScript

The core package is useful when an integration already has a normalized change set:

```bash
npm install @tattoo-ai/core
```

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
  {
    files: [{ operation: 'delete', path: 'src/core.test.ts' }],
  },
);

console.log(result.decision); // block
console.log(result.violations);
```

The evaluator never mutates the policy or the change set. Invalid policy and change-set data are configuration errors, not policy decisions.

## Security boundary

Tattoo is designed to be transparent and easy to audit:

- the core has no LLM, network, Git, shell, filesystem, or vendor SDK dependency;
- configuration loading happens outside the core and validates untrusted JSON;
- policy writes from `tattoo add` use a temporary file and atomic rename;
- the Claude Code hook fails closed when its input, policy, path, or file-state checks fail;
- every decision includes structured violations and reasons.

The important limitation is observation. Tattoo can only evaluate what an adapter reports. A Bash command can modify files without going through the Claude `Write`/`Edit` hook, and the read-only MCP tool does not watch the repository. Use normal source control review, CI, sandboxing, and operating-system permissions alongside Tattoo.

## Development

The repository uses a pnpm TypeScript workspace. Install dependencies and run the quality gate:

```bash
pnpm install --frozen-lockfile
pnpm check
```

Useful checks:

```bash
pnpm test
pnpm build
pnpm --silent benchmark
pnpm release:check
```

`pnpm benchmark` runs fixed correctness scenarios before measuring evaluator and Claude adapter overhead. It is not an end-to-end comparison of different agents. `pnpm release:check` audits package metadata and dry-run tarball contents; it does not publish packages or change versions.

## Release

The first GitHub release is [`v0.1.0`](https://github.com/salman0butt/Tattoo/releases/tag/v0.1.0). The project is MIT licensed. See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidance and [SECURITY.md](SECURITY.md) for private vulnerability reports.

## License

MIT. See [LICENSE](LICENSE).
