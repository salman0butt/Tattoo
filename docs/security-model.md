# Security model

Tattoo M4 is a deterministic local decision workflow with one narrow Claude Code enforcement adapter and one MCP workflow server, not a sandbox or reference monitor.

## Trust boundary

Core trusts the normalized facts supplied by its caller. The M2 configuration layer treats policy and change-set files as untrusted input, parses JSON, and delegates schema validation to core before evaluation. It cannot prove that an adapter observed every change, that paths correspond to a real repository, or that an agent did not bypass the adapter.

The M2 CLI does not observe Git or filesystem changes. The M3 Claude Code adapter observes only `PreToolUse` `Write` and `Edit` calls, establishes a repository root, classifies file operations, and returns Claude Code's enforcement response. Bash/Git changes, deletes, renames, dependency changes, and bypasses outside these hook calls remain unobserved.

The adapter fails closed on malformed hook input, invalid policy, unreadable policy or file state, and paths outside the configured root. It emits decisions only for supported file tools: `block` maps to `deny`, `warn` maps to `ask`, and `allow` emits no hook response. This protects the hook boundary from silently treating an observation or configuration error as permission.

The M4 MCP server is read-only. It loads the configured policy and validates caller-supplied normalized change sets before returning the core result. Invalid changes or policy are returned as MCP tool errors; the server does not inspect repositories, mutate files, or enforce agent actions. MCP stdio output is a protocol channel, so diagnostics are kept on stderr.

The M6 benchmark and release scripts run as developer/CI tooling outside the core trust boundary. Benchmarks use fixed in-memory facts and assert expected results before timing; they do not observe repositories or prove an agent cannot bypass an adapter. The release audit only reads package metadata and dry-run pack output; it does not publish packages, create releases, or change versions.

Path normalization rejects absolute paths and attempts to traverse above the logical repository root, and normalizes common separator forms. This reduces ambiguity inside core but is not a filesystem containment guarantee: symlinks, mount points, case sensitivity, Unicode filesystem behavior and TOCTOU concerns live outside core's trust boundary.

Report vulnerabilities according to SECURITY.md. Do not include secrets in reports or tests.
