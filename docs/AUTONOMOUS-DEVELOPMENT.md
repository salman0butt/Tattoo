# Autonomous Development

GitHub state is authoritative. Recover repository, PR, review and exact-head CI state before writes. Work only on the current milestone. Use design/planning before implementation, strict test-first RED/GREEN cycles, systematic debugging, skeptical full-diff review and verification before completion.

## Durable recovery

Every fresh run must read `AGENTS.md`, `docs/roadmap.md`, and `docs/progress/STATUS.md` in addition to this controller. `docs/roadmap.md` defines milestone scope; `docs/progress/STATUS.md` records the current milestone, completion checklist, last known branch/PR/CI evidence, blockers, and next safe action. Reconcile recorded status with live GitHub state before writing; live GitHub state wins when the ledger is stale. Update the progress ledger whenever durable milestone state materially changes so a future run never depends on conversational memory.

For M1, architecture/spec/plan decisions are pre-authorized. Do not advance beyond M1 in an M1-scoped run. Never weaken tests or CI, fabricate evidence, force-push main, publish packages, create releases, or merge with failed/pending exact-head CI or unresolved Critical/Important findings.

Priority: broken main; failed CI; Critical/Important review findings; unfinished M1 PR/branch; unfinished M1 task; next M1 task. Avoid duplicate workers touching the same unit.
