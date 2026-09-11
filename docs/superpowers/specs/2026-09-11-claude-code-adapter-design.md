# Claude Code Adapter Design

Status: APPROVED BY THE EXPLICIT AUTONOMOUS M3 ADVANCE

## Goal

Give Claude Code a small, auditable enforcement adapter that evaluates file-edit tool calls through the existing deterministic core before the tool runs.

## Scope

The adapter supports Claude Code's `PreToolUse` event for the `Write` and `Edit` tools. It reads `tool_input.file_path`, requires an absolute path, converts it relative to the configured repository root, and evaluates one `FileChange`:

- `Write` maps to `add` when the target does not exist and `modify` when it exists.
- `Edit` maps to `modify`.
- `block` returns Claude Code `permissionDecision: "deny"`.
- `warn` returns `permissionDecision: "ask"` so the user can decide.
- `allow` and unsupported tools return no decision and exit successfully.

Malformed hook input, policy errors, file-state errors, and paths outside the configured root fail closed with exit code 2 and a diagnostic on stderr.

## Boundaries

`@tattoo-ai/core` remains pure. The adapter may read stdin, `.tattoo/policy.json`, `CLAUDE_PROJECT_DIR`, and target-file metadata. It does not run Git, parse shell commands, inspect dependency changes, observe deletes or renames, or claim to prevent bypass through unsupported tools. A project must configure the hook for the `PreToolUse` event and the `Write|Edit` matcher.

The default root is `--root`, then `CLAUDE_PROJECT_DIR`, then the process working directory. The default policy is `<root>/.tattoo/policy.json`; `--policy` overrides it. The root must be the repository root, not a nested working directory.

## Package shape

Create `@tattoo-ai/claude-code` under `packages/claude-code`. Its pure adapter function accepts validated hook input, a `Policy`, repository root, and resolved `FileOperation`. Its executable reads stdin, loads the policy with `@tattoo-ai/config`, resolves `Write` file existence, and emits only Claude-compatible JSON on stdout.

## Verification

Tests must cover supported tool mapping, add/modify classification, path normalization and root escapes, block/warn/allow output, unsupported-tool silence, malformed input, policy/file errors, and executable exit behavior. CI must pack/import the new public package alongside core, config, and CLI. Documentation must include a settings snippet and the unsupported-observation limitations. Reference: [Claude Code hooks](https://code.claude.com/docs/en/hooks).
