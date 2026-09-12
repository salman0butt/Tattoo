import type { Rule } from '@tattoo-ai/core';

export class UnsupportedRuleTextError extends Error {
  override name = 'UnsupportedRuleTextError';
}

const rules: Readonly<Record<string, Rule>> = {
  'never add a new dependency': {
    id: 'no-new-dependencies',
    type: 'dependency-guard',
    forbid: ['new-production', 'new-development'],
  },
  'never delete an existing test': {
    id: 'protect-tests',
    type: 'path-deny',
    patterns: ['**/*.test.*', '**/*.spec.*', '**/test/**', '**/tests/**'],
    operations: ['delete'],
  },
  'only modify src/auth/**': {
    id: 'only-modify-src-auth',
    type: 'path-allow-only',
    patterns: ['src/auth/**'],
    operations: ['modify'],
  },
  "don't touch database migrations": {
    id: 'protect-database-migrations',
    type: 'path-deny',
    patterns: ['**/migrations/**', '**/migration/**'],
    operations: ['add', 'modify', 'delete', 'rename'],
  },
};

function normalizeRuleText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function compileRuleText(text: string): Rule {
  if (typeof text !== 'string')
    throw new UnsupportedRuleTextError('Rule text must be a string');
  const normalized = normalizeRuleText(text);
  const rule = rules[normalized];
  if (!rule)
    throw new UnsupportedRuleTextError(`Unsupported rule text: ${text}`);
  return rule;
}
