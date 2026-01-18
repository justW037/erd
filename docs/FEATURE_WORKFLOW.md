# Feature Development Workflow — ERD Designer

This document describes a repeatable process to develop a feature from design through local development, white-box and black-box testing, and CI/CD automation for the ERD Designer project.

**Goal:** Provide clear steps, commands, and checks so contributors can implement features reliably and safely.

**Audience:** Engineers, reviewers, QA, and automation engineers working on this repository.

---

## 1. Plan & Spec

- Write a short feature spec (1-2 paragraphs) and acceptance criteria. Include:
  - Purpose and user value
  - UX/flow sketches or mockups (link images in PR)
  - Success criteria (what tests must pass, behavior expected)
- Create or update a task entry in `TASKS.md` with a small checklist and priority.

## 2. Branching & Setup

- Create a feature branch from `main`:

```bash
git checkout -b feat/<short-name>
```

- Install dependencies and run dev server:

```bash
npm install
npm run dev
# Open http://localhost:5173
```

- Run type-check and tests locally before coding:

```bash
npm run type-check
npm test
```

## 3. Design & API Contract

- Define public interfaces/types in `src/core/*` or component props in `src/components/*`.
- Add or update small TypeScript types early — they serve as the contract.
- If the feature touches persistence/export, update `src/utils/*` interfaces and add unit tests.

## 4. Implement (White-box oriented)

White-box development focuses on the internal structure and unit-testable units.

- Write modular, small functions and components. Keep pure functions easy to unit-test.
- Add unit tests alongside code (TDD recommended). Use `vitest`.
  - Unit tests live with implementation under `src/**` or in `src/__tests__`.
  - Mock external dependencies where appropriate (e.g., DOM, localStorage).

Commands:

```bash
# Run tests while developing (watch)
npm run test:watch

# Run a single test file
npx vitest run src/core/your-module.test.ts
```

White-box testing checklist:

- Unit tests cover logic branches (happy paths + edge cases)
- Types compile (no `any` regressions unless justified)
- Lint and Prettier formatting pass locally

## 5. Integration & Component Tests

- Add integration tests for interactions that span modules (parser -> graph builder -> renderer).
- Use `vitest` with DOM-like environment for lightweight integration tests.
- For rendering behavior, assert expected SVG structure, node counts, and key attributes.

## 6. Manual Black-box Testing

Black-box tests validate behavior from the user's perspective.

- Create a QA checklist for the feature including flows and edge cases. Example for a UI feature:
  - Open app, import sample schema, run layout, verify node positions
  - Edit table name in property panel and confirm it updates on canvas
  - Export as SVG/PNG and validate file download
  - Keyboard shortcuts and accessibility (tab order, aria labels)

- Cross-browser smoke test: test in latest Chrome, Firefox, and Safari (or Playwright scripts).
- Accessibility checks: use axe or manual ARIA inspection.

## 7. End-to-End (E2E) Automation

- Implement e2e tests using Playwright (recommended) or Cypress.
- Typical E2E test flow:
  1. Start dev server or a production build in CI container
  2. Load the app, run import, interact with UI (drag, zoom), assert visible outputs
  3. Export file and validate content if possible

CI should run a small selection of E2E tests on major flows; full E2E runs can run on nightly or release pipelines.

## 8. CI Automation (GitHub Actions)

Update or create a workflow that runs on PRs:

- Checkout code
- Install Node
- Run `npm ci`
- Run `npm run type-check`
- Run `npm run lint`
- Run `npm test` (unit + integration)
- Optionally run a fast subset of E2E (headless Playwright)
- Build (`npm run build`) to validate bundling

A successful PR must satisfy:

- All checks green (type-check, lint, tests)
- At least one approving review
- No unresolved merge conflicts

Example CI steps (summary):

```yaml
# (already present: .github/workflows/ci.yml)
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: node-version: '18'
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

## 9. Release & Deployment

- When merging to `main`, CI should produce a production build artifact.
- Build is packaged with `Dockerfile` and tested via a smoke test (serve `dist/` and hit `/health`).
- Tag releases and include changelog entries referencing the feature and PR.

Commands to build and test container locally:

```bash
npm run build
docker build -t erd-designer .
docker run --rm -p 8080:80 erd-designer
# visit http://localhost:8080
```

## 10. Observability & Post-release Checks

- Verify server logs, monitor errors and user feedback.
- If feature affects export or data, run sample exports and validate outputs.
- Track metrics (if integrated) and roll back if regression seen.

## 11. PR Checklist (to include in PR description)

- **Title & summary:** Short, descriptive
- **Link to task/issue:** `TASKS.md` entry or issue number
- **How to test locally:** Commands and quick steps
- **Screenshots / GIFs:** Showing behavior
- **Testing done:** Unit tests, integration, manual checks
- **Performance impact:** Notes if present
- **Accessibility:** ARIA attributes and keyboard behavior

## 12. Testing Templates

White-box test template (unit):

- Arrange: set up inputs and mocks
- Act: call function / render component
- Assert: check outputs, state, DOM

Black-box test template (manual):

- Preconditions: start with sample schema X
- Steps: user clicks/imports/edits
- Expected: UI reflects changes, download succeeds, no console errors

## 13. Useful Commands Summary

- Dev server:
  - `npm run dev`
- Type-checking:
  - `npm run type-check`
- Unit & integration tests:
  - `npm test` or `npm run test:watch`
- Lint and format:
  - `npm run lint` and `npm run format`
- Build & Docker:
  - `npm run build`
  - `docker build -t erd-designer .`

---

Place this file under `docs/FEATURE_WORKFLOW.md` and reference it in PR templates or `README.md` for developer onboarding.
