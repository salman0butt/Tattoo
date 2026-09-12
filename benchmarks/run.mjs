import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const warmupIterations = 100;
const measuredIterations = 10_000;
const names = [
  'allow-empty-change-set',
  'block-new-production-dependency',
  'block-protected-test-deletion',
  'block-out-of-scope-modification',
  'allow-within-diff-budget',
  'claude-edit-block',
  'claude-unsupported-tool-allow',
];

export function scenarioNames() {
  return [...names];
}

function coreScenario(name, core, policy, changes, decision) {
  return {
    name,
    run: () => core.evaluatePolicy(policy, changes),
    verify: (result) => assert.equal(result.decision, decision),
  };
}

function scenarios(core, adapter) {
  return [
    coreScenario(
      'allow-empty-change-set',
      core,
      { rules: [] },
      { files: [] },
      'allow',
    ),
    coreScenario(
      'block-new-production-dependency',
      core,
      {
        rules: [{ id: 'no-new-dependencies', type: 'dependency-guard' }],
      },
      {
        files: [],
        dependencies: {
          before: { production: { react: '18.0.0' } },
          after: {
            production: { react: '18.0.0', zod: '3.0.0' },
          },
        },
      },
      'block',
    ),
    coreScenario(
      'block-protected-test-deletion',
      core,
      {
        rules: [
          {
            id: 'protect-tests',
            type: 'path-deny',
            patterns: ['**/*.test.*'],
            operations: ['delete'],
          },
        ],
      },
      { files: [{ operation: 'delete', path: 'src/core.test.ts' }] },
      'block',
    ),
    coreScenario(
      'block-out-of-scope-modification',
      core,
      {
        rules: [
          {
            id: 'only-registration',
            type: 'path-allow-only',
            patterns: ['src/registration/**'],
            operations: ['modify'],
          },
        ],
      },
      { files: [{ operation: 'modify', path: 'src/auth/login.ts' }] },
      'block',
    ),
    coreScenario(
      'allow-within-diff-budget',
      core,
      {
        rules: [
          {
            id: 'small-diff',
            type: 'diff-budget',
            maxChangedFiles: 1,
            maxAddedLines: 4,
            maxDeletedLines: 2,
          },
        ],
      },
      {
        files: [
          {
            operation: 'modify',
            path: 'src/index.ts',
            addedLines: 2,
            deletedLines: 1,
          },
        ],
      },
      'allow',
    ),
    {
      name: 'claude-edit-block',
      run: () =>
        adapter.evaluatePreToolUse(
          adapter.parseHookInput({
            hook_event_name: 'PreToolUse',
            tool_name: 'Edit',
            tool_input: { file_path: '/repo/secrets/key' },
          }),
          {
            rules: [
              {
                id: 'protect-secrets',
                type: 'path-deny',
                patterns: ['secrets/**'],
              },
            ],
          },
          '/repo',
          'modify',
        ),
      verify: (result) => {
        assert.equal(result.decision, 'block');
        assert.equal(
          result.output?.hookSpecificOutput.permissionDecision,
          'deny',
        );
      },
    },
    {
      name: 'claude-unsupported-tool-allow',
      run: () =>
        adapter.evaluatePreToolUse(
          adapter.parseHookInput({
            hook_event_name: 'PreToolUse',
            tool_name: 'Bash',
            tool_input: {},
          }),
          { rules: [] },
          '/repo',
          'modify',
        ),
      verify: (result) => assert.deepEqual(result, { decision: 'allow' }),
    },
  ];
}

function measure(scenario) {
  const first = scenario.run();
  scenario.verify(first);
  for (let index = 0; index < warmupIterations; index += 1) scenario.run();

  const start = performance.now();
  for (let index = 0; index < measuredIterations; index += 1) scenario.run();
  const totalMilliseconds = performance.now() - start;
  return {
    name: scenario.name,
    iterations: measuredIterations,
    totalMilliseconds: Number(totalMilliseconds.toFixed(3)),
    averageMicroseconds: Number(
      ((totalMilliseconds / measuredIterations) * 1_000).toFixed(3),
    ),
  };
}

export async function runBenchmark() {
  const [core, adapter] = await Promise.all([
    import('../packages/core/dist/index.js'),
    import('../packages/claude-code/dist/index.js'),
  ]);
  const benchmarkScenarios = scenarios(core, adapter);
  assert.deepEqual(
    benchmarkScenarios.map((scenario) => scenario.name),
    names,
  );
  const measurements = benchmarkScenarios.map(measure);
  return {
    node: process.version,
    warmupIterations,
    measuredIterations,
    scenarios: measurements,
  };
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
)
  runBenchmark().then(
    (report) => process.stdout.write(`${JSON.stringify(report, null, 2)}\n`),
    (error) => {
      process.stderr.write(
        `Benchmark failed: ${error instanceof Error ? error.message : String(error)}\n`,
      );
      process.exitCode = 1;
    },
  );
