import type { Framework } from './types';

export const FRAMEWORKS: { value: Framework; label: string }[] = [
  { value: 'jest', label: 'Jest' },
  { value: 'vitest', label: 'Vitest' },
  { value: 'pytest', label: 'pytest' },
  { value: 'xunit', label: 'xUnit naming' },
];
