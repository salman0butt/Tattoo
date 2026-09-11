import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { afterEach, describe, expect, it } from 'vitest';

import { createMcpServer, parseMcpArgs } from './index.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true })),
  );
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'tattoo-mcp-'));
  temporaryDirectories.push(directory);
  return directory;
}

async function withClient<T>(
  root: string,
  action: (client: Client) => Promise<T>,
): Promise<T> {
  const server = createMcpServer({ root });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'tattoo-test-client', version: '1.0.0' });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    return await action(client);
  } finally {
    await client.close();
    await server.close();
  }
}

function textContent(result: Awaited<ReturnType<Client['callTool']>>): string {
  const content = result.content.find((item) => item.type === 'text');
  if (!content || content.type !== 'text')
    throw new Error('MCP result has no text content');
  return content.text;
}

describe('MCP workflow integration', () => {
  it('discovers tattoo_check and returns deterministic evaluation JSON', async () => {
    const root = await temporaryDirectory();
    await mkdir(join(root, '.tattoo'), { recursive: true });
    await writeFile(
      join(root, '.tattoo/policy.json'),
      JSON.stringify({
        rules: [
          {
            id: 'protect-secrets',
            type: 'path-deny',
            patterns: ['secrets/**'],
          },
        ],
      }),
      'utf8',
    );

    const result = await withClient(root, async (client) => {
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name)).toEqual(['tattoo_check']);
      return client.callTool({
        name: 'tattoo_check',
        arguments: {
          changes: {
            files: [{ operation: 'modify', path: 'secrets/key' }],
          },
        },
      });
    });

    expect(result.isError).not.toBe(true);
    expect(JSON.parse(textContent(result))).toMatchObject({
      decision: 'block',
      violations: [
        {
          ruleId: 'protect-secrets',
          reason: 'Path is denied: secrets/key',
        },
      ],
    });
  });

  it('returns warnings, allows clean changes, and reports malformed changes', async () => {
    const root = await temporaryDirectory();
    await mkdir(join(root, '.tattoo'), { recursive: true });
    await writeFile(
      join(root, '.tattoo/policy.json'),
      JSON.stringify({
        rules: [
          {
            id: 'advisory',
            type: 'path-deny',
            effect: 'warn',
            patterns: ['notes/**'],
          },
        ],
      }),
      'utf8',
    );

    const results = await withClient(root, async (client) =>
      Promise.all([
        client.callTool({
          name: 'tattoo_check',
          arguments: {
            changes: { files: [{ operation: 'add', path: 'notes/todo' }] },
          },
        }),
        client.callTool({
          name: 'tattoo_check',
          arguments: {
            changes: { files: [{ operation: 'add', path: 'src/index.ts' }] },
          },
        }),
        client.callTool({
          name: 'tattoo_check',
          arguments: {
            changes: {
              files: [{ operation: 'unknown', path: 'src/index.ts' }],
            },
          },
        }),
      ]),
    );

    expect(JSON.parse(textContent(results[0]))).toMatchObject({
      decision: 'warn',
    });
    expect(JSON.parse(textContent(results[1]))).toEqual({
      decision: 'allow',
      violations: [],
    });
    expect(results[2].isError).toBe(true);
    expect(textContent(results[2])).toMatch(/invalid operation/);
  });

  it('parses root and policy arguments and rejects unknown options', () => {
    expect(
      parseMcpArgs(['--root', '/repo', '--policy', 'custom.json']),
    ).toEqual({ root: '/repo', policyPath: 'custom.json' });
    expect(() => parseMcpArgs(['--unknown'])).toThrow(/Unknown option/);
  });

  it('returns invalid policy files as MCP tool errors', async () => {
    const root = await temporaryDirectory();
    await mkdir(join(root, '.tattoo'), { recursive: true });
    await writeFile(join(root, '.tattoo/policy.json'), '{', 'utf8');

    const result = await withClient(root, (client) =>
      client.callTool({
        name: 'tattoo_check',
        arguments: { changes: { files: [] } },
      }),
    );

    expect(result.isError).toBe(true);
    expect(textContent(result)).toMatch(/invalid JSON/);
  });
});
