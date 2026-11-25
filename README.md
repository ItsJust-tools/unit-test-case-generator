# Unit Test Case Generator

Generate unit test case scaffolds from a function description or input/output examples across Jest, Vitest and pytest styles.

**Live:** [unit-test-case-generator.itsjust.tools](https://unit-test-case-generator.itsjust.tools)

## Features

- Enter a function signature plus description and get a structured list of test cases: happy path, edge cases, error/exception paths, boundary values, empty/null inputs, idempotency tests
- Input/output example pairs auto-converted into assertion-ready test bodies
- Framework style selector: Jest, Vitest, pytest, xUnit naming conventions
- AAA (Arrange-Act-Assert) structured output with commented sections
- Coverage checklist showing which case categories are already covered and which are missing
- Editable case list with add/remove/rename before export
- Copy to clipboard and export as `.test.ts`, `.spec.js` or `.py` files
- Shareable URL state so a generated case set can be linked
- 100% client-side — no data ever leaves your browser

## Usage

1. Enter the function signature (e.g. `function slugify(input: string): string`)
2. Describe the behaviour in plain text — keyword detection picks up error, empty, null, boundary and idempotency cases
3. Optionally add input/output example pairs to produce assertion-ready bodies
4. Pick the framework style, then **Generate cases**
5. Edit, add, remove or rename cases; the coverage checklist updates live
6. Copy the rendered test file or download it as `.test.ts`, `.spec.js` or `.py`

## Development

```bash
npm install
npm run dev
npm test
npm run build
```
