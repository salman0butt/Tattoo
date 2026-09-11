# Roadmap

Tattoo is developed in explicit milestones so a fresh autonomous run can recover what is complete, what is current, and what remains. This roadmap defines product sequencing; it does not authorize a run to implement later milestones without an explicit milestone advance.

## M1 — Deterministic Core

**Status:** COMPLETE

Build the vendor-independent `@tattoo-ai/core` policy engine and professional open-source repository foundation.

Scope includes the structured TypeScript policy API, path deny and allow-only rules, operation-specific protection, dependency guards, diff budgets, runtime validation, deterministic `allow | warn | block` decisions, path normalization, package-quality build/test/CI, and precise trust-boundary documentation.

M1 is complete only after the implementation is reviewed, exact-head CI is green, the M1 PR is merged, and post-merge `main` CI is green.

Implemented in PR #1, hardened and documented in follow-up PR #6, and merged to `main` at `af4b7c38182b1fd998918791ad3c07669f803ba4`. Post-merge CI run `34626301398` passed on the resulting `main` commit. Repository About metadata and topics were set after the merge; the project remains public.

## M2 — Configuration and CLI

**Status:** COMPLETE

Add deterministic JSON configuration loading and a local CLI around the core engine. This milestone owns `.tattoo/policy.json` and normalized change-set JSON parsing/validation, `init`, `check`, and `explain` workflows, useful exit codes, and human/machine-readable output. YAML/TOML, repository observation, hooks, and vendor-specific enforcement remain deferred. It must keep policy evaluation deterministic and must not move vendor-specific enforcement into core.

Implemented in PR #8 and merged to `main` at `4d60a1768423afcb9a179f4fdfeb03ad067b3660`. Post-merge CI run `34630578887` passed on Node 22 and Node 24, including all three packed public package imports.

## M3 — Enforcement Adapters

**Status:** COMPLETE

Integrate Tattoo with coding-agent enforcement surfaces while keeping adapters separate from core. The first slice is a Claude Code `PreToolUse` adapter for `Write` and `Edit`, with exact observation coverage, blocking behavior, and bypasses documented. Bash/Git observation, deletes, renames, and other vendor adapters remain deferred; unsupported enforcement must never be presented as guaranteed.

Implemented in PR #10 and merged to `main` at `93c508307fcda4d0c4ee770fb2944adcaabb647c`. Post-merge CI run `34634728070` passed on Node 22 and Node 24, including packed-package imports and the installed `tattoo-claude-hook` executable smoke test.

## M4 — MCP and Workflow Integrations

**Status:** NOT STARTED

Expose deterministic Tattoo capabilities through MCP and broader developer workflows where that improves interoperability. This milestone should compose existing core/config/adapter behavior rather than duplicate policy logic.

## M5 — Natural-Language Rule Authoring

**Status:** NOT STARTED

Add optional natural-language assistance for authoring explicit deterministic Tattoo rules. Generated rules remain reviewable structured policy; an LLM must never become the enforcement authority or replace deterministic evaluation.

## M6 — Benchmarks, Hardening, and First Release

**Status:** NOT STARTED

Build a reproducible evaluation suite for rule correctness, adapter observation coverage, compatibility, and overhead; harden packaging/documentation; and prepare the first public package release. No benchmark numbers are claimed before a real methodology and measurements exist. Publishing, tagging, and releasing require explicit authorization.

The benchmark plan is to compare the same agent on adversarial tasks with and without Tattoo, such as fixing a typo while avoiding unrelated cleanup, implementing login without installing a package, changing only `src/registration/**`, preserving a public API response, and leaving migrations untouched. Measure explicit constraint violations, unauthorized paths, dependency changes, protected deletions, diff-budget violations, false-positive blocks, and evaluation overhead.

## Outside the current roadmap

Cloud dashboards, authentication, billing, hosted databases, and telemetry are not required for the local-first product. They should only enter a future milestone if concrete user needs justify the additional trust, privacy, and operational complexity.
