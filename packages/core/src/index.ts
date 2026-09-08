import picomatch from 'picomatch';

export type Decision = 'allow' | 'warn' | 'block';
export type Mode = 'chill' | 'normal' | 'strict' | 'prison';
export type Effect = 'warn' | 'block';
export type Severity = 'warning' | 'error';
export type FileOperation = 'add' | 'modify' | 'delete' | 'rename';

export interface FileChange {
  operation: FileOperation;
  path: string;
  previousPath?: string;
  addedLines?: number;
  deletedLines?: number;
}

export interface ChangeSet {
  files: readonly FileChange[];
  dependencies?: {
    before?: {
      production?: Readonly<Record<string, string>>;
      development?: Readonly<Record<string, string>>;
    };
    after?: {
      production?: Readonly<Record<string, string>>;
      development?: Readonly<Record<string, string>>;
    };
  };
}

interface RuleBase {
  id: string;
  effect?: Effect;
}
export interface PathDenyRule extends RuleBase {
  type: 'path-deny';
  patterns: readonly string[];
  operations?: readonly FileOperation[];
}
export interface PathAllowOnlyRule extends RuleBase {
  type: 'path-allow-only';
  patterns: readonly string[];
  operations?: readonly FileOperation[];
}
export interface DependencyGuardRule extends RuleBase {
  type: 'dependency-guard';
  forbid?: readonly (
    'new-production' | 'new-development' | 'removed' | 'version-change'
  )[];
}
export interface DiffBudgetRule extends RuleBase {
  type: 'diff-budget';
  maxChangedFiles?: number;
  maxAddedLines?: number;
  maxDeletedLines?: number;
}
export type Rule =
  PathDenyRule | PathAllowOnlyRule | DependencyGuardRule | DiffBudgetRule;
export interface Policy {
  rules: readonly Rule[];
  mode?: Mode;
}

export interface Violation {
  ruleId: string;
  ruleType: Rule['type'];
  effect: Effect;
  severity: Severity;
  resource?: string;
  reason: string;
  metadata: Readonly<Record<string, unknown>>;
}
export interface EvaluationResult {
  decision: Decision;
  violations: readonly Violation[];
}
export class PolicyConfigurationError extends Error {
  override name = 'PolicyConfigurationError';
}

const effects: readonly Effect[] = ['warn', 'block'];
const operations: readonly FileOperation[] = [
  'add',
  'modify',
  'delete',
  'rename',
];
const depKinds = [
  'new-production',
  'new-development',
  'removed',
  'version-change',
] as const;
const modes: readonly Mode[] = ['chill', 'normal', 'strict', 'prison'];

export function normalizeRepositoryPath(input: string): string {
  if (typeof input !== 'string' || input.length === 0)
    throw new PolicyConfigurationError('Path must be a non-empty string');
  const raw = input
    .replaceAll('\\', '/')
    .replace(/^\.\//, '')
    .replace(/\/{2,}/g, '/');
  const parts: string[] = [];
  for (const part of raw.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (parts.length === 0)
        throw new PolicyConfigurationError(
          `Path escapes repository root: ${input}`,
        );
      parts.pop();
    } else parts.push(part);
  }
  if (parts.length === 0)
    throw new PolicyConfigurationError(
      `Path resolves to repository root: ${input}`,
    );
  return parts.join('/');
}

function validatePolicy(policy: Policy): void {
  if (!policy || !Array.isArray(policy.rules))
    throw new PolicyConfigurationError('Policy.rules must be an array');
  if (policy.mode !== undefined && !modes.includes(policy.mode))
    throw new PolicyConfigurationError(`Unknown mode: ${String(policy.mode)}`);
  const ids = new Set<string>();
  for (const rule of policy.rules) {
    if (!rule || typeof rule.id !== 'string' || rule.id.trim() === '')
      throw new PolicyConfigurationError('Every rule requires a non-empty id');
    if (ids.has(rule.id))
      throw new PolicyConfigurationError(`Duplicate rule id: ${rule.id}`);
    ids.add(rule.id);
    if (rule.effect !== undefined && !effects.includes(rule.effect))
      throw new PolicyConfigurationError(`Invalid effect for ${rule.id}`);
    if (
      ![
        'path-deny',
        'path-allow-only',
        'dependency-guard',
        'diff-budget',
      ].includes(rule.type)
    )
      throw new PolicyConfigurationError(
        `Unknown rule type: ${String((rule as { type?: unknown }).type)}`,
      );
    if (rule.type === 'path-deny' || rule.type === 'path-allow-only') {
      if (
        !Array.isArray(rule.patterns) ||
        rule.patterns.length === 0 ||
        rule.patterns.some((p) => typeof p !== 'string' || p.trim() === '')
      )
        throw new PolicyConfigurationError(
          `${rule.id} requires non-empty patterns`,
        );
      if (rule.operations?.some((op) => !operations.includes(op)))
        throw new PolicyConfigurationError(`${rule.id} has invalid operation`);
    }
    if (
      rule.type === 'dependency-guard' &&
      rule.forbid?.some((kind) => !depKinds.includes(kind))
    )
      throw new PolicyConfigurationError(
        `${rule.id} has invalid dependency category`,
      );
    if (rule.type === 'diff-budget') {
      const values = [
        rule.maxChangedFiles,
        rule.maxAddedLines,
        rule.maxDeletedLines,
      ].filter((v) => v !== undefined);
      if (
        values.length === 0 ||
        values.some((v) => !Number.isSafeInteger(v) || (v as number) < 0)
      )
        throw new PolicyConfigurationError(
          `${rule.id} requires non-negative integer budgets`,
        );
    }
  }
}

