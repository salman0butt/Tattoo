import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryUrl = 'git+https://github.com/salman0butt/Tattoo.git';
const packageDirectories = ['core', 'config', 'cli', 'claude-code', 'mcp'];

export function validateManifest(manifest, packageDirectory, packedPaths) {
  const packageName = packageDirectory.replace(/^packages\//, '');
  assert.equal(manifest.name, `@tattoo-ai/${packageName}`);
  assert.match(manifest.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
  assert.equal(manifest.license, 'MIT');
  assert.equal(manifest.engines?.node, '>=22');
  assert.ok(manifest.files?.includes('dist'));
  assert.equal(manifest.main, './dist/index.js');
  assert.equal(manifest.types, './dist/index.d.ts');
  assert.equal(manifest.exports?.['.']?.import, './dist/index.js');
  assert.equal(manifest.exports?.['.']?.types, './dist/index.d.ts');
  assert.equal(manifest.publishConfig?.access, 'public');
  assert.deepEqual(manifest.repository, {
    type: 'git',
    url: repositoryUrl,
    directory: packageDirectory,
  });
  for (const path of ['package.json', 'dist/index.js', 'dist/index.d.ts'])
    assert.ok(
      packedPaths.includes(path),
      `${packageName} tarball misses ${path}`,
    );
}

function packedPaths(packageDirectory) {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npm, ['pack', '--dry-run', '--json'], {
    cwd: packageDirectory,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.length, 1);
  return output[0].files.map((file) => file.path);
}

export function runReleaseCheck(root = process.cwd()) {
  const manifests = packageDirectories.map((directory) => {
    const packageDirectory = `packages/${directory}`;
    const manifest = JSON.parse(
      readFileSync(resolve(root, packageDirectory, 'package.json'), 'utf8'),
    );
    validateManifest(
      manifest,
      packageDirectory,
      packedPaths(resolve(root, packageDirectory)),
    );
    return manifest;
  });
  const versions = new Set(manifests.map((manifest) => manifest.version));
  assert.equal(versions.size, 1, 'Public package versions must be aligned');
  return {
    packages: manifests.map((manifest) => manifest.name),
    version: manifests[0].version,
  };
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
)
  try {
    const result = runReleaseCheck(
      resolve(dirname(fileURLToPath(import.meta.url)), '..'),
    );
    process.stdout.write(
      `Release audit passed for ${result.packages.length} packages at ${result.version}\n`,
    );
  } catch (error) {
    process.stderr.write(
      `Release audit failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
