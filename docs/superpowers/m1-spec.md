# M1 Specification

`evaluatePolicy(policy, changeSet)` validates configuration, evaluates rules without external I/O, and returns `{ decision, violations }`. Decision is allow with no violations, warn with warnings only, block with any block. Violations contain stable rule identity/type, effect/severity, optional resource, reason and metadata.

Path rules cover add/modify/delete/rename, with rename checking old and new paths. Paths normalize common separators and dot segments and reject traversal above root. Dependency guard classifies new production, new development, removed and version-changed dependencies from normalized maps. Diff budgets allow equality and violate only above limits.

Invalid duplicate IDs, unknown types, missing/empty IDs/patterns, invalid operations/effects/categories and negative/non-integer budgets are configuration errors.
