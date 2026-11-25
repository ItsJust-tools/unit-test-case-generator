import { defaultFeatures } from '@itsjust/core';
import type { ToolConfig } from '@itsjust/core';

export const toolConfig: ToolConfig = {
  id: 'unit-test-case-generator',
  name: 'Unit Test Case Generator',
  description:
    'Generate unit test case scaffolds from a function description or input/output examples across Jest, Vitest and pytest styles.',
  version: '1.0.0',
  exportFormats: ['png', 'pdf'],
  features: { ...defaultFeatures },
  theme: {
    accent: '#8b5cf6',
    accentHover: '#7c3aed',
    accentSubtle: 'rgba(139, 92, 246, 0.15)',
    brand: 'Unit Test Case Generator',
    icon: '\u90E8',
  },
};

export default toolConfig;
