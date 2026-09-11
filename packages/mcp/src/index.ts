#!/usr/bin/env node

import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';

import {
  DEFAULT_POLICY_PATH,
  loadPolicyFile,
  parseChangeSetJson,
} from '@tattoo-ai/config';
import { evaluatePolicy } from '@tattoo-ai/core';

export interface McpOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  policyPath?: string;
  root?: string;
}

function requiredArgument(
  args: readonly string[],
  index: number,
  option: string,
): string {
  const value = args[index + 1];
  if (!value || value.startsWith('--'))
    throw new Error(`${option} requires a path`);
  return value;
}

export function parseMcpArgs(
  args: readonly string[],
): Pick<McpOptions, 'policyPath' | 'root'> {
  let policyPath: string | undefined;
  let root: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--policy') {
      policyPath = requiredArgument(args, index, '--policy');
      index += 1;
    } else if (argument === '--root') {
      root = requiredArgument(args, index, '--root');
      index += 1;
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }
  return {
    ...(policyPath ? { policyPath } : {}),
    ...(root ? { root } : {}),
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createMcpServer(options: McpOptions = {}): McpServer {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const root = resolve(options.root ?? env.TATTOO_PROJECT_DIR ?? cwd);
  const policyPath = resolve(root, options.policyPath ?? DEFAULT_POLICY_PATH);
  const server = new McpServer(
    { name: 'tattoo', version: '0.1.0' },
    {
      instructions:
        'Use tattoo_check to evaluate a normalized change set against the configured Tattoo policy. This is workflow evaluation only; it does not observe or block agent actions.',
    },
  );

  server.registerTool(
    'tattoo_check',
    {
      title: 'Check Tattoo policy',
      description:
        'Evaluate a normalized Tattoo ChangeSet against the server policy. The changes object must use the @tattoo-ai/core ChangeSet shape. This tool is read-only evaluation and does not observe or enforce edits.',
      inputSchema: z.object({
        changes: z.record(z.string(), z.unknown()),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ changes }) => {
      try {
        const policy = await loadPolicyFile(policyPath);
        const changeSet = parseChangeSetJson(
          JSON.stringify(changes),
          '<mcp changes>',
        );
        const result = evaluatePolicy(policy, changeSet);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Tattoo MCP evaluation error: ${errorMessage(error)}`,
            },
          ],
        };
      }
    },
  );

  return server;
}

function isMainModule(): boolean {
  if (!process.argv[1]) return false;
  try {
    return (
      import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
    );
  } catch {
    return false;
  }
}

function main(): void {
  const options = parseMcpArgs(process.argv.slice(2));
  const handle = serveStdio(() => createMcpServer(options));
  const close = (): void => {
    void handle.close();
  };
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
  console.error('Tattoo MCP server listening on stdio');
}

if (isMainModule()) {
  try {
    main();
  } catch (error) {
    console.error(`Tattoo MCP server error: ${errorMessage(error)}`);
    process.exitCode = 2;
  }
}
