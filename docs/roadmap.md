# Roadmap

Tattoo is developed in explicit milestones so a fresh autonomous run can recover what is complete, what is current, and what remains. This roadmap defines product sequencing; it does not authorize an M1-scoped run to implement later milestones.

## M1 — Deterministic Core

**Status:** IN PROGRESS

Build the vendor-independent `@tattoo-ai/core` policy engine and professional open-source repository foundation.

Scope includes the structured TypeScript policy API, path deny and allow-only rules, operation-specific protection, dependency guards, diff budgets, runtime validation, deterministic `allow | warn | block` decisions, path normalization, package-quality build/test/CI, and precise trust-boundary documentation.

M1 is complete only after the implementation is reviewed, exact-head CI is green, the M1 PR is merged, and post-merge `main` CI is green.

## M2 — Configuration and CLI

**Status:** NOT STARTED

Add deterministic configuration loading and a local CLI around the core engine. This milestone owns `.tattoo` configuration parsing/validation, command-line evaluation workflows, useful exit codes, and human/machine-readable output. It must keep policy evaluation deterministic and must not move vendor-specific enforcement into core.

## M3 — Enforcement Adapters

**Status:** NOT STARTED

Integrate Tattoo with coding-agent enforcement surfaces while keeping adapters separate from core. Planned adapter targets include Claude Code, Codex, Cursor, Gemini CLI, and OpenCode. Each adapter must document exactly what it can observe, when it can block, and what bypasses remain; unsupported enforcement must never be presented as guaranteed.

## M4 — MCP and Workflow Integrations

**Status:** NOT STARTED

Expose deterministic Tattoo capabilities through MCP and broader developer workflows where that improves interoperability. This milestone should compose existing core/config/adapter behavior rather than duplicate policy logic.

## M5 — Natural-Language Rule Authoring

**Status:** NOT STARTED

Add optional natural-language assistance for authoring explicit deterministic Tattoo rules. Generated rules remain reviewable structured policy; an LLM must never become the enforcement authority or replace deterministic evaluation.

## M6 — Benchmarks, Hardening, and First Release

**Status:** NOT STARTED

Build a reproducible evaluation suite for rule correctness, adapter observation coverage, compatibility, and overhead; harden packaging/documentation; and prepare the first public package release. No benchmark numbers are claimed before a real methodology and measurements exist. Publishing, tagging, and releasing require explicit authorization.

## Outside the current roadmap

Cloud dashboards, authentication, billing, hosted databases, and telemetry are not required for the local-first product. They should only enter a future milestone if concrete user needs justify the additional trust, privacy, and operational complexity.
