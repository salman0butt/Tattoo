import { describe, expect, it } from 'vitest';

import { compileRuleText, UnsupportedRuleTextError } from './authoring.js';

describe('natural-language rule authoring', () => {
  it.each([
    [
      'never add a new dependency',
      {
        id: 'no-new-dependencies',
        type: 'dependency-guard',
        forbid: ['new-production', 'new-development'],
      },
    ],
    [
      'never delete an existing test',
      {
        id: 'protect-tests',
        type: 'path-deny',
        patterns: ['**/*.test.*', '**/*.spec.*', '**/test/**', '**/tests/**'],
        operations: ['delete'],
      },
    ],
    [
      'only modify src/auth/**',
      {
        id: 'only-modify-src-auth',
        type: 'path-allow-only',
        patterns: ['src/auth/**'],
        operations: ['modify'],
      },
    ],
    [
      "don't touch database migrations",
      {
        id: 'protect-database-migrations',
        type: 'path-deny',
        patterns: ['**/migrations/**', '**/migration/**'],
        operations: ['add', 'modify', 'delete', 'rename'],
      },
    ],
  ])('compiles %s into a structured rule', (text, expected) => {
    expect(compileRuleText(text)).toEqual(expected);
  });

  it('normalizes case and repeated whitespace before matching', () => {
    expect(compileRuleText('  NEVER   ADD a new dependency  ')).toEqual({
      id: 'no-new-dependencies',
      type: 'dependency-guard',
      forbid: ['new-production', 'new-development'],
    });
  });

  it('rejects unsupported wording instead of guessing', () => {
    expect(() => compileRuleText('never change the public API')).toThrow(
      UnsupportedRuleTextError,
    );
  });
});
