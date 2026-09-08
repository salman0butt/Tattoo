# M1 Design

Tattoo's first milestone is intentionally narrow: a pure deterministic library consumes normalized facts and explicit rules. Observation and enforcement belong to future adapters. This boundary keeps the policy engine testable, vendor-independent and auditable.

Rules are discriminated TypeScript objects. Glob matching uses picomatch rather than a custom wildcard parser. Effects are explicit warn/block, with block precedence. Modes are public product vocabulary only in M1; inventing implicit mode behavior would hide policy semantics.

ESM-only is used for the first package because supported Node is modern (22+) and it keeps the package surface small. Declarations and explicit exports make the package consumer-facing without publishing it.
