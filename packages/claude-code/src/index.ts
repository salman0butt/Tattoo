#!/usr/bin/env node

import { lstat } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { loadPolicyFile } from '@tattoo-ai/config';
import {
  evaluatePolicy,
  normalizeRepositoryPath,
  type Decision,
  type FileOperation,
  type Policy,
} from '@tattoo-ai/core';

export interface ClaudePreToolUseInput {
  hook_event_name: 'PreToolUse';
  tool_name: string;
  tool_input: Record<string, unknown>;
}

export interface ClaudeHookOutput {
  hookSpecificOutput: {
    hookEventName: 'PreToolUse';
    permissionDecision: 'deny' | 'ask';
    permissionDecisionReason: string;
  };
}

export interface ClaudeHookEvaluation {
  decision: Decision;
  output?: ClaudeHookOutput;
}

export class AdapterInputError extends Error {
  override name = 'AdapterInputError';
}

const editableTools = ['Write', 'Edit'] as const;
type EditableTool = (typeof editableTools)[number];
type EditableOperation = Extract<FileOperation, 'add' | 'modify'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseHookInput(value: unknown): ClaudePreToolUseInput {
  if (!isRecord(value) || value.hook_event_name !== 'PreToolUse')
    throw new AdapterInputError('Hook input must be a PreToolUse payload');
  if (typeof value.tool_name !== 'string' || value.tool_name.trim() === '')
    throw new AdapterInputError('Hook input requires a tool_name');
  if (!isRecord(value.tool_input))
    throw new AdapterInputError('Hook input requires an object tool_input');
  return value as unknown as ClaudePreToolUseInput;
}

function isEditableTool(toolName: string): toolName is EditableTool {
  return editableTools.includes(toolName as EditableTool);
}

function repositoryPath(filePath: string, repositoryRoot: string): string {
  if (!isAbsolute(filePath))
    throw new AdapterInputError('Claude file_path must be absolute');
  if (!isAbsolute(repositoryRoot))
    throw new AdapterInputError('Repository root must be absolute');

  const relativePath = relative(resolve(repositoryRoot), resolve(filePath));
  if (
    !relativePath ||
    relativePath === '..' ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  )
    throw new AdapterInputError(
      `Claude file_path is outside repository root: ${filePath}`,
    );
  try {
    return normalizeRepositoryPath(relativePath);
  } catch (error) {
    throw new AdapterInputError(
      error instanceof Error ? error.message : 'Invalid repository path',
    );
  }
}

function violationReason(
  evaluation: ReturnType<typeof evaluatePolicy>,
): string {
  return evaluation.violations.map((item) => item.reason).join('; ');
}

export function evaluatePreToolUse(
  input: ClaudePreToolUseInput,
  policy: Policy,
  repositoryRoot: string,
  operation: EditableOperation,
): ClaudeHookEvaluation {
  if (!isEditableTool(input.tool_name)) return { decision: 'allow' };
  const filePath = input.tool_input.file_path;
  if (typeof filePath !== 'string' || filePath.length === 0)
    throw new AdapterInputError(
      `${input.tool_name} hook input requires tool_input.file_path`,
    );

  const evaluation = evaluatePolicy(policy, {
    files: [{ operation, path: repositoryPath(filePath, repositoryRoot) }],
  });
  if (evaluation.decision === 'allow') return { decision: 'allow' };

  return {
    decision: evaluation.decision,
    output: {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: evaluation.decision === 'block' ? 'deny' : 'ask',
        permissionDecisionReason: violationReason(evaluation),
      },
    },
  };
}

export interface HookIo {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}

export interface HookOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  policyPath?: string;
  root?: string;
  io?: HookIo;
}

function requiredArgument(
  args: readonly string[],
  index: number,
  option: string,
): string {
  const value = args[index + 1];
  if (!value || value.startsWith('--'))
    throw new AdapterInputError(`${option} requires a path`);
  return value;
}

export function parseHookArgs(
  args: readonly string[],
): Pick<HookOptions, 'policyPath' | 'root'> {
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
      throw new AdapterInputError(`Unknown option: ${argument}`);
    }
  }
  return {
    ...(policyPath ? { policyPath } : {}),
    ...(root ? { root } : {}),
  };
}

function errorCode(error: unknown): string | undefined {
  if (!isRecord(error) || typeof error.code !== 'string') return undefined;
  return error.code;
}

async function resolveWriteOperation(
  input: ClaudePreToolUseInput,
): Promise<EditableOperation> {
  if (input.tool_name === 'Edit') return 'modify';
  const filePath = input.tool_input.file_path;
  if (typeof filePath !== 'string' || !isAbsolute(filePath))
    throw new AdapterInputError(
      'Write hook input requires an absolute file_path',
    );
  try {
    await lstat(filePath);
    return 'modify';
  } catch (error) {
    if (errorCode(error) === 'ENOENT') return 'add';
    throw new AdapterInputError(
      `Unable to determine whether Write target exists: ${filePath}`,
    );
  }
}

export async function runClaudeHook(
  inputText: string,
  options: HookOptions = {},
): Promise<number> {
  const io = options.io ?? {
    stdout: (text: string) => process.stdout.write(text),
    stderr: (text: string) => process.stderr.write(text),
  };
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  try {
    const input = parseHookInput(JSON.parse(inputText) as unknown);
    if (!isEditableTool(input.tool_name)) return 0;
    const repositoryRoot = resolve(
      options.root ?? env.CLAUDE_PROJECT_DIR ?? cwd,
    );
    const policyPath = resolve(
      repositoryRoot,
      options.policyPath ?? '.tattoo/policy.json',
    );
    const policy = await loadPolicyFile(policyPath);
    const operation = await resolveWriteOperation(input);
    const result = evaluatePreToolUse(input, policy, repositoryRoot, operation);
    if (result.output) io.stdout(`${JSON.stringify(result.output)}\n`);
    return 0;
  } catch (error) {
    io.stderr(
      `Tattoo Claude Code adapter error: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return 2;
  }
}

async function main(): Promise<void> {
  const inputText = await readStdin();
  const options = parseHookArgs(process.argv.slice(2));
  const code = await runClaudeHook(inputText, {
    ...options,
    io: {
      stdout: (text) => process.stdout.write(text),
      stderr: (text) => process.stderr.write(text),
    },
  });
  process.exitCode = code;
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
  void main().catch((error: unknown) => {
    process.stderr.write(
      `Tattoo Claude Code adapter error: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 2;
  });

async function readStdin(): Promise<string> {
  process.stdin.setEncoding('utf8');
  let input = '';
  for await (const chunk of process.stdin as AsyncIterable<string>)
    input += chunk;
  return input;
}
