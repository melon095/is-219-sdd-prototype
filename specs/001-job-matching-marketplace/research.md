# Research: Job-Matching Marketplace

**Feature**: `001-job-matching-marketplace` | **Date**: 2026-11-12 | **Plan**: [plan.md](./plan.md)

This file records the technical decisions made while planning feature 001. Because 001 also builds the shared frame, and the constitution requires one tech stack for every feature, these decisions apply to `002-shared-knowledge-base` and later features as well.

Package versions were checked against the npm registry on 2026-11-12. Exact versions are pinned in `package.json` and `pnpm-lock.yaml` when the project is set up.

---

## 1. Language, framework, and package manager

- **Decision**: TypeScript 7.0 in strict mode, React 19.3, pnpm 12, Node.js 26.
- **Rationale**: Chosen by the project owner. React 19 is the current major version. TypeScript strict mode catches mistakes in the many status and permission rules in the spec. Node 26 and pnpm 12 are what is installed on the development machine.
- **Alternatives considered**: Plain JavaScript (rejected by the project owner).
- **Follow-up during setup**: TypeScript 7 is the new native compiler. Biome, Vite, and Vitest do not use the TypeScript compiler to read code, so only `tsc --noEmit` depends on it. If type checking with TypeScript 7 fails on React's or another dependency's type definitions when the project is set up, use the newest TypeScript 6 release instead and record the change here.

## 2. Build tool

- **Decision**: Vite 8 with `@vitejs/plugin-react`, building a static single-page app to `dist/`.
- **Rationale**: There is no server (spec clarification: "There is no server. Each browser keeps its own copy of the demo data"). A static build is all the prototype needs, and it can be put on any static host. Vite is the standard React build tool, and it shares its configuration with Vitest.
- **Alternatives considered**: Next.js and React Router framework mode both add server rendering, which nothing in the spec needs. Create React App is no longer maintained.

## 3. UI components and styling