function violation(
  rule: Rule,
  reason: string,
  resource?: string,
  metadata: Record<string, unknown> = {},
): Violation {
  const effect = rule.effect ?? 'block';
  return {
    ruleId: rule.id,
    ruleType: rule.type,
    effect,
    severity: effect === 'block' ? 'error' : 'warning',
    ...(resource ? { resource } : {}),
    reason,
    metadata,
  };
}

function filePaths(change: FileChange): string[] {
  const paths = [normalizeRepositoryPath(change.path)];
  if (change.operation === 'rename') {
    if (!change.previousPath)
      throw new PolicyConfigurationError(
        `Rename to ${change.path} requires previousPath`,
      );
    paths.unshift(normalizeRepositoryPath(change.previousPath));
  }
  return paths;
}

function evaluatePathRule(
  rule: PathDenyRule | PathAllowOnlyRule,
  files: readonly FileChange[],
): Violation[] {
  const match = picomatch(rule.patterns, { dot: true });
  const out: Violation[] = [];
  for (const file of files) {
    if (rule.operations && !rule.operations.includes(file.operation)) continue;
    for (const path of filePaths(file)) {
      const matched = match(path);
      if (
        (rule.type === 'path-deny' && matched) ||
        (rule.type === 'path-allow-only' && !matched)
      ) {
        out.push(
          violation(
            rule,
            rule.type === 'path-deny'
              ? `Path is denied: ${path}`
              : `Path is outside allowed scope: ${path}`,
            path,
            { operation: file.operation },
          ),
        );
      }
    }
  }
  return out;
}

function dependencyEvents(changeSet: ChangeSet): Array<{
  kind: (typeof depKinds)[number];
  name: string;
  scope: 'production' | 'development';
  before?: string;
  after?: string;
}> {
  const result: Array<{
    kind: (typeof depKinds)[number];
    name: string;
    scope: 'production' | 'development';
    before?: string;
    after?: string;
  }> = [];
  for (const scope of ['production', 'development'] as const) {
    const before = changeSet.dependencies?.before?.[scope] ?? {};
    const after = changeSet.dependencies?.after?.[scope] ?? {};
    for (const name of [
      ...new Set([...Object.keys(before), ...Object.keys(after)]),
    ].sort()) {
      if (!(name in before))
        result.push({
          kind: scope === 'production' ? 'new-production' : 'new-development',
          name,
          scope,
          after: after[name],
        });
      else if (!(name in after))
        result.push({ kind: 'removed', name, scope, before: before[name] });
      else if (before[name] !== after[name])
        result.push({
          kind: 'version-change',
          name,
          scope,
          before: before[name],
          after: after[name],
        });
    }
  }
  return result;
}

export function evaluatePolicy(
  policy: Policy,
  changeSet: ChangeSet,
): EvaluationResult {
  validatePolicy(policy);
  if (!changeSet || !Array.isArray(changeSet.files))
    throw new PolicyConfigurationError('ChangeSet.files must be an array');
  const violations: Violation[] = [];
  for (const rule of policy.rules) {
    if (rule.type === 'path-deny' || rule.type === 'path-allow-only')
      violations.push(...evaluatePathRule(rule, changeSet.files));
    if (rule.type === 'dependency-guard') {
      const forbidden = rule.forbid ?? depKinds;
      for (const event of dependencyEvents(changeSet))
        if (forbidden.includes(event.kind))
          violations.push(
            violation(
              rule,
              `Dependency ${event.kind}: ${event.name}`,
              event.name,
              { ...event },
            ),
          );
    }
    if (rule.type === 'diff-budget') {
      const metrics = {
        changedFiles: changeSet.files.length,
        addedLines: changeSet.files.reduce(
          (n, f) => n + (f.addedLines ?? 0),
          0,
        ),
        deletedLines: changeSet.files.reduce(
          (n, f) => n + (f.deletedLines ?? 0),
          0,
        ),
      };
      for (const [key, limit] of [
        ['changedFiles', rule.maxChangedFiles],
        ['addedLines', rule.maxAddedLines],
        ['deletedLines', rule.maxDeletedLines],
      ] as const)
        if (limit !== undefined && metrics[key] > limit)
          violations.push(
            violation(
              rule,
              `Diff budget exceeded for ${key}: ${metrics[key]} > ${limit}`,
              undefined,
              { metric: key, actual: metrics[key], limit },
            ),
          );
    }
  }
  violations.sort(
    (a, b) =>
      a.ruleId.localeCompare(b.ruleId) ||
      (a.resource ?? '').localeCompare(b.resource ?? '') ||
      a.reason.localeCompare(b.reason),
  );
  const decision: Decision = violations.some((v) => v.effect === 'block')
    ? 'block'
    : violations.length > 0
      ? 'warn'
      : 'allow';
  return { decision, violations };
}
