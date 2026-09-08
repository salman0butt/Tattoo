import { describe, expect, it } from 'vitest';
import { evaluatePolicy, normalizeRepositoryPath, PolicyConfigurationError, type Policy } from './index.js';

const files = (...entries: Parameters<typeof evaluatePolicy>[1]['files']) => ({ files: entries });

describe('path normalization and rules', () => {
  it('normalizes separators, dot segments, repeated separators and nested traversal', () => {
    expect(normalizeRepositoryPath('.\\src//feature/../index.ts')).toBe('src/index.ts');
    expect(normalizeRepositoryPath('.github/workflows/ci.yml')).toBe('.github/workflows/ci.yml');
    expect(() => normalizeRepositoryPath('../secret')).toThrow(PolicyConfigurationError);
  });
  it('denies matching add, modify, delete and both sides of rename', () => {
    const policy: Policy = { rules: [{ id: 'secrets', type: 'path-deny', patterns: ['secret/**'] }] };
    for (const operation of ['add', 'modify', 'delete'] as const) expect(evaluatePolicy(policy, files({ operation, path: 'secret/key' })).decision).toBe('block');
    expect(evaluatePolicy(policy, files({ operation: 'rename', previousPath: 'secret/key', path: 'safe/key' })).decision).toBe('block');
  });
  it('enforces allow-only scope', () => {
    const policy: Policy = { rules: [{ id: 'scope', type: 'path-allow-only', patterns: ['src/**'] }] };
    expect(evaluatePolicy(policy, files({ operation: 'modify', path: 'src/a.ts' })).decision).toBe('allow');
    expect(evaluatePolicy(policy, files({ operation: 'modify', path: 'README.md' })).decision).toBe('block');
  });
  it('supports delete-only protection without blocking edits', () => {
    const policy: Policy = { rules: [{ id: 'tests', type: 'path-deny', patterns: ['**/*.test.ts'], operations: ['delete'] }] };
    expect(evaluatePolicy(policy, files({ operation: 'modify', path: 'src/a.test.ts' })).decision).toBe('allow');
    expect(evaluatePolicy(policy, files({ operation: 'delete', path: 'src/a.test.ts' })).decision).toBe('block');
  });
});

describe('dependency guard', () => {
  const base = { production: { react: '1' }, development: { vitest: '1', old: '1' } };
  const after = { production: { react: '2', zod: '1' }, development: { vitest: '1', eslint: '1' } };
  it.each(['new-production', 'new-development', 'removed', 'version-change'] as const)('detects %s', (kind) => {
    const result = evaluatePolicy({ rules: [{ id: 'deps', type: 'dependency-guard', forbid: [kind] }] }, { files: [], dependencies: { before: base, after } });
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.metadata.kind).toBe(kind);
  });
});

describe('diff budgets and precedence', () => {
  it('allows exactly at limits and blocks above', () => {
    const policy: Policy = { rules: [{ id: 'budget', type: 'diff-budget', maxChangedFiles: 1, maxAddedLines: 2, maxDeletedLines: 3 }] };
    expect(evaluatePolicy(policy, files({ operation: 'modify', path: 'a', addedLines: 2, deletedLines: 3 })).decision).toBe('allow');
    expect(evaluatePolicy(policy, files({ operation: 'modify', path: 'a', addedLines: 3, deletedLines: 3 })).decision).toBe('block');
  });
  it('returns allow, warn, and block with block precedence', () => {
    expect(evaluatePolicy({ rules: [] }, files()).decision).toBe('allow');
    expect(evaluatePolicy({ rules: [{ id: 'w', type: 'path-deny', patterns: ['x'], effect: 'warn' }] }, files({ operation: 'add', path: 'x' })).decision).toBe('warn');
    const result = evaluatePolicy({ rules: [{ id: 'w', type: 'path-deny', patterns: ['x'], effect: 'warn' }, { id: 'b', type: 'path-deny', patterns: ['x'] }] }, files({ operation: 'add', path: 'x' }));
    expect(result.decision).toBe('block');
  });
});

describe('validation and determinism', () => {
  it.each([
    { rules: [{ id: 'x', type: 'path-deny', patterns: ['a'] }, { id: 'x', type: 'path-deny', patterns: ['b'] }] },
    { rules: [{ id: 'x', type: 'unknown' }] },
    { rules: [{ id: '', type: 'path-deny', patterns: ['a'] }] },
    { rules: [{ id: 'x', type: 'path-deny', patterns: [''] }] },
    { rules: [{ id: 'x', type: 'diff-budget', maxChangedFiles: -1 }] },
  ])('rejects invalid policy %#', (policy) => expect(() => evaluatePolicy(policy as Policy, files())).toThrow(PolicyConfigurationError));
  it('does not mutate inputs and produces stable ordering', () => {
    const policy: Policy = { rules: [{ id: 'z', type: 'path-deny', patterns: ['**'] }, { id: 'a', type: 'path-deny', patterns: ['**'] }] };
    const input = files({ operation: 'modify', path: './src//a.ts' });
    const snapshot = JSON.stringify(input);
    const first = evaluatePolicy(policy, input);
    expect(JSON.stringify(input)).toBe(snapshot);
    expect(first).toEqual(evaluatePolicy(policy, input));
    expect(first.violations.map((v) => v.ruleId)).toEqual(['a', 'z']);
  });
});
