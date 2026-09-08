# Autonomous Development

GitHub state is authoritative. Recover repository, PR, review and exact-head CI state before writes. Work only on the current milestone. Use design/planning before implementation, strict test-first RED/GREEN cycles, systematic debugging, skeptical full-diff review and verification before completion.

For M1, architecture/spec/plan decisions are pre-authorized. Do not advance beyond M1 in an M1-scoped run. Never weaken tests or CI, fabricate evidence, force-push main, publish packages, create releases, or merge with failed/pending exact-head CI or unresolved Critical/Important findings.

Priority: broken main; failed CI; Critical/Important review findings; unfinished M1 PR/branch; unfinished M1 task; next M1 task. Avoid duplicate workers touching the same unit.
