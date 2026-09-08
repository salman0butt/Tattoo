# Architecture

Tattoo separates observation from policy. Future adapters observe agent/tool activity and construct normalized `ChangeSet` objects. `@tattoo-ai/core` validates an explicit `Policy`, evaluates rules synchronously, and returns stable structured violations and a final decision.

M1 core is deliberately pure with respect to external systems: no file or config loading, Git inspection, shell/process execution, network access, LLM calls, hooks, telemetry, or vendor SDKs.

## Rule model

- `path-deny`: violation when an applicable path matches any glob.
- `path-allow-only`: violation when an applicable path does not match the allowed globs.
- operation filters apply to add/modify/delete/rename; renames evaluate both old and new paths.
- `dependency-guard`: compares normalized before/after production and development maps and classifies additions, removals and version changes.
- `diff-budget`: checks changed-file, added-line and deleted-line maxima; equality is allowed.

Violations sort by rule ID, resource and reason. Any block violation yields `block`; warning-only violations yield `warn`; no violations yields `allow`.

## Paths

Core converts backslashes to `/`, removes `.` and repeated separators, resolves internal `..`, and rejects traversal above the repository root. Paths are repository-relative logical paths; adapters are responsible for establishing that relationship from real filesystem observations.
