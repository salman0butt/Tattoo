# Security model

Tattoo M1 is a deterministic decision component, not a sandbox or reference monitor.

## Trust boundary

Core trusts the normalized facts supplied by its caller. It deterministically validates policy configuration and evaluates those facts. It cannot prove that an adapter observed every change, that paths correspond to a real repository, or that an agent did not bypass the adapter.

Adapters must later establish repository roots, collect complete before/after dependency state and diff metrics, normalize tool-specific operations, and enforce returned decisions before dangerous actions where the platform permits.

Path normalization rejects absolute paths and attempts to traverse above the logical repository root, and normalizes common separator forms. This reduces ambiguity inside core but is not a filesystem containment guarantee: symlinks, mount points, case sensitivity, Unicode filesystem behavior and TOCTOU concerns live outside M1's trust boundary.

Report vulnerabilities according to SECURITY.md. Do not include secrets in reports or tests.
