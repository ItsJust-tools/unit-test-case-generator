import type { ToolState, Framework } from './types';

export function renderFrameworkFile(state: ToolState, framework: Framework): string {
  const active = state.cases.filter((c) => c.enabled);
  switch (framework) {
    case 'jest':
    case 'vitest':
    case 'xunit': {
      const lines: string[] = [];
      if (framework === 'vitest') lines.push(`import { describe, it, expect } from 'vitest';`);
      lines.push(`describe('${state.functionName}', () => {`);
      active.forEach((c) => {
        const blocks = ['Arrange', 'Act', 'Assert'].map((phase) => `    // ${phase}: ${c.body}`);
        lines.push(`  it('${c.title.replace(/'/g, "\\'")}', () => {`, ...blocks, `  });`);
      });
      lines.push(`});`);
      return lines.join('\n');
    }
    case 'pytest': {
      const lines = [`import pytest`, ``];
      active.forEach((c) => {
        const fn = c.id.replace(/-/g, '_');
        lines.push(`def test_${fn}():`);
        lines.push(`    # ${c.category}`);
        lines.push(`    # Arrange/Act/Assert: ${c.body}`);
        lines.push(`    assert True  # TODO implement`);
        lines.push(``);
      });
      return lines.join('\n');
    }
  }
}
