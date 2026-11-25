import type { Tool, DeserializeResult } from '@itsjust/core';
import toolConfig from './tool.config';
import {
  DEFAULT_STATE,
  FRAMEWORK_VALUES,
  ALL_CATEGORIES,
  addCase,
  removeCase,
  renameCase,
  coverageSummary,
  generateCases,
  type CaseCategory,
  type ExamplePair,
  type Framework,
  type TestCase,
  type ToolState,
} from './types';

/** Serialize tool state into a compact JSON string for share/import. */
export function serializeState(state: ToolState): string {
  return JSON.stringify({
    version: 1,
    functionName: state.functionName,
    signature: state.signature,
    description: state.description,
    examples: state.examples,
    framework: state.framework,
    cases: state.cases,
  });
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function validFramework(value: unknown): Framework {
  return FRAMEWORK_VALUES.includes(value as Framework)
    ? (value as Framework)
    : DEFAULT_STATE.framework;
}

function validExamples(value: unknown): ExamplePair[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (e): e is ExamplePair =>
        typeof e === 'object' &&
        e !== null &&
        typeof (e as ExamplePair).id === 'string' &&
        typeof (e as ExamplePair).input === 'string' &&
        typeof (e as ExamplePair).output === 'string'
    )
    .map((e) => ({ ...e, input: e.input, output: e.output }));
}

function validCases(value: unknown): TestCase[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (c): c is TestCase =>
        typeof c === 'object' &&
        c !== null &&
        typeof (c as TestCase).id === 'string' &&
        typeof (c as TestCase).title === 'string' &&
        ALL_CATEGORIES.includes((c as TestCase).category) &&
        typeof (c as TestCase).body === 'string' &&
        typeof (c as TestCase).enabled === 'boolean'
    )
    .map((c) => ({ ...c }));
}

/** Validate and recover tool state from an arbitrary payload. */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      error: 'Invalid data format: expected unit-test-case-generator state object',
    };
  }
  const v = data as Record<string, unknown>;
  const state: ToolState = {
    functionName: stringOr(v.functionName, DEFAULT_STATE.functionName),
    signature: stringOr(v.signature, DEFAULT_STATE.signature),
    description: stringOr(v.description, DEFAULT_STATE.description),
    examples: validExamples(v.examples),
    framework: validFramework(v.framework),
    cases: validCases(v.cases),
  };
  return { success: true, data: state };
}

/** True when a serialized string round-trips back to the same state. */
export function roundTrips(state: ToolState): boolean {
  try {
    const restored = deserializeState(JSON.parse(serializeState(state)));
    return restored.success && JSON.stringify(restored.data) === JSON.stringify(state);
  } catch {
    return false;
  }
}

export const unitTestCaseGeneratorTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: { ...DEFAULT_STATE, cases: [], examples: [...DEFAULT_STATE.examples] },
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};

export { addCase, removeCase, renameCase, coverageSummary, generateCases };
export type { CaseCategory, ExamplePair, Framework, TestCase, ToolState };