- **Decision**: React Aria Components 1.22, styled with plain CSS. The component source files from the React Aria **Vanilla CSS starter kit** are copied into `src/frame/ui/` and restyled with Varodd design tokens. No CSS-in-JS, no utility-class framework, and no CSS Modules.
- **Rationale**:
  - React Aria Components handles keyboard use, focus management, ARIA roles and states, and screen reader announcements for the complex widgets in the spec: the skill picker (multi-select combo box with tags), date pickers, the user switcher menu, confirm dialogs, the mobile "Meny" disclosure, and tabs.
  - It ships no styles. Components expose their state as data attributes (`[data-hovered]`, `[data-pressed]`, `[data-focus-visible]`, `[data-selected]`, `[data-invalid]`, `[data-disabled]`), so the plain CSS selects on these.
  - The starter kit gives working, accessible components to start from. Because they are copied into the repository, they are fully owned by the project and can be changed to match the Varodd website, as constitution principle IV requires.
  - Using global class names (the starter kit's `.react-aria-*` names and project classes) keeps the CSS plain, as the project owner asked.
- **Alternatives considered**: Radix Primitives (no date picker, weaker multi-select), Digdir Designsystemet (strong accessibility, but its default look is Norwegian public sector and would need reworking), Pico CSS (no behaviour for complex widgets), shadcn/ui (Tailwind-based), MUI, Chakra, and Mantine (CSS-in-JS with a strong look of their own that conflicts with principle IV).

## 4. Design tokens and WCAG 2.1 AA colours

- **Decision**: All Varodd design values are CSS custom properties on `:root` in one file, `src/frame/design/tokens.css`. Components use only these properties, never raw colour values. Darker text versions of the status colours and the mid grey are added so that text and meaningful icons meet WCAG 2.1 AA. The full token list is in [contracts/shared-frame.md](./contracts/shared-frame.md#design-tokens).
- **Contrast measurements** (WCAG 2.1 relative luminance, computed 2026-11-12):

  | Colour | On `#FFFFFF` | On `#F6F6FF` | On `#FAFAFA` | Meets 4.5:1 for text? | Meets 3:1 for icons and borders? |
  |---|---|---|---|---|---|
  | Navy `#000082` | 15.88 | 14.78 | 15.22 | Yes | Yes |
  | Text `#1e1e1e` | 16.67 | 15.52 | 15.97 | Yes | Yes |
  | Information blue `#0000A0` | 13.93 | 12.96 | 13.35 | Yes | Yes |
  | Success green `#77AC94` | 2.59 | 2.41 | 2.48 | No | No |
  | Warning orange `#FF8C00` | 2.33 | 2.17 | 2.23 | No | No |
  | Error red `#F04438` | 3.76 | 3.50 | 3.60 | No | Yes |
  | Grey `#8B8B8B` | 3.41 | 3.17 | 3.26 | No | Yes |
  | Grey `#737373` | 4.74 | 4.41 | 4.54 | Only on white and `#FAFAFA` | Yes |

- **Added text versions** (same hue, darkened until at least 4.6:1 on all three light backgrounds):

  | Base colour | Text version | On `#FFFFFF` | On `#F6F6FF` | On `#FAFAFA` |
  |---|---|---|---|---|
  | Success `#77AC94` | `#4A7963` | 4.99 | 4.65 | 4.78 |
  | Warning `#FF8C00` | `#A85C00` | 5.00 | 4.66 | 4.80 |
  | Error `#F04438` | `#DA1E10` | 5.03 | 4.68 | 4.82 |
  | Grey `#8B8B8B` | `#707070` | 4.95 | 4.61 | 4.74 |

- **Usage rules**:
  - Text, icons that carry meaning, and form field error borders use the text versions.
  - The original status colours are used only as fills behind `#1e1e1e` text: success fill gives 6.44:1 and warning fill gives 7.15:1. The error fill gives only 4.44:1, so error messages use the error text version on a white or light background instead of a red fill.
  - `#707070` replaces `#737373` and `#8B8B8B` for secondary text. `#8B8B8B`, `#BDBDBD`, `#D5D5D5`, and `#EEEEEE` stay as borders and dividers only. The form field border `#BDBDBD` is 1.9:1, so form fields keep their shadow and a visible label so the field itself can still be identified. The focused and invalid states use a navy or error-text border that meets 3:1.
  - Secondary text is not placed on `#E5E5F8` or `#EEEEEE`, where even the text versions are just under 4.5:1.
  - Status is never shown by colour alone. Every status badge has its Norwegian status name as text.
  - The focus ring is a 2 px navy outline with a 2 px offset on light backgrounds, and a 2 px white outline inside the navy header bar.
- **Rationale**: The project owner asked for WCAG 2.1 AA and AA text versions of the status colours and `#8B8B8B`. Adding them to the shared tokens follows principle IV, which says additions go to the shared definition.
- **Alternatives considered**: Using the original colours for text (fails AA). Darkening the original tokens in place (would change the Varodd look for fills and decoration where the originals are fine).

## 5. Fonts

- **Decision**: Bree Serif and Barlow are self-hosted through `@fontsource/bree-serif` and `@fontsource/barlow` (5.3). Only the weights in use are imported: Bree Serif 400, and Barlow 400, 600, and 700.
- **Rationale**: Self-hosting means the running prototype makes no requests to Google or other third parties, which fits the "no real external interaction" spirit of principle II, works offline at demos, and keeps the Playwright tests stable.
- **Alternatives considered**: The Google Fonts stylesheet (external request at runtime).

## 6. Routing

- **Decision**: React Router 8 in its client-side (library) mode with hash-based URLs, for example `/#/oppdrag/abc`. React Aria's `RouterProvider` is connected to React Router so that React Aria `Link` and `Button href` navigate on the client side.
- **Rationale**: Hash URLs work on any static host without server rewrite rules, so reloading a deep link never gives a 404. Clicking an activity feed entry must open a specific page (FR-030), so every page needs its own URL.
- **Alternatives considered**: Normal browser URLs (need host configuration for fallbacks), TanStack Router (works well, but React Router is more widely known in the course setting and has direct React Aria integration examples).

## 7. Application state and persistence

- **Decision**:
  - All demo data lives in one `DemoState` object, defined in [data-model.md](./data-model.md).
  - Business rules are **pure TypeScript functions** in `src/domain/` with no React imports. Every change is a **command** (see [contracts/commands.md](./contracts/commands.md)) handled by `applyCommand(state, command, context) → result`, where the context provides the acting person and the current time.
  - A small store in `src/frame/store/` holds the current `DemoState`, exposes it to React through `useSyncExternalStore`, and saves it to `localStorage` after every successful command.
  - The stored data is checked with a Zod 4 schema when it is loaded. If it is missing, invalid, or was created from a different seed file, the prototype loads the seed data instead.
  - The selected simulated user is kept under a separate `localStorage` key, so a demo reset keeps the current user selected.
  - When `localStorage` changes in another tab of the same browser, the store reloads from it, so two tabs do not overwrite each other's changes.
- **Rationale**: The spec has many rules (statuses, matching, exclusions, permissions, log, activity), and the constitution requires test-driven development. Keeping these rules as pure functions makes them testable without a browser. `localStorage` gives the required per-browser data (FR-031). The prototype's data is small (tens of records), well under `localStorage` limits.
- **Alternatives considered**: Zustand or Redux Toolkit (work well, but add a dependency for what `useSyncExternalStore` already does in a few lines), IndexedDB (an asynchronous API that is not needed at this data size).

## 8. Time, offer expiry, and the time debug button

- **Decision**:
  - The domain functions never read the system clock. The store passes the current time in the command context.
  - Offer expiry (FR-016) is checked by a system step, `expireOverdueOffers(state, now)`, which runs when the app loads, before every command, and once every minute while the app is open. Expired offers are handled as declines, with "System" as the actor.
  - The time debug button on an Offered request sends the `simulateOfferExpiry` command. It applies the same effects as a real expiry to that request only, using the real current time for the log entry. The log event is marked `simulated: true` and its Norwegian text says that it was simulated with the debug button (FR-033).
- **Rationale**: Matches the clarification that "only the object whose button was pressed behaves as if the time had passed". Passing time in also lets tests use fixed times.
- **Alternatives considered**: A global fake clock (rejected by the clarification).

## 9. Seed data step

- **Decision**:
  - `pnpm seed` runs `scripts/seed/generate.ts` with `tsx`. It writes `src/seed/seed-data.json`, which is committed to the repository and bundled into the app.
  - Randomness comes from a small built-in seeded random number generator (mulberry32) with a fixed seed. All Norwegian names, businesses, request texts, and the skill list are hand-written lists in the seed scripts. The script does not read the system clock: all dates are written relative to a fixed **anchor date**, `2026-11-16`, stored in the file.
  - The file contains a `seedId`, a hash of its own content. The store uses it to notice that the seed file has changed since the browser's data was saved.
  - A test runs the generator in memory and checks that the output is byte-for-byte equal to the committed file (FR-032).
  - The generator is split into one module per feature, combined by `scripts/seed/generate.ts`, so `002-shared-knowledge-base` adds its own module (see [contracts/shared-frame.md](./contracts/shared-frame.md#seed-data)).
- **Rationale**: A hand-rolled random number generator with hand-written content gives full control over the Norwegian text and tone of voice, and output cannot change because a dependency was upgraded.
- **Alternatives considered**: `@faker-js/faker` with a fixed seed (output can change between Faker versions, and generated Norwegian text would not match the Varodd tone of voice).

## 10. Keeping seed dates current

- **Decision**: When seed data is loaded (first visit or reset), every date and time in it is moved forward by the number of whole days between the seed's anchor date and today's local date. The structure and the gaps between dates stay exactly as in the seed file.
- **Rationale**: Offer expiry and the "can start in time" rule compare against real time. Without moving the dates, a seeded Offered request would expire the moment the prototype is opened a week after the seed was generated, and every seeded start date would lie in the past. After a reset the prototype shows the same seed data with the same gaps between dates (SC-006), only moved to the present.
- **Alternatives considered**: Fixed absolute dates (the demo goes stale within days), generating the seed at load time (breaks the separate, reproducible seed step required by FR-032).

## 11. Locale and language

- **Decision**: `<html lang="nb">`, and React Aria's `I18nProvider` with locale `nb-NO`. Dates use `@internationalized/date` (`CalendarDate` for dates without times) and are shown with `Intl.DateTimeFormat('nb-NO')`. Dates are stored as ISO 8601 strings: `YYYY-MM-DD` for dates and full timestamps with a UTC offset for times. All interface text is written directly in Norwegian Bokmål in the components. There is no translation library, because there is only one language.
- **Rationale**: FR-026 and the project owner's request for the `nb-NO` locale for dates. React Aria then gives Norwegian month names, Norwegian date order, Monday as the first day of the week, and Norwegian screen reader text for its built-in parts.

## 12. Desktop and mobile layouts

- **Decision**: One breakpoint at `48rem` (768 px). Below it the mobile layout is used, and from it the desktop layout. Layouts that differ only in arrangement (columns, spacing, header bar versus "Meny" button) are switched with CSS media queries. Where the component structure differs, such as the request page using side-by-side columns on desktop and tabs on mobile, a `useLayout()` hook based on `window.matchMedia` chooses the component. Each page in [contracts/routes.md](./contracts/routes.md) describes both layouts.
- **Rationale**: FR-034 requires a separately designed desktop layout, not an enlarged mobile one. Content still reflows down to 320 px wide (WCAG 1.4.10).

## 13. Testing

- **Decision**:
  - **Vitest 5** for unit tests of the pure domain functions and the seed step, and for component tests with **React Testing Library 16**, `@testing-library/user-event` 14, and **jsdom 31**. Unit and component tests sit next to the file they test as `*.test.ts` or `*.test.tsx`.
  - **jest-axe 11** (its `toHaveNoViolations` matcher works with Vitest's `expect.extend`) runs axe-core accessibility checks in component tests.
  - **Playwright 1.65** with **@axe-core/playwright 4.14** for end-to-end tests in `tests/e2e/`, run at a desktop size (1280×800) and a mobile size (390×844). Every page gets an axe scan with the WCAG 2.0 and 2.1 A and AA rule tags, and the main user journeys from the spec are run end to end.
  - Test-first order per constitution principle III: each domain rule and each acceptance scenario gets a failing test before its implementation.
- **Rationale**: Vitest shares Vite's configuration. Pure domain functions make the matching, status, and permission rules quick to test. Automated axe checks catch about a third of WCAG problems. The rest (keyboard use, screen reader use, focus order) are covered by the manual checks in [quickstart.md](./quickstart.md).
- **Alternatives considered**: Jest (needs separate transform setup with Vite), `vitest-axe` (version 0.1.0, not maintained), Cypress (Playwright has better mobile viewport and multi-browser support).

## 14. Linting and formatting

- **Decision**: Biome 2.6 (`@biomejs/biome`, pinned to an exact version) for both linting and formatting of TypeScript, TSX, JSON, and CSS, configured in `biome.json` at the repository root. `tsc --noEmit` for type checks. No ESLint and no Prettier.
  - Biome's recommended rules are on, including the whole `a11y` group (accessibility rules for JSX, such as missing labels, alt text, and valid ARIA attributes).
  - `correctness/useExhaustiveDependencies` and `correctness/useHookAtTopLevel` are turned on as errors, to cover React's hook rules.
  - The formatter uses Biome's defaults (2-space indent, double quotes, 80-column lines), with the generated `src/seed/seed-data.json` excluded so its byte-for-byte format stays under the seed step's control.
  - `pnpm lint` runs `biome check` (lint and format check, failing on any problem). `pnpm format` runs `biome check --write` to fix what can be fixed automatically.
- **Rationale**: Chosen by the project owner. Biome is one fast tool with one configuration file, and it also covers the plain CSS files, which ESLint does not. Its `a11y` rules catch common accessibility mistakes while writing code, before tests run.
- **Alternatives considered**: ESLint with `typescript-eslint`, `eslint-plugin-react-hooks`, and `eslint-plugin-jsx-a11y`, plus Prettier (rejected by the project owner).

## 15. Identifiers

- **Decision**: Seed records have readable, stable IDs such as `bedrift-1`, `person-3`, and `oppdrag-2`. Records created during a demo get IDs from `crypto.randomUUID()`.
- **Rationale**: Stable IDs keep the seed file identical between runs and make tests easy to read.
