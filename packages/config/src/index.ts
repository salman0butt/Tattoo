import { readFile } from 'node:fs/promises';

import {
  type ChangeSet,
  type Policy,
  PolicyConfigurationError,
  validateChangeSet,
  validatePolicy,
} from '@tattoo-ai/core';

export const DEFAULT_POLICY_PATH = '.tattoo/policy.json';

export class ConfigurationFileError extends Error {
  override name = 'ConfigurationFileError';
}

function parseJson(text: string, source: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ConfigurationFileError(`${source}: invalid JSON`);
  }
}

function withSource(source: string, action: () => void): void {
  try {
    action();
  } catch (error) {
    if (error instanceof ConfigurationFileError) throw error;
    if (error instanceof PolicyConfigurationError)
      throw new ConfigurationFileError(`${source}: ${error.message}`);
    throw new ConfigurationFileError(`${source}: invalid configuration`);
  }
}

export function parsePolicyJson(
  text: string,
  source = DEFAULT_POLICY_PATH,
): Policy {
  const value = parseJson(text, source);
  withSource(source, () => validatePolicy(value as Policy));
  return value as Policy;
}

export function parseChangeSetJson(
  text: string,
  source = '<changes>',
): ChangeSet {
  const value = parseJson(text, source);
  withSource(source, () => validateChangeSet(value as ChangeSet));
  return value as ChangeSet;
}

async function loadFile<T>(
  filePath: string,
  parse: (text: string, source: string) => T,
): Promise<T> {
  let text: string;
  try {
    text = await readFile(filePath, 'utf8');
  } catch (error) {
    const detail = error instanceof Error ? ` (${error.message})` : '';
    throw new ConfigurationFileError(
      `${filePath}: unable to read file${detail}`,
    );
  }
  return parse(text, filePath);
}

export function loadPolicyFile(filePath: string): Promise<Policy> {
  return loadFile(filePath, parsePolicyJson);
}

export function loadChangeSetFile(filePath: string): Promise<ChangeSet> {
  return loadFile(filePath, parseChangeSetJson);
}
