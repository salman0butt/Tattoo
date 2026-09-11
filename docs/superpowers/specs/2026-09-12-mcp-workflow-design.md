# MCP Workflow Integration Design

Status: APPROVED BY THE EXPLICIT AUTONOMOUS M4 ADVANCE

## Goal

Expose Tattoo's existing deterministic policy evaluation through one local MCP tool that any compatible host can call during a workflow.

## Scope

Create `@tattoo-ai/mcp` with a single read-only `tattoo_check` tool:

- input: one normalized Tattoo `ChangeSet` object;
- policy: loaded from `<root>/.tattoo/policy.json`, or `--policy <path>`;
- root: `--root <path>`, then `TATTOO_PROJECT_DIR`, then the process working directory;
- result: the existing `EvaluationResult` serialized as one text content block;
- invalid changes or policy errors: returned as an MCP tool error, without crashing the server.

The server uses the official TypeScript MCP v2 server package (`@modelcontextprotocol/server` 2.0.0), its `serveStdio` entrypoint, and Zod input validation. The MCP layer owns transport and argument concerns; `@tattoo-ai/config` and `@tattoo-ai/core` remain the sources of configuration and policy behavior.

## Boundaries

This tool evaluates caller-supplied normalized facts. It does not inspect Git or the filesystem, observe agent actions, block edits, mutate files, call an LLM, or claim enforcement. The Claude Code adapter remains a separate enforcement surface. HTTP transport, resources, prompts, policy authoring, and additional tools are deferred.

## Package shape

`packages/mcp` contains the public `createMcpServer(options)` factory, a small `parseMcpArgs(args)` helper, and the `tattoo-mcp` executable. The factory is separately testable over an in-memory MCP transport; the executable serves the factory over stdio and keeps stdout exclusively for protocol traffic.

## Verification

Tests cover tool discovery, blocked/warning/allowed evaluation, malformed change-set errors, policy loading, argument resolution, and an in-memory client/server call. CI packs and imports the package beside core/config/CLI and verifies the repository quality gate. Documentation must show a generic stdio host configuration and state that MCP evaluation is not enforcement.

Reference: [MCP TypeScript server packages](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/get-started/packages.md) and [stdio serving](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/stdio.md).
