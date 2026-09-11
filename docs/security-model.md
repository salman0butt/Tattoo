# Security model

Tattoo M2 is a deterministic local decision workflow, not a sandbox or reference monitor.

## Trust boundary

Core trusts the normalized facts supplied by its caller. The M2 configuration layer treats policy and change-set files as untrusted input, parses JSON, and delegates schema validation to core before evaluation. It cannot prove that an adapter observed every change, that paths correspond to a real repository, or that an agent did not bypass the adapter.

The CLI does not observe Git or filesystem changes; callers and future adapters must establish repository roots, collect complete before/after dependency state and diff metrics, normalize tool-specific operations, and enforce returned decisions before dangerous actions where the platform permits.

Path normalization rejects absolute paths and attempts to traverse above the logical repository root, and normalizes common separator forms. This reduces ambiguity inside core but is not a filesystem containment guarantee: symlinks, mount points, case sensitivity, Unicode filesystem behavior and TOCTOU concerns live outside core's trust boundary.

Report vulnerabilities according to SECURITY.md. Do not include secrets in reports or tests.
