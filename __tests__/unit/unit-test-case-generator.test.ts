import { describe, it, expect } from 'vitest';
import {
  DEFAULT_STATE,
  FRAMEWORK_VALUES,
  ALL_CATEGORIES,
  CATEGORY_LABELS,
  categoriesFromDescription,
  newId,
  generateCases,
  addCase,
  removeCase,
  renameCase,
  coverageSummary,
  exampleAssertion,
  type ToolState,
  type TestCase,
} from '@/tool/types';
import {
  serializeState,
  deserializeState,
  roundTrips,
  unitTestCaseGeneratorTool,
} from '@/tool/tool-definition';
import { renderFrameworkFile } from '@/tool/render';

const state = (patch: Partial<ToolState> = {}): ToolState => ({ ...DEFAULT_STATE, ...patch });

const makeCase = (id: string, category: TestCase['category'], enabled = true): TestCase => ({
  id,
  title: `case ${id}`,
  category,
  body: `body ${id}`,
  enabled,
});

describe('categoriesFromDescription', () => {
  it('always includes the happy path', () => {
    expect(categoriesFromDescription('')).toEqual([
      'happy-path',
      'edge-case',
      'boundary',
      'null-empty',
      'idempotency',
    ]);
    expect(categoriesFromDescription('returns a slug')[0]).toBe('happy-path');
  });

  it('maps description keywords onto deterministic categories', () => {
    expect(categoriesFromDescription('throws on invalid input')).toContain('error-path');
    expect(categoriesFromDescription('handles empty strings')).toContain('null-empty');
    expect(categoriesFromDescription('returns null for null values')).toContain('null-empty');
    expect(categoriesFromDescription('repeated calls are idempotent')).toContain('idempotency');
  });

  it('is deterministic for the same description', () => {
    const text = 'throws on empty input';
    expect(categoriesFromDescription(text)).toEqual(categoriesFromDescription(text));
  });
});

describe('generateCases', () => {
  it('rejects an empty function signature with a validation error, not a crash', () => {
    const outcome = generateCases({ functionName: '  ', description: '', examples: [] });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.error).toMatch(/signature|identifier|required/i);
  });

  it('rejects an invalid identifier', () => {
    const outcome = generateCases({ functionName: '9bad name!', description: '', examples: [] });
    expect(outcome.ok).toBe(false);
  });

  it('produces happy path, edge, boundary, null/empty, idempotency for a plain description', () => {
    const outcome = generateCases({
      functionName: 'foo',
      description: 'adds numbers',
      examples: [],
    });
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      const categories = outcome.cases.map((c) => c.category);
      for (const cat of [
        'happy-path',
        'edge-case',
        'boundary',
        'null-empty',
        'idempotency',
      ] as const) {
        expect(categories).toContain(cat);
      }
    }
  });

  it('is deterministic: two runs with identical input produce identical titles/bodies per id', () => {
    const input = { functionName: 'bar', description: 'throws on bad input', examples: [] };
    const a = generateCases(input);
    const b = generateCases(input);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.cases.map((c) => ({ title: c.title, category: c.category, body: c.body }))).toEqual(
        b.cases.map((c) => ({ title: c.title, category: c.category, body: c.body }))
      );
    }
  });

  it('uses example pairs in the happy-path body', () => {
    const outcome = generateCases({
      functionName: 'fn',
      description: '',
      examples: [{ id: 'e1', input: 'a b', output: 'a-b' }],
    });
    if (outcome.ok) {
      const firstCase = outcome.cases[0];
      expect(firstCase).toBeDefined();
      if (!firstCase) throw new Error('missing happy-path case');
      expect(firstCase.body).toContain('fn("a b")');
      expect(firstCase.body).toContain('"a-b"');
    }
  });
});

describe('case list operations', () => {
  it('add appends without mutating the original list', () => {
    const cases = [makeCase('c1', 'happy-path')];
    const next = addCase(cases, 'foo', 'boundary');
    expect(next).toHaveLength(2);
    expect(next[0]).toBe(cases[0]);
    const appended = next[1];
    expect(appended).toBeDefined();
    expect(appended?.category).toBe('boundary');
    expect(cases).toHaveLength(1);
  });

  it('remove keeps remaining cases intact and ordered', () => {
    const cases = [
      makeCase('c1', 'happy-path'),
      makeCase('c2', 'boundary'),
      makeCase('c3', 'edge-case'),
    ];
    const next = removeCase(cases, 'c2');
    expect(next.map((c) => c.id)).toEqual(['c1', 'c3']);
  });

  it('rename touches only the target title', () => {
    const cases = [makeCase('c1', 'happy-path'), makeCase('c2', 'boundary')];
    const next = renameCase(cases, 'c2', 'renamed');
    expect(next[0]?.title).toBe('case c1');
    expect(next[1]?.title).toBe('renamed');
  });

  it('remove of an unknown id is a no-op', () => {
    const cases = [makeCase('c1', 'happy-path')];
    expect(removeCase(cases, 'nope')).toEqual(cases);
  });
});

