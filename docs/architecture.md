# Architecture

Tattoo separates observation from policy. Future adapters observe agent/tool activity and construct normalized `ChangeSet` objects. `@tattoo-ai/config` loads and validates JSON policy and change-set files, while `@tattoo-ai/core` evaluates rules synchronously and returns stable structured violations and a final decision.

M1 core remains deliberately pure with respect to external systems: no file or config loading, Git inspection, shell/process execution, network access, LLM calls, hooks, telemetry, or vendor SDKs. M2 file access is confined to the configuration and CLI packages. M3 adds a narrow Claude Code adapter outside core.

```text
                   .tattoo policy
                         |
                         v
                @tattoo-ai/config
                 JSON trust boundary
                         |
                         v
                  @tattoo-ai/core
                deterministic engine
                         |
              +----------+----------+
              |                     |
          decision              violations
              |                     |
              +----------+----------+
                         |
                   @tattoo-ai/cli
                local output + exit code
                         |
                @tattoo-ai/claude-code
                 PreToolUse adapter
                         |
                    Claude Code

  Future adapters remain separate: Codex, Cursor, Gemini CLI, OpenCode
```

M2 implements the JSON configuration layer and local CLI. M3 adds a Claude Code adapter that reads `PreToolUse` JSON, observes `Write` and `Edit` file targets, and translates core decisions into Claude Code hook responses. Repository and Git observation outside those tool calls remain future adapter responsibilities.

## Rule model

- `path-deny`: violation when an applicable path matches any glob.
- `path-allow-only`: violation when an applicable path does not match the allowed globs.
- operation filters apply to add/modify/delete/rename; renames evaluate both old and new paths.
- `dependency-guard`: compares normalized before/after production and development maps and classifies additions, removals and version changes.
- `diff-budget`: checks changed-file, added-line and deleted-line maxima; equality is allowed.

Violations sort by rule ID, resource and reason. Any block violation yields `block`; warning-only violations yield `warn`; no violations yields `allow`.

## Paths

Core converts backslashes to `/`, removes `.` and repeated separators, resolves internal `..`, and rejects absolute paths or traversal above the repository root. Paths are repository-relative logical paths; adapters are responsible for establishing that relationship from real filesystem observations.
