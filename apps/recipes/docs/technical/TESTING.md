# Testing Strategy

This project follows an **AI-Native Quality Strategy**, designed to ensure reliability in an AI-driven development workflow.

## core Principles

1.  **Robot User First (E2E)**: We prioritize End-to-End tests (Playwright) that simulate a real user. If the "Robot User" cannot complete a task, the feature is broken.
2.  **Strict Logic Sandbox (Unit)**: We strictly enforce **100% coverage** on critical business logic files (e.g., math, conversions, complex helpers).
3.  **Baseline Health**: We maintain a baseline code coverage check for the entire project to prevent regression, but we do not chase 100% line coverage on UI components where E2E tests are more effective.

## Configuration

### Unit Tests (Vitest)

- **Global Threshold**: ~2% (Baseline)
- **Critical Files**: 100% (Enforced via `vitest.config.js` overrides)
- **Command**: `npm run test:unit`

### E2E Tests (Playwright)

- **Coverage**: All user journeys must have a corresponding test.
- **Command**: `npx playwright test`

## How to Contribute

1.  **New Features**: Always write a Playwright test first to define the "User Story".
2.  **New Logic**: If adding a helper function in `src/lib`, you MUST add a unit test and ensure 100% coverage for that file.
3.  **Refactoring**: Run `npm run quality` (or individual checks) to ensure you haven't broken the baseline.
