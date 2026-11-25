'use client';

import React from 'react';
import {
  DEFAULT_STATE,
  FRAMEWORKS,
  ALL_CATEGORIES,
  CATEGORY_LABELS,
  addCase,
  removeCase,
  renameCase,
  exampleAssertion,
  generateCases,
  type CaseCategory,
  type ExamplePair,
  type Framework,
  type ToolState,
} from '../types';
import { renderFrameworkFile } from '../render';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveHistory?: (text: string) => void;
}

const inputClass =
  'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

let exampleSeed = 100;

export const Canvas: React.FC<CanvasProps> = ({ state, onChange, onSaveHistory }) => {
  const update = (patch: Partial<ToolState>) => onChange?.({ ...state, ...patch });
  const [error, setError] = React.useState<string | null>(null);

  const addExample = () => {
    exampleSeed += 1;
    const example: ExamplePair = { id: `ex-${exampleSeed}`, input: '', output: '' };
    update({ examples: [...state.examples, example] });
  };

  const updateExample = (id: string, patch: Partial<ExamplePair>) =>
    update({ examples: state.examples.map((e) => (e.id === id ? { ...e, ...patch } : e)) });

  const removeExample = (id: string) =>
    update({ examples: state.examples.filter((e) => e.id !== id) });

  const handleGenerate = () => {
    const outcome = generateCases({
      functionName: state.functionName,
      description: state.description,
      examples: state.examples,
    });
    if (!outcome.ok) {
      setError(outcome.error);
      return;
    }
    setError(null);
    update({ cases: outcome.cases });
    onSaveHistory?.(`Generated ${outcome.cases.length} test cases for ${state.functionName}`);
  };

  const preview = renderFrameworkFile(state, state.framework);

  return (
    <div className="space-y-6 p-4" data-testid="utcg-canvas">
      <section>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Function</h2>
        <label className="mt-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
          Signature
          <input
            type="text"
            value={state.signature}
            onChange={(e) => update({ signature: e.target.value })}
            data-testid="input-signature"
            className={inputClass}
            placeholder="function name(args): ReturnType"
          />
        </label>
        <label className="mt-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
          Description
          <textarea
            value={state.description}
            onChange={(e) => update({ description: e.target.value })}
            data-testid="input-description"
            rows={3}
            className={inputClass}
          />
        </label>
        <button
          type="button"
          onClick={handleGenerate}
          data-testid="btn-generate"
          className="mt-3 rounded-md bg-violet-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-violet-600"
        >
          Generate cases
        </button>
        {error ? (
          <p className="mt-2 text-xs text-red-600" data-testid="generate-error" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Examples (input → output)
        </h2>
        <ul className="mt-2 space-y-2">
          {state.examples.map((example) => (
            <li key={example.id} className="flex flex-wrap items-end gap-2">
              <input
                type="text"
                value={example.input}
                onChange={(e) => updateExample(example.id, { input: e.target.value })}
                data-testid={`example-input-${example.id}`}
                placeholder="input"
                className="w-40 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <span aria-hidden>→</span>
              <input
                type="text"
                value={example.output}
                onChange={(e) => updateExample(example.id, { output: e.target.value })}
                data-testid={`example-output-${example.id}`}
                placeholder="output"
                className="w-40 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <button
                type="button"
                onClick={() => removeExample(example.id)}
                data-testid={`btn-remove-example-${example.id}`}
                className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={addExample}
          data-testid="btn-add-example"
          className="mt-2 rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700"
        >
          Add example
        </button>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Style</h2>
        <select
          value={state.framework}
          onChange={(e) => update({ framework: e.target.value as Framework })}
          data-testid="select-framework"
          className={inputClass}
        >
          {FRAMEWORKS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Cases</h2>
        <ul className="mt-2 space-y-2" data-testid="case-list">
          {state.cases.map((c) => (
            <li key={c.id} className="rounded border border-gray-200 p-2 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={c.title}
                  onChange={(e) => update({ cases: renameCase(state.cases, c.id, e.target.value) })}
                  data-testid={`case-title-${c.id}`}
                  className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
                <span className="text-xs text-gray-500">{CATEGORY_LABELS[c.category]}</span>
                <button
                  type="button"
                  onClick={() => update({ cases: removeCase(state.cases, c.id) })}
                  data-testid={`btn-remove-case-${c.id}`}
                  className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700"
                >
                  Remove
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{c.body}</p>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => update({ cases: addCase(state.cases, state.functionName, 'edge-case') })}
          data-testid="btn-add-case"
          className="mt-2 rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700"
        >
          Add case
        </button>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Coverage</h2>
        <ul className="mt-1 text-xs" data-testid="coverage-list">
          {ALL_CATEGORIES.map((cat: CaseCategory) => {
            const covered = state.cases.some((c) => c.enabled && c.category === cat);
            return (
              <li
                key={cat}
                data-testid={`coverage-${cat}`}
                className={covered ? 'text-green-600' : 'text-red-500'}
              >
                {covered ? '✔' : '✘'} {CATEGORY_LABELS[cat]}
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Preview</h2>
        {(() => {
          const first = state.examples.find((e) => e.input.trim() && e.output.trim());
          const fn = state.functionName || 'fn';
          const assertion = first ? exampleAssertion(state.framework, fn, first) : null;
          return (
            <>
              <pre
                data-testid="preview-code"
                className="mt-2 overflow-x-auto rounded bg-gray-100 p-3 text-xs dark:bg-gray-900"
              >
                {preview || '// no cases yet'}
              </pre>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(preview)}
                data-testid="btn-copy-preview"
                className="mt-2 rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700"
              >
                Copy to clipboard
              </button>
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([preview], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  const ext =
                    state.framework === 'pytest'
                      ? 'py'
                      : state.framework === 'vitest'
                        ? 'spec.js'
                        : 'test.ts';
                  a.download = `${fn}.${ext}`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                data-testid="btn-download"
                className="mt-2 ml-2 rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700"
              >
                Download file
              </button>
              {assertion ? (
                <p className="mt-2 text-xs text-gray-500" data-testid="example-assertion">
                  {assertion}
                </p>
              ) : null}
            </>
          );
        })()}
      </section>
      {/* DEFAULT_STATE reset helper exposed for toolbar clear */}
      <button
        type="button"
        onClick={() => update({ ...DEFAULT_STATE, cases: [] })}
        data-testid="btn-reset-defaults"
        className="hidden"
      >
        reset
      </button>
    </div>
  );
};