describe('coverageSummary', () => {
  it('reports missing categories when none exist', () => {
    const summary = coverageSummary([makeCase('c1', 'happy-path')]);
    expect(summary.covered).toEqual(['happy-path']);
    expect(summary.missing).toContain('error-path');
    expect(summary.missing).toHaveLength(ALL_CATEGORIES.length - 1);
  });

  it('ignores disabled cases', () => {
    const summary = coverageSummary([makeCase('c1', 'happy-path', false)]);
    expect(summary.covered).toEqual([]);
    expect(summary.missing).toEqual(ALL_CATEGORIES);
  });

  it('reports full coverage when one case per category exists', () => {
    const cases = ALL_CATEGORIES.map((c, i) => makeCase(`c${i}`, c));
    const summary = coverageSummary(cases);
    expect(summary.missing).toEqual([]);
  });
});

describe('serialize/deserialize roundtrip', () => {
  it('round-trips an edited case list exactly', () => {
    const s = state({
      cases: [makeCase('a', 'happy-path'), makeCase('b', 'boundary')].map((c, i) =>
        i === 0 ? { ...c, title: 'edited title' } : c
      ),
      examples: [{ id: 'e1', input: 'x', output: 'y' }],
    });
    expect(roundTrips(s)).toBe(true);
  });

  it('round-trips the default state with generated cases', () => {
    const outcome = generateCases({ functionName: 'fn', description: '', examples: [] });
    if (outcome.ok) expect(roundTrips({ ...DEFAULT_STATE, cases: outcome.cases })).toBe(true);
  });

  it('deserialize rejects non-object payloads', () => {
    expect(deserializeState('nope').success).toBe(false);
    expect(deserializeState(null).success).toBe(false);
    expect(deserializeState([1, 2]).success).toBe(false);
  });

  it('deserialize recovers valid state and drops malformed cases/examples', () => {
    const raw = JSON.parse(serializeState(state()));
    raw.cases = [...(raw.cases ?? []), { id: 'bad', nothing: true }, makeCase('ok', 'boundary')];
    raw.examples = [
      { id: 'e', input: 'a' },
      { id: 'e2', input: 'a', output: 'b' },
    ];
    const result = deserializeState(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cases.map((c) => c.id)).toEqual(['ok']);
      expect(result.data.examples.map((e) => e.id)).toEqual(['e2']);
    }
  });

  it('deserialize falls back for invalid framework', () => {
    const raw = JSON.parse(serializeState(state()));
    raw.framework = 'mocha';
    const result = deserializeState(raw);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.framework).toBe(DEFAULT_STATE.framework);
  });

  it('serialize output is stable (no nondeterministic ordering)', () => {
    const s = state();
    expect(serializeState(s)).toBe(serializeState(s));
  });
});

describe('exampleAssertion', () => {
  it('renders expect(...) per JS style', () => {
    const ex = { id: 'e1', input: 'Hello', output: 'hello' };
    for (const fw of ['jest', 'vitest', 'xunit'] as const) {
      expect(exampleAssertion(fw, 'slugify', ex)).toBe(
        'expect(slugify("Hello")).toEqual("hello");'
      );
    }
  });

  it('renders pytest assert style', () => {
    const ex = { id: 'e1', input: "it's", output: 'hello' };
    expect(exampleAssertion('pytest', 'slugify', ex)).toBe(`assert slugify(it\\'s) == "hello"`);
  });
});

describe('renderFrameworkFile', () => {
  const base = state({
    cases: [makeCase('c1', 'happy-path')],
  });

  it('pytest output uses test_ functions', () => {
    const out = renderFrameworkFile({ ...base, framework: 'pytest' }, 'pytest');
    expect(out).toContain('def test_c1():');
    expect(out).toContain('import pytest');
  });

  it('vitest output imports from vitest', () => {
    const out = renderFrameworkFile({ ...base, framework: 'vitest' }, 'vitest');
    expect(out).toContain("from 'vitest'");
    expect(out).toContain(`describe('slugify'`);
  });

  it('skips disabled cases', () => {
    const out = renderFrameworkFile(
      { ...base, cases: [makeCase('c1', 'happy-path', false)], framework: 'jest' },
      'jest'
    );
    expect(out).not.toContain('case c1');
  });

  it('handles quotes in titles safely', () => {
    const out = renderFrameworkFile(
      { ...base, cases: [{ ...makeCase('c1', 'happy-path'), title: `it's fine` }] },
      'jest'
    );
    expect(out).toContain("it\\'s fine");
  });
});

describe('tool contract', () => {
  it('exposes the registered id', () => {
    expect(unitTestCaseGeneratorTool.id).toBe('unit-test-case-generator');
  });

  it('initial state is clean and serializable', () => {
    expect(roundTrips(unitTestCaseGeneratorTool.initialState)).toBe(true);
  });
});
