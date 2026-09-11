# M1 Implementation Plan

1. Establish monorepo/toolchain, package exports and CI foundation.
2. RED: tests for path normalization, deny/allow-only, operation-specific protection and renames. GREEN: path model and evaluation.
3. RED: dependency-category tests. GREEN: deterministic before/after classification.
4. RED: budget boundaries and decision precedence. GREEN: budget/effect aggregation.
5. RED: invalid policy and determinism tests. GREEN: actionable validation and stable ordering.
6. Build declarations and test the built public package import.
7. Complete open-source/security/architecture docs, run full verification, perform skeptical review, fix Critical/Important findings, verify exact-head CI, then merge.

Development record: repository began with only README on main. This automated environment could recover and write GitHub state, but the configured Superpowers/Codex runtime was unavailable (MCP tunnel returned HTTP 404), so skill invocation and local command-based RED/GREEN execution were blocked in this run. Tests were added alongside implementation; no claim of observed RED/GREEN execution is made until a later run can execute them.

Recovery verification on 2026-09-11 observed RED for the follow-up hardening tests (28 tests with 2 failures, then 30 tests with 4 failures after adding malformed-input cases), followed by GREEN at 30/30 after the minimal path, ordering, and validation fixes. The full local quality gate and packed public import then passed.
