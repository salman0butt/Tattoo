import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { runCli } from './index.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true })),
  );
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'tattoo-cli-'));
  temporaryDirectories.push(directory);
  return directory;
}

function output() {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    io: {
      stdout: (text: string) => stdout.push(text),
      stderr: (text: string) => stderr.push(text),
    },
    stdout,
    stderr,
  };
}

describe('tattoo CLI', () => {
  it('initializes a policy without overwriting it by default', async () => {
    const directory = await temporaryDirectory();
    const first = output();
    expect(await runCli(['init'], { cwd: directory, io: first.io })).toBe(0);
    await expect(
      readFile(join(directory, '.tattoo/policy.json'), 'utf8'),
    ).resolves.toBe('{\n  "rules": []\n}\n');

    const second = output();
    expect(await runCli(['init'], { cwd: directory, io: second.io })).toBe(2);
    expect(second.stderr.join('')).toMatch(/already exists/);
  });

  it('adds a compiled rule to an existing policy', async () => {
    const directory = await temporaryDirectory();
    await mkdir(join(directory, '.tattoo'));
    await writeFile(
      join(directory, '.tattoo/policy.json'),
      '{"rules":[]}',
      'utf8',
    );
    const result = output();

    expect(
      await runCli(['add', 'never add a new dependency', '--json'], {
        cwd: directory,
        io: result.io,
      }),
    ).toBe(0);
    expect(JSON.parse(result.stdout.join(''))).toEqual({
      path: '.tattoo/policy.json',
      rule: {
        id: 'no-new-dependencies',
        type: 'dependency-guard',
        forbid: ['new-production', 'new-development'],
      },
    });
    await expect(
      readFile(join(directory, '.tattoo/policy.json'), 'utf8'),
    ).resolves.toContain('no-new-dependencies');
  });

  it('rejects unsupported rule text without changing the policy', async () => {
    const directory = await temporaryDirectory();
    await mkdir(join(directory, '.tattoo'));
    const policyPath = join(directory, '.tattoo/policy.json');
    const original = '{"rules":[]}';
    await writeFile(policyPath, original, 'utf8');
    const result = output();

    expect(
      await runCli(['add', 'never change the public API'], {
        cwd: directory,
        io: result.io,
      }),
    ).toBe(2);
    expect(result.stderr.join('')).toMatch(/Unsupported rule text/);
    await expect(readFile(policyPath, 'utf8')).resolves.toBe(original);
  });

  it('rejects adding a rule whose generated id already exists', async () => {
    const directory = await temporaryDirectory();
    await mkdir(join(directory, '.tattoo'));
    const policyPath = join(directory, '.tattoo/policy.json');
    const original = JSON.stringify({
      rules: [
        {
          id: 'no-new-dependencies',
          type: 'dependency-guard',
          forbid: ['new-production', 'new-development'],
        },
      ],
    });
    await writeFile(policyPath, original, 'utf8');
    const result = output();

    expect(
      await runCli(['add', 'never add a new dependency'], {
        cwd: directory,
        io: result.io,
      }),
    ).toBe(2);
    expect(result.stderr.join('')).toMatch(/already exists/);
    await expect(readFile(policyPath, 'utf8')).resolves.toBe(original);
  });

  it('checks changes with human output and a blocking exit code', async () => {
    const directory = await temporaryDirectory();
    const policyPath = join(directory, 'policy.json');
    const changesPath = join(directory, 'changes.json');
    await writeFile(
      policyPath,
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
    await writeFile(
      changesPath,
      JSON.stringify({ files: [{ operation: 'modify', path: 'secrets/key' }] }),
      'utf8',
    );
    const result = output();

    expect(
      await runCli(
        ['check', '--policy', policyPath, '--changes', changesPath],
        { cwd: directory, io: result.io },
      ),
    ).toBe(1);
    expect(result.stdout.join('')).toMatch(/BLOCK/);
    expect(result.stdout.join('')).toMatch(/protect-secrets/);
    expect(result.stderr).toEqual([]);
  });

  it('prints machine-readable evaluation output', async () => {
    const directory = await temporaryDirectory();
    await mkdir(join(directory, '.tattoo'));
    await writeFile(
      join(directory, '.tattoo/policy.json'),
      '{"rules":[]}',
      'utf8',
    );
    await writeFile(join(directory, 'changes.json'), '{"files":[]}', 'utf8');
    const result = output();

    expect(
      await runCli(['check', '--changes', 'changes.json', '--json'], {
        cwd: directory,
        io: result.io,
      }),
    ).toBe(0);
    expect(JSON.parse(result.stdout.join(''))).toEqual({
      decision: 'allow',
      violations: [],
    });
  });

  it('explains warnings and returns success when nothing is blocked', async () => {
    const directory = await temporaryDirectory();
    const result = output();
    await writeFile(
      join(directory, 'policy.json'),
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
    await writeFile(
      join(directory, 'changes.json'),
      JSON.stringify({ files: [{ operation: 'modify', path: 'notes/todo' }] }),
      'utf8',
    );

    expect(
      await runCli(
        ['explain', '--policy', 'policy.json', '--changes', 'changes.json'],
        {
          cwd: directory,
          io: result.io,
        },
      ),
    ).toBe(0);
    expect(result.stdout.join('')).toMatch(/WARN/);
    expect(result.stdout.join('')).toMatch(/advisory/);
    expect(result.stdout.join('')).toMatch(/Path is denied/);
  });

  it('returns a usage error when an evaluation input is missing', async () => {
    const result = output();
    expect(await runCli(['check'], { io: result.io })).toBe(2);
    expect(result.stderr.join('')).toMatch(/--changes is required/);
  });
});
