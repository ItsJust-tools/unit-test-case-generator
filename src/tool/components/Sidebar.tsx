'use client';

import React from 'react';
import { ALL_CATEGORIES, CATEGORY_LABELS, type ToolState } from '../types';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ state }) => {
  return (
    <div className="p-4 space-y-6 text-sm overflow-y-auto h-full" data-testid="utcg-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Framework styles</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          {FRAMEWORK_LIST.map((f) => (
            <li key={f.value} className="flex justify-between gap-2">
              <span>{f.label}</span>
              <span className="text-gray-500 dark:text-gray-400">{f.hint}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Saved sets</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-history-count">
          {state.cases.length} case{state.cases.length === 1 ? '' : 's'} in the current set
        </p>
      </div>
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Case categories</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          {ALL_CATEGORIES.map((c) => (
            <li key={c}>{CATEGORY_LABELS[c]}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Share</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Use the toolbar share button to create a URL containing the current case list; open it to
          restore and edit the same set.
        </p>
      </div>
    </div>
  );
};

const FRAMEWORK_LIST: { value: Framework; label: string; hint: string }[] = [
  { value: 'jest', label: 'Jest', hint: 'describe/it + expect' },
  { value: 'vitest', label: 'Vitest', hint: 'Vite-native, imports from vitest' },
  { value: 'pytest', label: 'pytest', hint: 'plain test_ functions + assert' },
  { value: 'xunit', label: 'xUnit naming', hint: 'it_should_* style titles' },
];

import type { Framework } from '../types';
