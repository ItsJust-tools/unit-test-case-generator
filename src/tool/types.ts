export type Framework = 'jest' | 'vitest' | 'pytest' | 'xunit';

export type CaseCategory =
  'happy-path' | 'edge-case' | 'error-path' | 'boundary' | 'null-empty' | 'idempotency';

export const ALL_CATEGORIES: CaseCategory[] = [
  'happy-path',
  'edge-case',
  'error-path',
  'boundary',
  'null-empty',
  'idempotency',
];

export const CATEGORY_LABELS: Record<CaseCategory, string> = {
  'happy-path': 'Happy path',
  'edge-case': 'Edge cases',
  'error-path': 'Error / exception paths',
  boundary: 'Boundary values',
  'null-empty': 'Empty / null inputs',
  idempotency: 'Idempotency',
};

export interface ExamplePair {
  id: string;
  input: string;
  output: string;
}

export interface TestCase {
  id: string;
  title: string;
  category: CaseCategory;
  body: string;
  enabled: boolean;
}

export interface ToolState {
  /** Function name under test, e.g. `slugify`. */
  functionName: string;
  /** Full signature line, e.g. `function slugify(input: string): string`. */
  signature: string;
  /** Free-form description of the function behaviour. */
  description: string;
  /** Input/output example pairs used for assertion-ready bodies. */
  examples: ExamplePair[];
  /** Selected testing framework style. */
  framework: Framework;
  /** Editable list of generated test cases. */
  cases: TestCase[];
}

export interface ToolStateV1 extends ToolState {
  version: 1;
}

export const FRAMEWORKS: {
  value: Framework;
  label: string;
  fileExt: 'test.ts' | 'spec.js' | 'py';
}[] = [
  { value: 'jest', label: 'Jest', fileExt: 'test.ts' },
  { value: 'vitest', label: 'Vitest', fileExt: 'spec.js' },
  { value: 'pytest', label: 'pytest', fileExt: 'py' },
  { value: 'xunit', label: 'xUnit naming', fileExt: 'test.ts' },
];

export const DEFAULT_STATE: ToolState = {
  functionName: 'slugify',
  signature: 'function slugify(input: string): string',
  description: 'lowercases the input, trims it, replaces whitespace runs with dashes',
  examples: [{ id: 'ex-1', input: 'Hello World', output: 'hello-world' }],
  framework: 'jest',
  cases: [],
};

export const FRAMEWORK_VALUES: Framework[] = ['jest', 'vitest', 'pytest', 'xunit'];

/** Deterministic short id for newly created cases/examples. */
export function newId(prefix: string, seed: number): string {
  return `${prefix}-${seed.toString(36).padStart(4, '0')}`;
}

/** Categories the description text explicitly calls out; always includes the happy path. */
export function categoriesFromDescription(description: string): CaseCategory[] {
  const text = description.toLowerCase();
  const found: CaseCategory[] = ['happy-path'];
  if (/\bthrow|error|invalid|fail|exception\b/.test(text)) found.push('error-path');
  if (/\bempty\b/.test(text)) found.push('null-empty');
  if (/\bnull\b|\bundefined\b/.test(text)) found.push('null-empty');
  if (/\bzero|0\b/.test(text) || /\bempty\b/.test(text)) found.push('boundary');
  if (/\bidempot|repeat|twice\b/.test(text)) found.push('idempotency');
  if (found.length === 1) {
    found.push('edge-case', 'boundary', 'null-empty', 'idempotency');
  }
  return found;
}

export interface GenerateResult {
  ok: true;
  cases: TestCase[];
}

export interface GenerateError {
  ok: false;
  error: string;
}

export type GenerateOutcome = GenerateResult | GenerateError;

let caseSeed = 1;

