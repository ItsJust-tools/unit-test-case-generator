import { describe, it, expect } from 'vitest';
import { formatExportError, throwIfAborted } from '@/tool/exporters/utils';
import { sanitizeFilename } from '@itsjust/core';
import { renderFrameworkFile } from '@/tool/render';
import {
  addCase,
  removeCase,
  renameCase,
  coverageSummary,
  generateCases,
  exampleAssertion,
  categoriesFromDescription,
  newId,
  DEFAULT_STATE,
  ALL_CATEGORIES,
} from '@/tool/types';
import { serializeState, deserializeState, roundTrips } from '@/tool/tool-definition';
import type { ToolState } from '@/tool/types';

describe('export helpers', () => {
  it('formats CORS errors with guidance', () => {
    const message = formatExportError(new Error('cross-origin tainted canvas'), 'PNG');
    expect(message).toMatch(/CORS|assets/i);
  });

  it('passes through other errors', () => {
    expect(formatExportError(new Error('boom'), 'png')).toBe('boom');
    expect(formatExportError('raw', 'png')).toContain('png export failed');
  });

  it('throwIfAborted throws AbortError for aborted signals', () => {
    expect(() => throwIfAborted(undefined)).not.toThrow();
    const controller = new AbortController();
    controller.abort();
    expect(() => throwIfAborted(controller.signal)).toThrow();
    expect(() => throwIfAborted(undefined)).not.toThrow();
  });

  it('sanitizeFilename strips unsafe characters', () => {
    expect(sanitizeFilename('my:test*file?.png')).not.toMatch(/[:*?]/);
  });
});

describe('tool logic extended coverage', () => {
  const state = (patch: Partial<ToolState> = {}): ToolState => ({
    ...DEFAULT_STATE,
    ...DEFAULT_STATE,
    cases: [],
    examples: [],
    ...patch,
  });

  it('newId produces stable zero-padded base36 ids', () => {
    expect(newId('case', 1)).toBe('case-0001');
    expect(newId('case', 36)).toBe('case-0010');
  });

  it('serialize/deserialize keeps disabled flag and body text', () => {
    const s = state({
      cases: [
        { id: 'c1', title: 't', category: 'boundary', body: 'b1', enabled: false },
        { id: 'c2', title: 't2', category: 'happy-path', body: 'b2', enabled: true },
      ],
    });
    expect(roundTrips(s)).toBe(true);
    const parsed = deserializeState(JSON.parse(serializeState(s)));
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.cases[0]?.enabled).toBe(false);
      expect(parsed.data.cases[1]?.body).toBe('b2');
    }
  });

  it('deserialize returns failure for array payloads', () => {
    expect(deserializeState([]).success).toBe(false);
  });

  it('generateCases validates identifiers strictly', () => {
    expect(generateCases({ functionName: 'good_name', description: '', examples: [] }).ok).toBe(
      true
    );
    expect(generateCases({ functionName: '1bad', description: '', examples: [] }).ok).toBe(false);
    expect(generateCases({ functionName: 'with space', description: '', examples: [] }).ok).toBe(
      false
    );
    expect(generateCases({ functionName: 'ok$', description: '', examples: [] }).ok).toBe(true);
  });

  it('description keywords map to categories deterministically', () => {
    expect(categoriesFromDescription('this may throw an error')).toContain('error-path');
    expect(categoriesFromDescription('works with empty input')).toContain('null-empty');
    expect(categoriesFromDescription('repeat calls are idempotent')).toContain('idempotency');
    expect(categoriesFromDescription('zero is a boundary')).toContain('boundary');
  });

  it('add/remove/rename chain preserves unrelated cases', () => {
    const base = state({
      cases: [{ id: 'a', title: 'A', category: 'happy-path', body: '', enabled: true }],
    });
    const withNew = addCase(base.cases, 'fn', 'edge-case');
    const renamed = renameCase(withNew, 'a', 'A2');
    const final = removeCase(renamed, withNew[1]?.id ?? 'x');
    expect(final).toHaveLength(1);
    expect(final[0]?.title).toBe('A2');
    expect(final[0]?.id).toBe('a');
  });

  it('coverage summary splits covered vs missing across all categories', () => {
    const cases = ALL_CATEGORIES.map((c, i) => ({
      id: `c${i}`,
      title: c,
      category: c,
      body: '',
      enabled: i % 2 === 0,
    }));
    const summary = coverageSummary(cases);
    expect(summary.missing).toHaveLength(ALL_CATEGORIES.length / 2);
  });

  it('exampleAssertion escapes single quotes for pytest', () => {
    const out = exampleAssertion('pytest', 'fn', { id: 'e', input: "o'clock", output: "'x'" });
    expect(out).toContain("o\\'clock");
  });
});

describe('renderFrameworkFile coverage', () => {
  const base: ToolState = {
    ...DEFAULT_STATE,
    cases: [
      { id: 'c1', title: 'first', category: 'happy-path', body: 'do things', enabled: true },
      { id: 'c2', title: "skip'd", category: 'boundary', body: 'skip me', enabled: false },
    ],
  };

  it('jest file includes enabled cases with AAA comments', () => {
    const out = renderFrameworkFile({ ...base, framework: 'jest' }, 'jest');
    expect(out).toContain("describe('slugify'");
    expect(out).toContain("it('first'");
    expect(out).toContain('// Arrange');
    expect(out).toContain('// Act');
    expect(out).toContain('// Assert');
    expect(out).not.toContain('skip me');
  });

  it('xunit renders like jest describe blocks without imports', () => {
    const out = renderFrameworkFile({ ...base, framework: 'xunit' }, 'xunit');
    expect(out).not.toContain('from');
    expect(out).toContain('describe(');
  });

  it('pytest renders underscores in ids', () => {
    const out = renderFrameworkFile({ ...base, framework: 'pytest' }, 'pytest');
    expect(out).toContain('def test_c1():');
    expect(out).not.toContain('test_c2');
  });

  it('empty case list still renders a valid block', () => {
    const out = renderFrameworkFile({ ...base, cases: [], framework: 'vitest' }, 'vitest');
    expect(out).toContain("describe('slugify'");
    expect(out).toContain('});');
  });
});
