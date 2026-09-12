# M5 Natural-Language Rule Authoring Design

## Goal

Add a small, transparent authoring path for turning a few exact natural-language phrases into existing Tattoo rule types. The compiler is an authoring convenience only; `@tattoo-ai/core` remains the sole evaluator.

## Supported phrases

Matching trims leading/trailing whitespace, lowercases text, and collapses runs of whitespace. No other interpretation is performed.

| Phrase                            | Generated rule                                                                                                        |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `never add a new dependency`      | `dependency-guard`, id `no-new-dependencies`, forbids `new-production` and `new-development`                          |
| `never delete an existing test`   | `path-deny`, id `protect-tests`, common `*.test.*`, `*.spec.*`, `test/`, and `tests/` paths, operation `delete`       |
| `only modify src/auth/**`         | `path-allow-only`, id `only-modify-src-auth`, pattern `src/auth/**`, operation `modify`                               |
| `don't touch database migrations` | `path-deny`, id `protect-database-migrations`, conventional `migrations/` and `migration/` paths, all file operations |

The test and migration mappings are explicit conventional path coverage, not a claim to understand arbitrary project vocabulary. Users can edit the resulting JSON rule when they need a different scope.

## CLI behavior

`tattoo add <phrase> [--policy <path>] [--json]` loads an existing policy, compiles one phrase, rejects duplicate generated rule ids, appends the rule, and writes the validated policy back. It never initializes or overwrites a missing policy implicitly. Human output names the added rule; JSON output contains the policy path and generated rule.

Unsupported or empty phrases are configuration/usage errors with exit code `2`. The command never calls a model or performs repository observation.

## Non-goals

- No LLM/provider dependency or network access.
- No fuzzy matching, arbitrary prose parsing, or path inference.
- No new core rule types or enforcement surfaces.
- No repository scanning, Git integration, or package publication.