/** Validate inputs and produce the deterministic default case list. */
export function generateCases(input: {
  functionName: string;
  description: string;
  examples: ExamplePair[];
}): GenerateOutcome {
  const name = input.functionName.trim();
  if (!name) {
    return { ok: false, error: 'Function signature is required before generating test cases.' };
  }
  if (!/^[A-Za-z_$][\w$]*$/.test(name)) {
    return { ok: false, error: `Function name "${name}" is not a valid identifier.` };
  }
  const categories = categoriesFromDescription(input.description);
  const hasExamples = input.examples.some((e) => e.input.trim() && e.output.trim());
  const cases: TestCase[] = categories.map((category) => ({
    id: newId('case', caseSeed++),
    title: defaultTitle(name, category),
    category,
    body: defaultBody(name, category, hasExamples ? input.examples[0] : undefined),
    enabled: true,
  }));
  return { ok: true, cases };
}

function defaultTitle(name: string, category: CaseCategory): string {
  switch (category) {
    case 'happy-path':
      return `${name} returns the expected result for valid input`;
    case 'edge-case':
      return `${name} handles a tricky valid input`;
    case 'error-path':
      return `${name} throws on invalid input`;
    case 'boundary':
      return `${name} handles the boundary value`;
    case 'null-empty':
      return `${name} handles empty and null input`;
    case 'idempotency':
      return `${name} is idempotent for repeated calls`;
  }
}

function defaultBody(name: string, category: CaseCategory, example?: ExamplePair): string {
  const inVal = example ? example.input : 'sample-input';
  const outVal = example ? example.output : 'sample-output';
  switch (category) {
    case 'happy-path':
      return `Arrange a valid input; act by calling ${name}(${JSON.stringify(inVal)}); assert the result equals ${JSON.stringify(outVal)}.`;
    case 'edge-case':
      return `Arrange an unusual but valid input; act by calling ${name}; assert the result matches the described transformation.`;
    case 'error-path':
      return `Arrange invalid input; act by calling ${name}; assert it throws with a descriptive message.`;
    case 'boundary':
      return `Arrange the smallest/highest valid value; act by calling ${name}; assert the result stays within the documented bounds.`;
    case 'null-empty':
      return `Arrange an empty and a null input; act by calling ${name}; assert the documented fallback behaviour.`;
    case 'idempotency':
      return `Act by calling ${name} twice on the same input; assert both calls return the identical result.`;
  }
}

export interface CoverageSummary {
  covered: CaseCategory[];
  missing: CaseCategory[];
}

/** Which required categories are already present in the (enabled) case list. */
export function coverageSummary(cases: TestCase[]): CoverageSummary {
  const present = new Set(cases.filter((c) => c.enabled).map((c) => c.category));
  return {
    covered: ALL_CATEGORIES.filter((c) => present.has(c)),
    missing: ALL_CATEGORIES.filter((c) => !present.has(c)),
  };
}

/** Pure add: returns a new list with the appended case. */
export function addCase(cases: TestCase[], fn: string, category: CaseCategory): TestCase[] {
  const seed = cases.length + 1;
  const next: TestCase = {
    id: newId('case', caseSeed++ + seed),
    title: defaultTitle(fn || 'fn', category),
    category,
    body: defaultBody(fn || 'fn', category),
    enabled: true,
  };
  return [...cases, next];
}

/** Pure remove: keeps every remaining case intact, in order. */
export function removeCase(cases: TestCase[], id: string): TestCase[] {
  return cases.filter((c) => c.id !== id);
}

/** Pure rename: replaces only the target title. */
export function renameCase(cases: TestCase[], id: string, title: string): TestCase[] {
  return cases.map((c) => (c.id === id ? { ...c, title } : c));
}

/** Convert an example pair into an assertion snippet for the given framework. */
export function exampleAssertion(framework: Framework, fn: string, example: ExamplePair): string {
  const input = JSON.stringify(example.input);
  const output = JSON.stringify(example.output);
  switch (framework) {
    case 'jest':
    case 'vitest':
    case 'xunit':
      return `expect(${fn}(${input})).toEqual(${output});`;
    case 'pytest':
      return `assert ${fn}(${example.input.replace(/'/g, "\\'")}) == ${output}`;
  }
}
