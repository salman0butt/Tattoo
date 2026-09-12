import { describe, expect, it } from 'vitest';

import { scenarioNames } from './run.mjs';

describe('benchmark scenarios', () => {
  it('keeps the required correctness and adapter coverage', () => {
    expect(scenarioNames()).toEqual([
      'allow-empty-change-set',
      'block-new-production-dependency',
      'block-protected-test-deletion',
      'block-out-of-scope-modification',
      'allow-within-diff-budget',
      'claude-edit-block',
      'claude-unsupported-tool-allow',
    ]);
  });
});
