# Contributing

Thanks for improving Tattoo.

## Development

Prerequisites: Node.js 22 or newer and pnpm 10. After cloning, run:

```sh
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`pnpm check` runs the complete quality gate and is required before opening a PR.

## Changes

Open an issue for substantial behavioral changes. Keep each PR scoped, write a meaningful failing test before production behavior, and preserve deterministic output. Do not add vendor-specific behavior or external I/O to core. Update public documentation and explain security or trust-boundary changes explicitly in the PR.

By contributing, you agree that your contribution is licensed under the repository's MIT License.
