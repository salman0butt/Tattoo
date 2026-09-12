import { describe, expect, it } from 'vitest';

import { validateManifest } from './release-check.mjs';

const validManifest = {
  name: '@tattoo-ai/example',
  version: '0.1.0',
  description: 'Example package',
  license: 'MIT',
  engines: { node: '>=22' },
  files: ['dist'],
  main: './dist/index.js',
  types: './dist/index.d.ts',
  exports: {
    '.': { types: './dist/index.d.ts', import: './dist/index.js' },
  },
  publishConfig: { access: 'public' },
  repository: {
    type: 'git',
    url: 'git+https://github.com/salman0butt/Tattoo.git',
    directory: 'packages/example',
  },
};

describe('release metadata audit', () => {
  it('accepts a complete public package manifest and tarball file list', () => {
    expect(() =>
      validateManifest(validManifest, 'packages/example', [
        'dist/index.js',
        'dist/index.d.ts',
        'package.json',
      ]),
    ).not.toThrow();
  });

  it('rejects packages that are not configured for public publishing', () => {
    expect(() =>
      validateManifest(
        { ...validManifest, publishConfig: { access: 'restricted' } },
        'packages/example',
        ['dist/index.js', 'dist/index.d.ts', 'package.json'],
      ),
    ).toThrow(/public/);
  });
});
