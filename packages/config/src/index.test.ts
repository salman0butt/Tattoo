import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  ConfigurationFileError,
  DEFAULT_POLICY_PATH,
  loadChangeSetFile,
  loadPolicyFile,
  parseChangeSetJson,
  parsePolicyJson,
} from './index.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true })),
  );
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'tattoo-config-'));
  temporaryDirectories.push(directory);
  return directory;
}

describe('JSON configuration', () => {
  it('parses and validates a policy', () => {
    expect(parsePolicyJson('{"rules":[]}')).toEqual({ rules: [] });
    expect(DEFAULT_POLICY_PATH).toBe('.tattoo/policy.json');
  });

  it('reports malformed JSON and invalid policy data', () => {
    expect(() => parsePolicyJson('{', 'policy.json')).toThrowError(
      /policy\.json: invalid JSON/,
    );
    expect(() =>
      parsePolicyJson(
        '{"rules":[{"id":"bad","type":"unknown"}]}',
        'policy.json',
      ),
    ).toThrowError(ConfigurationFileError);
  });

  it('parses and validates normalized change sets', () => {
    expect(
      parseChangeSetJson(
        '{"files":[{"operation":"modify","path":"src/index.ts"}]}',
      ),
    ).toEqual({
      files: [{ operation: 'modify', path: 'src/index.ts' }],
    });
    expect(() =>
      parseChangeSetJson(
        '{"files":[{"operation":"modify","path":"/outside"}]}',
        'changes.json',
      ),
    ).toThrowError(/changes\.json/);
  });

  it('loads policy and change-set files', async () => {
    const directory = await temporaryDirectory();
    const policyPath = join(directory, 'policy.json');
    const changesPath = join(directory, 'changes.json');
    await writeFile(policyPath, '{"rules":[]}', 'utf8');
    await writeFile(changesPath, '{"files":[]}', 'utf8');

    await expect(loadPolicyFile(policyPath)).resolves.toEqual({ rules: [] });
    await expect(loadChangeSetFile(changesPath)).resolves.toEqual({
      files: [],
    });
    await expect(readFile(policyPath, 'utf8')).resolves.toBe('{"rules":[]}');
  });

  it('reports file read failures as configuration errors', async () => {
    await expect(
      loadPolicyFile('/definitely/missing/tattoo-policy.json'),
    ).rejects.toThrowError(ConfigurationFileError);
  });
});
