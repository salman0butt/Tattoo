#!/usr/bin/env node

import { realpathSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  DEFAULT_POLICY_PATH,
  loadChangeSetFile,
  loadPolicyFile,
} from '@tattoo-ai/config';
import { evaluatePolicy, type EvaluationResult } from '@tattoo-ai/core';
import { compileRuleText } from './authoring.js';

export interface CliIo {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}

export interface CliOptions {
  cwd?: string;
  io?: CliIo;
}

type Command = 'help' | 'init' | 'add' | 'check' | 'explain';

interface ParsedArgs {
  command: Command;
  cwd: string;
  policyPath: string;
  changesPath?: string;
  ruleText?: string;
  json: boolean;
  force: boolean;
}

class CliError extends Error {}

const usage = `Usage:
  tattoo init [--policy <path>] [--force] [--json]
  tattoo add <phrase> [--policy <path>] [--json]
  tattoo check --changes <path> [--policy <path>] [--json]
  tattoo explain --changes <path> [--policy <path>] [--json]

Exit codes: 0 allow/warn, 1 block, 2 usage or configuration error.
`;

const defaultIo: CliIo = {
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
};

function requireValue(
  args: readonly string[],
  index: number,
  option: string,
): string {
  const value = args[index + 1];
  if (!value || value.startsWith('--'))
    throw new CliError(`${option} requires a path`);
  return value;
}

function parseArgs(args: readonly string[], cwd: string): ParsedArgs {
  const command = args[0];
  if (!command || command === '--help' || command === 'help')
    return {
      command: 'help',
      cwd,
      policyPath: resolve(cwd, DEFAULT_POLICY_PATH),
      json: false,
      force: false,
    };
  if (
    command !== 'init' &&
    command !== 'add' &&
    command !== 'check' &&
    command !== 'explain'
  )
    throw new CliError(`Unknown command: ${command}`);

  let policyPath = DEFAULT_POLICY_PATH;
  let changesPath: string | undefined;
  const ruleTextParts: string[] = [];
  let json = false;
  let force = false;
  for (let index = 1; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === undefined) throw new CliError('Missing argument');
    if (argument === '--policy') {
      policyPath = requireValue(args, index, '--policy');
      index += 1;
    } else if (argument === '--changes') {
      changesPath = requireValue(args, index, '--changes');
      index += 1;
    } else if (argument === '--json') {
      json = true;
    } else if (argument === '--force') {
      force = true;
    } else if (command === 'add' && !argument.startsWith('--')) {
      ruleTextParts.push(argument);
    } else {
      throw new CliError(`Unknown option: ${argument}`);
    }
  }

  if (command === 'init' && changesPath)
    throw new CliError('--changes is only valid for check and explain');
  if (
    (command === 'add' || command === 'check' || command === 'explain') &&
    force
  )
    throw new CliError('--force is only valid for init');
  if (command === 'add' && changesPath)
    throw new CliError('--changes is only valid for check and explain');
  if (command === 'add' && ruleTextParts.length === 0)
    throw new CliError('a rule phrase is required for add');
  if (command !== 'init' && command !== 'add' && !changesPath)
    throw new CliError('--changes is required for check and explain');

  return {
    command,
    cwd,
    policyPath: resolve(cwd, policyPath),
    ...(changesPath ? { changesPath: resolve(cwd, changesPath) } : {}),
    ...(ruleTextParts.length ? { ruleText: ruleTextParts.join(' ') } : {}),
    json,
    force,
  };
}

function displayPath(filePath: string, cwd: string): string {
  const value = relative(cwd, filePath) || '.';
  return value.split(sep).join('/');
}

async function initializePolicy(args: ParsedArgs, io: CliIo): Promise<number> {
  await mkdir(dirname(args.policyPath), { recursive: true });
  const content = '{\n  "rules": []\n}\n';
  try {
    await writeFile(args.policyPath, content, {
      encoding: 'utf8',
      flag: args.force ? 'w' : 'wx',
    });
  } catch (error) {
    if (
      !args.force &&
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'EEXIST'
    )
      throw new CliError(
        `${displayPath(args.policyPath, args.cwd)} already exists; use --force to replace it`,
      );
    throw error;
  }
  if (args.json)
    io.stdout(
      `${JSON.stringify({ path: displayPath(args.policyPath, args.cwd) })}\n`,
    );
  else io.stdout(`Initialized ${displayPath(args.policyPath, args.cwd)}\n`);
  return 0;
}

async function addRule(args: ParsedArgs, io: CliIo): Promise<number> {
  const rule = compileRuleText(args.ruleText!);
  const policy = await loadPolicyFile(args.policyPath);
  if (policy.rules.some((existing) => existing.id === rule.id))
    throw new CliError(`Rule id ${rule.id} already exists`);

  const updatedPolicy = { ...policy, rules: [...policy.rules, rule] };
  const temporaryPath = `${args.policyPath}.${randomUUID()}.tmp`;
  try {
    await writeFile(
      temporaryPath,
      `${JSON.stringify(updatedPolicy, null, 2)}\n`,
      { encoding: 'utf8', flag: 'wx' },
    );
    await rename(temporaryPath, args.policyPath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
  const output = {
    path: displayPath(args.policyPath, args.cwd),
    rule,
  };
  if (args.json) io.stdout(`${JSON.stringify(output, null, 2)}\n`);
  else io.stdout(`Added ${rule.id} to ${output.path}\n`);
  return 0;
}

function renderEvaluation(result: EvaluationResult, detailed: boolean): string {
  const lines = [result.decision.toUpperCase()];
  for (const item of result.violations) {
    const marker = item.effect === 'block' ? '✗' : '!';
    const resource = item.resource ? ` (${item.resource})` : '';
    lines.push(`${marker} ${item.ruleId}${resource}: ${item.reason}`);
    if (detailed) lines.push(`  metadata: ${JSON.stringify(item.metadata)}`);
  }
  return `${lines.join('\n')}\n`;
}

export async function runCli(
  args: readonly string[] = [],
  options: CliOptions = {},
): Promise<number> {
  const io = options.io ?? defaultIo;
  const cwd = options.cwd ?? process.cwd();
  try {
    const parsed = parseArgs(args, cwd);
    if (parsed.command === 'help') {
      io.stdout(usage);
      return 0;
    }
    if (parsed.command === 'init') return await initializePolicy(parsed, io);
    if (parsed.command === 'add') return await addRule(parsed, io);

    const policy = await loadPolicyFile(parsed.policyPath);
    const changes = await loadChangeSetFile(parsed.changesPath!);
    const result = evaluatePolicy(policy, changes);
    if (parsed.json) io.stdout(`${JSON.stringify(result, null, 2)}\n`);
    else io.stdout(renderEvaluation(result, parsed.command === 'explain'));
    return result.decision === 'block' ? 1 : 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(`Error: ${message}\n`);
    return 2;
  }
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

if (isMainModule())
  void runCli(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (error: unknown) => {
      process.stderr.write(
        `Error: ${error instanceof Error ? error.message : String(error)}\n`,
      );
      process.exitCode = 2;
    },
  );
