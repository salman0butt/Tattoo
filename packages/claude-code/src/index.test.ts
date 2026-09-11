import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  AdapterInputError,
  type ClaudeHookOutput,
  evaluatePreToolUse,
  parseHookArgs,
  parseHookInput,
  runClaudeHook,
} from './index.js';

const repositoryRoot = '/repo';
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true })),
  );
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'tattoo-claude-'));
  temporaryDirectories.push(directory);
  return directory;
}

const input = (toolName: string, filePath?: string) => ({
  hook_event_name: 'PreToolUse',
  tool_name: toolName,
  tool_input: filePath === undefined ? {} : { file_path: filePath },
});

describe('Claude Code adapter', () => {
  it('parses a PreToolUse payload', () => {
    expect(parseHookInput(input('Edit', '/repo/src/index.ts'))).toEqual(
      input('Edit', '/repo/src/index.ts'),
    );
  });

  it('denies a blocked file edit with Claude hook JSON', () => {
    const result = evaluatePreToolUse(
      parseHookInput(input('Edit', '/repo/secrets/key')),
      {
        rules: [
          {
            id: 'protect-secrets',
            type: 'path-deny',
            patterns: ['secrets/**'],
          },
        ],
      },
      repositoryRoot,
      'modify',
    );

    expect(result.decision).toBe('block');
    expect(result.output).toEqual({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: 'Path is denied: secrets/key',
      },
    });
  });

  it('asks for a warning and stays silent for an allowed edit', () => {
    const warning = evaluatePreToolUse(
      parseHookInput(input('Write', '/repo/notes/todo')),
      {
        rules: [
          {
            id: 'advisory',
            type: 'path-deny',
            effect: 'warn',
            patterns: ['notes/**'],
          },
        ],
      },
      repositoryRoot,
      'add',
    );
    const allowed = evaluatePreToolUse(
      parseHookInput(input('Edit', '/repo/src/index.ts')),
      { rules: [] },
      repositoryRoot,
      'modify',
    );

    expect(warning.decision).toBe('warn');
    expect(warning.output?.hookSpecificOutput.permissionDecision).toBe('ask');
    expect(allowed).toEqual({ decision: 'allow' });
  });

  it('ignores unsupported tools without claiming enforcement', () => {
    expect(
      evaluatePreToolUse(
        parseHookInput(input('Bash')),
        { rules: [] },
        repositoryRoot,
        'modify',
      ),
    ).toEqual({ decision: 'allow' });
  });

  it('rejects relative and outside-root file paths', () => {
    expect(() =>
      evaluatePreToolUse(
        parseHookInput(input('Edit', 'src/index.ts')),
        { rules: [] },
        repositoryRoot,
        'modify',
      ),
    ).toThrowError(AdapterInputError);
    expect(() =>
      evaluatePreToolUse(
        parseHookInput(input('Edit', '/other/secrets/key')),
        { rules: [] },
        repositoryRoot,
        'modify',
      ),
    ).toThrowError(AdapterInputError);
  });

  it('rejects malformed hook payloads', () => {
    expect(() => parseHookInput({})).toThrowError(AdapterInputError);
    expect(() =>
      parseHookInput({
        hook_event_name: 'PostToolUse',
        tool_name: 'Edit',
        tool_input: {},
      }),
    ).toThrowError(/PreToolUse/);
  });

  it('classifies an existing Write as modify at the file boundary', async () => {
    const root = await temporaryDirectory();
    const policyPath = join(root, 'policy.json');
    const target = join(root, 'src/existing.ts');
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(target, 'const value = 1;\n', 'utf8');
    await writeFile(
      policyPath,
      JSON.stringify({
        rules: [
          {
            id: 'protect-existing',
            type: 'path-deny',
            patterns: ['src/**'],
            operations: ['modify'],
          },
        ],
      }),
      'utf8',
    );
    const stdout: string[] = [];
    const stderr: string[] = [];

    expect(
      await runClaudeHook(JSON.stringify(input('Write', target)), {
        cwd: root,
        root,
        policyPath,
        io: {
          stdout: (text) => stdout.push(text),
          stderr: (text) => stderr.push(text),
        },
      }),
    ).toBe(0);
    expect(JSON.parse(stdout.join(''))).toEqual({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: 'Path is denied: src/existing.ts',
      },
    });
    expect(stderr).toEqual([]);
  });

  it('classifies a new Write as add and fails closed on malformed JSON', async () => {
    const root = await temporaryDirectory();
    await mkdir(join(root, '.tattoo'), { recursive: true });
    await writeFile(
      join(root, '.tattoo/policy.json'),
      JSON.stringify({
        rules: [
          {
            id: 'protect-new',
            type: 'path-deny',
            patterns: ['src/**'],
            operations: ['add'],
          },
        ],
      }),
      'utf8',
    );
    const stdout: string[] = [];
    const stderr: string[] = [];

    expect(
      await runClaudeHook(
        JSON.stringify(input('Write', join(root, 'src/new.ts'))),
        {
          cwd: root,
          env: { CLAUDE_PROJECT_DIR: root },
          io: {
            stdout: (text) => stdout.push(text),
            stderr: (text) => stderr.push(text),
          },
        },
      ),
    ).toBe(0);
    const output = JSON.parse(stdout.join('')) as ClaudeHookOutput;
    expect(output.hookSpecificOutput.permissionDecision).toBe('deny');

    expect(
      await runClaudeHook('{', {
        cwd: root,
        io: {
          stdout: () => undefined,
          stderr: (text) => stderr.push(text),
        },
      }),
    ).toBe(2);
    expect(stderr.join('')).toMatch(/adapter error/);
  });

  it('parses optional root and policy arguments', () => {
    expect(
      parseHookArgs(['--root', '/repo', '--policy', 'custom.json']),
    ).toEqual({
      root: '/repo',
      policyPath: 'custom.json',
    });
  });
});
