---

description: "Task list for feature 001-job-matching-marketplace"
---

# Tasks: Job-Matching Marketplace

**Input**: Design documents from `/specs/001-job-matching-marketplace/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Required. Constitution principle III and the plan's Constitution Check make this project test-driven: every domain rule and every acceptance scenario gets a test that is written first, fails, and then passes once the implementation task is done. A task is not done until its tests pass.

**Organization**: Tasks are grouped by user story so each story can be built and checked on its own after the shared frame (US1) is in place.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: Which user story the task belongs to (US1–US5)
- Every task names the exact file paths it creates or changes

## Rules that apply to every task

- No comments in code (project owner's rule).
- Application code is written by subagents running Claude Sonnet 5.5 (`claude-sonnet-5-5`) at medium reasoning effort; the main agent hands out tasks and checks the results (plan.md Implementation Notes).
- Domain functions in `src/domain/` are pure TypeScript with no React import. They never read the clock, `localStorage`, the DOM, or `crypto`. Time, the acting person, and new IDs come from the command context.
- All interface text is written directly in Norwegian Bokmål, in the warm "du"/"vi" tone of the spec's Design Language section.
- CSS uses only the custom properties in `src/frame/design/tokens.css`. No raw colour values outside that file.
- Unit and component tests sit next to the file they test as `*.test.ts` or `*.test.tsx`.
- "Run the tests" means `pnpm test` for Vitest tasks and `pnpm test:e2e` for Playwright tasks.

## Path conventions

Single frontend project at the repository root (plan.md Project Structure): `src/`, `scripts/seed/`, `tests/e2e/`, `tests/setup/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the project, tooling, and empty test runners.

- [X] T001 Create `package.json` at the repository root with `"name": "varodd-prototype"`, `"private": true`, `"type": "module"`, `"packageManager": "pnpm@12"`, `"engines": { "node": ">=26" }`, and the scripts `dev` (`vite`), `build` (`tsc --noEmit && vite build`), `preview` (`vite preview`), `test` (`vitest run`), `test:e2e` (`playwright test`), `lint` (`biome check .`), `format` (`biome check --write .`), `typecheck` (`tsc --noEmit`), `seed` (`tsx scripts/seed/generate.ts`). Add dependencies `react@19.3`, `react-dom@19.3`, `react-aria-components@1.22`, `@internationalized/date@3.12`, `react-router@8`, `zod@4`, `@fontsource/bree-serif@5.3`, `@fontsource/barlow@5.3`; dev dependencies `typescript@7.0`, `@types/react`, `@types/react-dom`, `@types/node`, `vite@8`, `@vitejs/plugin-react@6`, `tsx@4`, `@biomejs/biome@2.6` (exact version), `vitest@5`, `jsdom@31`, `@testing-library/react@16`, `@testing-library/user-event@14`, `jest-axe@11`, `@types/jest-axe`, `@playwright/test@1.65`, `@axe-core/playwright@4.14`. Run `pnpm install` to produce `pnpm-lock.yaml`
- [X] T002 [P] Add `node_modules/`, `dist/`, `test-results/`, `playwright-report/`, and `coverage/` to the existing `.gitignore` at the repository root, keeping its current lines
- [X] T003 [P] Create `tsconfig.json` with `strict: true`, `noUncheckedIndexedAccess: true`, `target: "ES2023"`, `module: "ESNext"`, `moduleResolution: "bundler"`, `jsx: "react-jsx"`, `resolveJsonModule: true`, `types: ["vite/client", "node"]`, `noEmit: true`, and `include: ["src", "scripts", "tests", "vite.config.ts", "playwright.config.ts"]`. If `pnpm typecheck` fails on dependency type definitions with TypeScript 7, switch `typescript` to the newest 6.x release in `package.json` and record the change in `specs/001-job-matching-marketplace/research.md` §1
- [X] T004 [P] Create `biome.json` per research.md §14: recommended rules on, the whole `a11y` group on, `correctness/useExhaustiveDependencies` and `correctness/useHookAtTopLevel` as errors, formatter defaults (2-space indent, double quotes, 80 columns), files covered TypeScript, TSX, JSON, CSS, and `src/seed/seed-data.json` excluded from formatting and linting
- [X] T005 [P] Create `vite.config.ts` with `@vitejs/plugin-react`, `base: "./"`, and a `test` block: `environment: "jsdom"`, `setupFiles: ["tests/setup/vitest.setup.ts"]`, `include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"]`, `passWithNoTests: true`
- [X] T006 [P] Create `tests/setup/vitest.setup.ts` that registers `toHaveNoViolations` from `jest-axe` with `expect.extend`, declares the matcher type for Vitest's `Assertion` interface, and calls Testing Library's `cleanup` after each test
- [X] T007 [P] Create `playwright.config.ts` with `testDir: "tests/e2e"`, a `webServer` that runs `pnpm build && pnpm preview --port 4173` on `http://localhost:4173`, and two projects: `desktop` (Chromium, viewport 1280×800) and `mobile` (WebKit, viewport 390×844, `isMobile: true`, `hasTouch: true`)
- [X] T008 [P] Create `index.html` with `<html lang="nb">`, `<meta charset="utf-8">`, a viewport meta tag, `<title>Varodd</title>`, `<div id="root"></div>`, and `<script type="module" src="/src/main.tsx"></script>`
- [X] T009 Run `pnpm lint`, `pnpm typecheck`, and `pnpm test` on the empty project and fix configuration until all three pass

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Domain types, the command system, the store, browser storage, the seed step, design tokens, the shared UI kit, and the router. Nothing a user can see yet beyond an empty page inside a skip-linked layout.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Domain types

- [X] T010 Create `src/domain/frame/types.ts` with the frame types from data-model.md: `Id` (string), `IsoDate` (`YYYY-MM-DD`), `IsoDateTime` (ISO 8601 with UTC offset), `Actor` (`Id | "system"`), `Person` (`id`, `name`, `isVaroddAdmin`, `seeksWork`, `description`), `Business` (`id`, `name`, `description`, `ownerId`, `employeeIds` "0–2", `isEWavesMember`, `crawlOptIn`, `crawlSuggestions: Id[]`, `crawlSuggestionsUpdatedAt?`), `Skill` (`id`, `name`), `Audience` (`{ personIds: Id[]; groups: string[] }`), `ActivityEntry` (`id`, `at`, `featureId`, `actor`, `text`, `target: { route: string }`, `audience`), `DemoState` (`meta: { seedId; anchorDate; loadedAt }`, `frame: { people; businesses; skills; activity }`, `marketplace: MarketplaceState`), `CommandContext` (`{ actorId: Id; now: IsoDateTime; newId: () => Id }`), `Command` (`{ type: string } & Record<string, unknown>`), `Notice` (`{ kind: "info" | "warning"; message: string }`), `CommandError` (`{ code: "not-allowed" | "not-found" | "invalid-status" | "validation" | "excluded-worker"; message: string; fieldErrors?: Record<string, string> }`), `CommandResult` (`{ ok: true; state; notices } | { ok: false; error }`), `CommandHandler` (`(state, command, context) => CommandResult`), and `SystemStep` (`(state: DemoState, now: IsoDateTime) => DemoState`)
- [X] T011 [P] Create `src/domain/marketplace/types.ts` with every marketplace type from data-model.md, field names and optionality exactly as listed: `ExperienceLevel` (`"junior" | "mid" | "senior"`), `WorkerProfile`, `RequestStatus` (`open`, `shortlisted`, `offered`, `agreed`, `in-progress`, `completed`, `cancelled`, `under-review`), `ExclusionReason` (`"declined" | "offer-expired" | "withdrew" | "shortlist-rejected"`), `ShortlistEntry` (with `state: "active" | "offered" | "removed"` and `removedReason?: ExclusionReason | "accepted-elsewhere"`), `Outcome` (`"as-planned" | "extended" | "permanent" | "not-completed"`), `TaskRequest` (with `estimatedDuration: { amount: number; unit: "weeks" | "months" }` and `workLocation: "remote" | "onsite"`), `Conversation`, `LogEventKind` (all 18 kinds listed in data-model.md), `LogEvent` (with `simulated?: true`), `CrawlCatalogEntry` (`rounds: Id[][]`), `CrawlRun` (`simulated: true`), `MarketplaceState` (`workerProfiles`, `requests`, `conversations`, `crawlCatalog`, `crawlRuns`), and one input type per command in contracts/commands.md

### Frame domain rules (test first)

- [X] T013 [P] Write failing tests in `src/domain/frame/people.test.ts` for `isOwnerOf(personId, business)`, `ownedBusiness(personId, state)`, `isAdmin(person)`, `workerProfileOf(personId, state)`, and `peopleWorkingAt(business, state)`: the owner and `employeeIds` are always included; a worker whose request for this business is `in-progress` is included; a worker whose request is `completed` with outcome `permanent` is included; `completed` with `as-planned` or `extended`, and `cancelled`, are not included; nobody is listed twice
- [X] T014 Implement `src/domain/frame/people.ts` so the tests in `src/domain/frame/people.test.ts` pass
- [X] T015 [P] Write failing tests in `src/domain/frame/activity.test.ts` for `canSeeEntry(entry, person, state, groups)` and `visibleActivity(state, person, groups)`: a person sees an entry if they are in `audience.personIds`, belong to one of `audience.groups` (checked when called, using the `groups` record of functions passed in, so membership changes are reflected), or are a Varodd administrator; entries for unknown groups are hidden from non-admins; `visibleActivity` returns entries newest first by `at`
- [X] T016 Implement `src/domain/frame/activity.ts` so the tests in `src/domain/frame/activity.test.ts` pass
- [X] T017 [P] Write failing tests in `src/domain/frame/commands.test.ts` for `createApplyCommand({ handlers, systemSteps })`: it runs every system step with `context.now` before the handler; it dispatches on `command.type`; an unknown type returns `{ ok: false, error: { code: "not-found" } }`; a failed handler result leaves the input state unchanged; the input state is never mutated (deep-freeze it in the test); a person ID in `context.actorId` that is not in `frame.people` returns `not-allowed`
- [X] T018 Implement `src/domain/frame/commands.ts` so the tests in `src/domain/frame/commands.test.ts` pass

### Stored-data schemas

- [X] T019 Create `src/frame/store/schema.ts` with Zod 4 schemas for every frame type in `src/domain/frame/types.ts` (`IsoDate` as a `YYYY-MM-DD` regex, `IsoDateTime` as an ISO datetime with offset), and three builders that each take `featureSchemas: Record<string, ZodType>`: `buildDemoStateSchema` (combines `meta`, `frame`, and one part per feature), `buildStoredStateSchema` (the stored value `{ format: 1, seedId: string, state: DemoState }`), and `buildSeedFileSchema` (the seed file shape in contracts/seed-and-storage.md: `format: 1`, `seedId`, `anchorDate`, `frame`, and one part per feature at the top level)
- [X] T020 [P] Create `src/features/marketplace/schema.ts` with a Zod 4 schema for `MarketplaceState` that enforces the data-model constraints verbatim: `title` "1–100 characters"; `description` "1–4000 characters"; `requiredSkillIds` "At least 1"; `estimatedDuration.amount` "Whole number, `amount ≥ 1`"; `hoursPerWeek` "Whole number, 1–60"; message `text` "1–2000 characters"; `rejection.reason` and `cancellation.reason` 1–1000 characters; `navReferral.simulated` and `CrawlRun.simulated` literal `true`; `LogEvent.simulated` optional literal `true`

### Seed step infrastructure

- [X] T021 [P] Write failing tests in `scripts/seed/random.test.ts`: `mulberry32(seed)` gives the same sequence for the same seed; `deriveRng(baseSeed, key)` gives different, repeatable sequences for different keys, and adding a new key does not change the sequence of an existing key; helpers `pick(rng, list)`, `shuffle(rng, list)` (returns a new array), and `int(rng, min, max)` are repeatable
- [X] T022 Implement `scripts/seed/random.ts` (mulberry32, `deriveRng` from a string hash of `baseSeed + key`, `pick`, `shuffle`, `int`) so the tests in `scripts/seed/random.test.ts` pass
- [X] T023 Write failing tests in `scripts/seed/generate.test.ts`: `buildSeedFile()` from `scripts/seed/generate.ts` is byte-for-byte equal to the committed `src/seed/seed-data.json` (FR-032); calling it twice gives the same string; the stored `seedId` is the SHA-256 hex of the file content with `seedId` set to `""`; the parsed file passes `buildSeedFileSchema({ marketplace: <the schema from src/features/marketplace/schema.ts> })`; the frame part has 4–6 businesses, each with 1–3 people working there (owner plus `employeeIds`) and exactly one owner; at least 2 businesses with `crawlOptIn: true` and at least 1 with `false`; at least 2 with `isEWavesMember: true`; at least 1 Varodd administrator; 7–8 people with `seeksWork: true` who do not work at any business; 10–15 people in total; every `ownerId` and `employeeIds` entry points to an existing person; 15–20 skills
- [X] T024 Create `scripts/seed/frame.ts` exporting `buildFrameSeed(rng)` with hand-written Norwegian content that meets the frame rules tested in T023: about 5 fictional businesses (Norwegian names and one-line descriptions of what they sell, such as a solo Shopify store), each with 1–3 people working there including exactly one owner; at least 2 businesses with `crawlOptIn: true` and at least 1 with `false`; at least 2 with `isEWavesMember: true`; `crawlSuggestions: []` on every business for now; at least 1 Varodd administrator; 7–8 people with `seeksWork: true` who do not work at any business; 10–15 people in total, each with a short `description` such as "Eier av Fjordlys Keramikk"; a shared Norwegian skill list of 15–20 skills (such as "Produktfotografering", "Shopify-oppsett", "Søkemotoroptimalisering", "Regnskap"). Use readable IDs `person-N`, `bedrift-N`, `ferdighet-N`. Do not read the clock
- [X] T025 Create `scripts/seed/marketplace.ts` exporting a `SeedModule` (type from contracts/shared-frame.md, `(rng, frame) => { key: "marketplace"; data: MarketplaceState; activity: ActivityEntry[] }`) that for now returns empty arrays for every `MarketplaceState` list and no activity
- [X] T026 Create `scripts/seed/generate.ts` exporting `buildSeedFile(): string` and running it when executed directly: anchor date `2026-11-16`, fixed base seed, frame module first, then each feature module in feature order with its own `deriveRng(baseSeed, key)`; collect each module's activity into `frame.activity`; build the object with keys in the order `format` (1), `seedId`, `anchorDate`, `frame`, `marketplace`; compute `seedId` as the SHA-256 hex of `JSON.stringify(data, null, 2) + "\n"` with `seedId` set to `""`; return `JSON.stringify(data, null, 2) + "\n"`; when run directly, write it to `src/seed/seed-data.json`
- [X] T027 Run `pnpm seed` to write `src/seed/seed-data.json`, then run the tests in `scripts/seed/generate.test.ts` until they pass

### Loading seed data and browser storage (test first)

- [X] T028 [P] Write failing tests in `src/frame/store/seed.test.ts` for `daysBetween(anchorDate, today)` (whole local days, can be 0) and `shiftSeedDates(seed, days)`: every `IsoDate` and `IsoDateTime` field moves forward by exactly `days` whole days and keeps its time of day; no other field changes; and a schema-coverage test that walks the whole shifted object and asserts that every string matching `^\d{4}-\d{2}-\d{2}` was moved, so the test fails if a date field is missing from the explicit list in `shiftSeedDates`. Also test `loadSeedState(today)` returns a `DemoState` with `meta.seedId`, `meta.anchorDate`, and `meta.loadedAt` set
- [X] T029 Implement `src/frame/store/seed.ts` (imports `src/seed/seed-data.json`; `shiftSeedDates` lists every date field of the frame and marketplace types explicitly) so the tests in `src/frame/store/seed.test.ts` pass
- [X] T030 [P] Write failing tests in `src/frame/store/persistence.test.ts` for the rules in contracts/seed-and-storage.md: keys `varodd-prototype:state` and `varodd-prototype:user`; `loadState` falls back to the seed (and saves it) when the stored value is missing, cannot be parsed, fails the schema, has another `format`, or has a `seedId` different from the bundled seed; `loadUser` returns the stored person ID if it is in the state, otherwise the first business owner in the seed; `saveState` and `saveUser` write JSON; when `localStorage` throws, the functions report `storageAvailable: false` and never throw
- [X] T031 Implement `src/frame/store/persistence.ts` so the tests in `src/frame/store/persistence.test.ts` pass
- [X] T032 [P] Write failing tests in `src/frame/store/store.test.ts` for `createStore({ applyCommand, systemSteps, now, newId, storage })`: on creation it loads state, runs system steps with `now()`, and saves if anything changed; `dispatch(command)` calls `applyCommand` with `{ actorId: selectedUserId, now: now(), newId }`, saves and notifies subscribers on success, and returns the result; a failed dispatch neither saves nor notifies; `selectUser(id)` saves the user and notifies; `reset()` loads fresh seed data with shifted dates, saves it, and keeps the selected user; a `storage` event for either key reloads from storage; `startClock()` runs system steps every 60 000 ms (use fake timers) and `stopClock()` stops it
- [X] T033 Implement `src/frame/store/store.ts` (with `useDemoState()`, `useSelectedUserId()`, `useDispatch()` React hooks built on `useSyncExternalStore`, and a `StoreProvider`) so the tests in `src/frame/store/store.test.ts` pass
- [X] T034 [P] Write a failing test in `src/frame/store/useLayout.test.ts` for `useLayout()`: returns `"desktop"` when `window.matchMedia("(min-width: 48rem)")` matches and `"mobile"` otherwise, and updates when the media query changes
- [X] T035 Implement `src/frame/store/useLayout.ts` so the test in `src/frame/store/useLayout.test.ts` passes

### Design language

- [X] T036 [P] Create `src/frame/design/tokens.css` with every token in contracts/shared-frame.md §Design tokens on `:root`, with exactly the listed values (colours, typography, shape, spacing, layout, `--target-size-min: 2.75rem`), plus `--font-size-h1: 1.875rem` inside `@media (min-width: 48rem) { :root { --font-size-h1: 2.25rem } }`
- [X] T037 [P] Create `src/frame/design/base.css`: `body` uses `--font-body`, `--font-size-body`, `--line-height-body`, `--color-text` on `--color-background`; `h1`–`h4` use `--font-heading`, weight 400, `--line-height-heading`, and their size tokens; links in `--color-navy`, `--color-navy-hover` on hover; `:focus-visible` outline `--focus-ring` with `outline-offset: 2px`; a `.visually-hidden` class; 150 ms transitions turned off under `@media (prefers-reduced-motion: reduce)`
- [X] T038 [P] Create `src/frame/design/fonts.ts` that imports only `@fontsource/bree-serif/400.css`, `@fontsource/barlow/400.css`, `@fontsource/barlow/600.css`, and `@fontsource/barlow/700.css`

### Shared UI components

Rules for T039–T048: copy the matching component source from the React Aria Components **Vanilla CSS starter kit** into `src/frame/ui/`, keep the `.react-aria-*` class names, and restyle each in its own CSS file next to it using only tokens. Primary buttons are solid `--color-navy` with white `--font-weight-semibold` text and `--radius` corners, `--color-navy-hover` on `[data-hovered]`, `--color-navy-pressed` on `[data-pressed]`; secondary buttons have a navy outline on a transparent background; form fields are white with a `--color-grey-300` border, `--radius`, `--shadow-field`, a navy border when focused and a `--color-error-text` border on `[data-invalid]`. Every component has visible hover, pressed, focus-visible, disabled, and invalid states where they apply, and click targets at least `--target-size-min` tall. Every component gets a component test that renders it with Norwegian labels, checks its main behaviour with `user-event`, and asserts `expect(await axe(container)).toHaveNoViolations()`.

- [X] T039 [P] Create `Button` (variants `primary`, `secondary`, `quiet`) and `Link` in `src/frame/ui/Button.tsx`, `src/frame/ui/Button.css`, `src/frame/ui/Button.test.tsx`, `src/frame/ui/Link.tsx`, `src/frame/ui/Link.css`, `src/frame/ui/Link.test.tsx`
- [X] T040 [P] Create `TextField`, `TextArea`, and `NumberField` (each with label, description, and error message slots) in `src/frame/ui/TextField.tsx`, `src/frame/ui/TextArea.tsx`, `src/frame/ui/NumberField.tsx`, `src/frame/ui/Field.css`, `src/frame/ui/Field.test.tsx`
- [X] T041 [P] Create `Select` (with `Section` support for grouped options) and `ComboBox` in `src/frame/ui/Select.tsx`, `src/frame/ui/ComboBox.tsx`, `src/frame/ui/ListBox.css`, `src/frame/ui/Select.test.tsx`, `src/frame/ui/ComboBox.test.tsx`
- [X] T042 [P] Create `TagPicker` (searchable multi-select: a `ComboBox` to search the options, and a `TagGroup` of selected items with a remove button on each tag; props `label`, `items`, `selectedKeys`, `onSelectionChange`, optional `markedKeys` with `markLabel` to show a small text marker such as "Forslag" on chosen tags, and `errorMessage`) in `src/frame/ui/TagPicker.tsx`, `src/frame/ui/TagPicker.css`, `src/frame/ui/TagPicker.test.tsx`; the test covers adding by typing and Enter, removing by keyboard, and that a marked tag's marker is part of its accessible name
- [X] T043 [P] Create `RadioGroup` and `Switch` in `src/frame/ui/RadioGroup.tsx`, `src/frame/ui/Switch.tsx`, `src/frame/ui/Choice.css`, `src/frame/ui/RadioGroup.test.tsx`, `src/frame/ui/Switch.test.tsx`
- [X] T044 [P] Create `DatePicker` (value as `CalendarDate` from `@internationalized/date`, popover calendar) in `src/frame/ui/DatePicker.tsx`, `src/frame/ui/DatePicker.css`, `src/frame/ui/DatePicker.test.tsx`; the test wraps it in `I18nProvider locale="nb-NO"` and checks Norwegian month names and Monday as the first weekday
- [X] T045 [P] Create `Dialog` (modal with heading) and `AlertDialog` (props `title`, `text`, `confirmLabel`, `cancelLabel`, `onConfirm`, optional `reasonLabel`; when `reasonLabel` is given, a required `TextArea` limited to 1–1000 characters must be filled before confirm is enabled, and `onConfirm(reason)` receives it) in `src/frame/ui/Dialog.tsx`, `src/frame/ui/AlertDialog.tsx`, `src/frame/ui/Dialog.css`, `src/frame/ui/Dialog.test.tsx`; the test checks focus is trapped, Escape closes, and focus returns to the trigger
- [X] T046 [P] Create `Menu`, `Disclosure`, and `Tabs` in `src/frame/ui/Menu.tsx`, `src/frame/ui/Disclosure.tsx`, `src/frame/ui/Tabs.tsx`, `src/frame/ui/Navigation.css`, `src/frame/ui/Menu.test.tsx`, `src/frame/ui/Disclosure.test.tsx`, `src/frame/ui/Tabs.test.tsx`
- [X] T047 [P] Create `Card` (heading, short text, one action slot, `--color-grey-50` background, `--shadow-card`), `StatusBadge` (props `label` and `tone: "neutral" | "info" | "success" | "warning" | "error"`; the visible text is always the label; success and warning use the base colour as a fill behind `--color-text`; error uses `--color-error-text` text on white, never a red fill), `Notice` (tones info, success, warning, error, using the `-text` colour versions for text and icons), and `EmptyState` in `src/frame/ui/Card.tsx`, `src/frame/ui/StatusBadge.tsx`, `src/frame/ui/Notice.tsx`, `src/frame/ui/EmptyState.tsx`, `src/frame/ui/Content.css`, and one `*.test.tsx` file per component
- [X] T048 [P] Create `LiveAnnouncer` (a provider rendering one visually hidden `aria-live="polite"` region, and a `useAnnounce()` hook that sets its text) and `PageHeading` (renders the page's single `<h1>` with `tabIndex={-1}`, sets `document.title` to "*children* – Varodd", and receives focus after each route change but not on first load) in `src/frame/ui/LiveAnnouncer.tsx`, `src/frame/ui/PageHeading.tsx`, `src/frame/ui/LiveAnnouncer.test.tsx`, `src/frame/ui/PageHeading.test.tsx`

### Feature registry, router, and app shell

- [ ] T049 Create `src/app/features.ts` exporting the `FeatureDefinition` type (fields as in contracts/shared-frame.md: `id`, `label`, `basePath`, `homeCard`, `routes`, `audienceGroups`, `commandHandlers`, `stateSchema`, `systemSteps`), the ordered `features` list, and derived values `allCommandHandlers`, `allAudienceGroups`, `allSystemSteps`, `demoStateSchema`, `storedStateSchema`, and `seedFileSchema` (from the three builders in `src/frame/store/schema.ts`)
- [ ] T050 Create `src/features/marketplace/feature.ts` with the "Oppdrag" definition: `id: "marketplace"`, `label: "Oppdrag"`, `basePath: "/oppdrag"`, `stateSchema` from `src/features/marketplace/schema.ts`, `routes` with a single `/oppdrag` route rendering a placeholder page with `PageHeading` "Oppdrag", `homeCard` returning "Få hjelp med små oppdrag" / "Beskriv hva du trenger hjelp til, så finner vi folk som kan hjelpe deg." / "Gå til oppdrag" / `/oppdrag` for every person for now, `audienceGroups: {}`, `commandHandlers: {}`, `systemSteps: []`. Register it in `src/app/features.ts`
- [ ] T051 [P] Write a failing test in `src/frame/layout/PageLayout.test.tsx`: the layout renders a "Hopp til hovedinnhold" skip link as the first focusable element that moves focus to `<main id="hovedinnhold">`, and renders `header`, `main`, and `footer` landmarks around its children
- [ ] T052 Implement `src/frame/layout/PageLayout.tsx` and `src/frame/layout/PageLayout.css` (content centred at max `--width-page`, side padding `--space-4` on mobile and `--space-6` on desktop) with `header` and `footer` slots, so the test in `src/frame/layout/PageLayout.test.tsx` passes
- [ ] T053 Create `src/app/router.tsx` that builds a hash router (`createHashRouter` from React Router 8) with one root route rendering `PageLayout` and an `<Outlet />`, a `/` route with a placeholder `PageHeading` "Hjem", and every route from every `FeatureDefinition` in `src/app/features.ts`
- [ ] T054 Create `src/app/App.tsx` (wraps the app in `StoreProvider` built with `createApplyCommand({ handlers: allCommandHandlers, systemSteps: allSystemSteps })`, `() => new Date().toISOString()`, `crypto.randomUUID`, and `window.localStorage`; `I18nProvider locale="nb-NO"`; React Aria `RouterProvider` connected to React Router's `useNavigate` and `useHref`; `LiveAnnouncer`; starts the store clock on mount and stops it on unmount) and `src/main.tsx` (imports `src/frame/design/fonts.ts`, `tokens.css`, `base.css`, renders `App` into `#root`)
- [ ] T055 Run `pnpm dev`, open `http://localhost:5173/#/` and `/#/oppdrag`, and confirm both render with no console errors; then run `pnpm lint`, `pnpm typecheck`, and `pnpm test` until they pass

**Checkpoint**: The project builds, data loads from the seed into `localStorage`, commands can be dispatched, and the UI kit exists. User story work can start.

---

## Phase 3: User Story 1 – Shared home page and demo controls (Priority: P1) 🎯 MVP

**Goal**: The shared frame every feature runs in: header with feature buttons, user switcher, mobile "Meny", footer, home page with feature cards and the activity feed, demo reset, the time debug button and "Simulert" label components, not-found and no-access pages, desktop and mobile layouts.

**Independent Test**: Switch between simulated users, move between features from the header on desktop and on mobile, follow an activity feed entry to its page, change stored data, reset, and confirm the seed data is back and the same user is still selected. (Quickstart scenarios 1, 2, 13, 14.)

### Tests for User Story 1 (write first, must fail)

- [ ] T056 [P] [US1] Add failing tests to `src/domain/frame/people.test.ts` for `switcherSection(person, state)`: returns `"Bedriftseiere"` for an owner, `"Ansatte"` for a person in some `employeeIds`, `"Arbeidssøkere"` for a person with `seeksWork`, `"Varodd"` for an admin, checked in that order so a person with several roles gets the first matching section only
- [ ] T057 [P] [US1] Write failing tests in `src/frame/users/UserSwitcher.test.tsx`: a React Aria `Select` labelled "Bytt bruker" shows the current person's name and description; options are grouped in the sections Bedriftseiere, Ansatte, Arbeidssøkere, Varodd in that order; each person appears once; choosing a person calls `selectUser`, keeps the current route, and announces "Du ser nå prototypen som *name*" through `LiveAnnouncer`; `jest-axe` passes
- [ ] T058 [P] [US1] Write failing tests in `src/frame/layout/Header.test.tsx`: "Varodd" in `--font-heading` links to `/`; the navy bar has a "Hjem" button and one button per registered feature (label from the registry) in registry order; the button for the current route has `aria-current="page"`; the bar contains the user switcher and "Tilbakestill demo"; in a `"mobile"` layout only "Varodd" and a "Meny" button are shown in the bar; `jest-axe` passes
- [ ] T059 [P] [US1] Write failing tests in `src/frame/layout/MobileMenu.test.tsx`: pressing "Meny" opens a dialog containing the feature buttons, the user switcher, and "Tilbakestill demo"; focus is trapped while open; Escape closes it and focus returns to "Meny"; choosing a feature navigates, closes the menu, and moves focus to the page `<h1>`; `jest-axe` passes
- [ ] T060 [P] [US1] Write failing tests in `src/frame/activity/formatRelativeTime.test.ts` for `formatRelativeTime(at, now)` using `Intl.RelativeTimeFormat("nb-NO", { numeric: "auto" })`: 5 minutes ago gives "for 5 minutter siden", 1 day ago gives "i går", and under one minute gives "nå"
- [ ] T061 [P] [US1] Write failing tests in `src/frame/activity/ActivityFeed.test.tsx` with a fixture state: only entries the current person may see are shown (an entry for another pair's conversation is hidden from a third person, and shown to an admin); entries are newest first; each entry is a link to `entry.target.route` showing its text, the feature label from the registry, and the relative time inside `<time dateTime={entry.at}>`; at most 20 entries are shown and "Vis flere" shows 20 more; an empty feed shows an `EmptyState` "Ingenting har skjedd ennå"; `jest-axe` passes
- [ ] T062 [P] [US1] Write failing tests in `src/frame/demo/ResetDemoButton.test.tsx`: "Tilbakestill demo" opens an `AlertDialog` with the text "Vil du tilbakestille demoen? Alle endringer i denne nettleseren blir slettet." and buttons "Tilbakestill" and "Avbryt"; "Avbryt" changes nothing; "Tilbakestill" calls the store's `reset()`, navigates to `/`, and announces "Demoen er tilbakestilt"; `jest-axe` passes
- [ ] T063 [P] [US1] Write failing tests in `src/frame/ui/TimeDebugButton.test.tsx` and `src/frame/ui/SimulatedLabel.test.tsx`: `TimeDebugButton` renders a button whose visible text and accessible name start with "Demo:" followed by `label`, has a clock icon with `aria-hidden="true"`, has the class `time-debug-button` (dashed border in CSS), and calls `onPress`; `SimulatedLabel` renders the text "Simulert"; `jest-axe` passes for both
- [ ] T064 [P] [US1] Write failing tests in `src/frame/home/HomePage.test.tsx`: the `<h1>` reads "Hei, *first name*!"; one `Card` is shown per feature whose `homeCard(person, state)` is not `null`, with its title, text, and one action link to its `route`; the activity feed is shown; `jest-axe` passes. Add `src/frame/home/NotFoundPage.test.tsx` ("Siden finnes ikke" with a link "Gå til forsiden") and `src/frame/home/NoAccessPage.test.tsx` ("Du har ikke tilgang til denne siden" with a short friendly explanation and a link to `/`)
- [ ] T065 [P] [US1] Write failing tests in `src/frame/layout/RequireAccess.test.tsx` for `<RequireAccess allowed={(person, state) => boolean}>`: renders its children when allowed, `NoAccessPage` when not, and re-checks when the selected user changes
- [ ] T066 [P] [US1] Write failing tests in `src/frame/layout/Footer.test.tsx`: shows "Dette er en prototype. Alle personer, bedrifter og data er oppdiktet."; also shows "Endringer lagres ikke i denne nettleseren" only when the store reports `storageAvailable: false`
- [ ] T067 [P] [US1] Write failing Playwright tests in `tests/e2e/frame.spec.ts` (run on both projects): switching user in "Bytt bruker" changes the home greeting to the chosen person (scenario 1); every header button opens its page with the `<h1>` focused, on mobile through "Meny" with the menu closed afterwards (scenario 2); desktop shows feature cards and feed side by side and mobile shows them stacked (US1-8); after writing a changed state into `localStorage` with `page.evaluate` and reloading, "Tilbakestill demo" → "Tilbakestill" restores the seed data and keeps the selected user (scenario 13, SC-006); a new browser context does not see changes made in the first (scenario 14, US1-6); `/#/finnes-ikke` shows "Siden finnes ikke"; an `@axe-core/playwright` scan with tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` finds zero violations on `/` and the not-found page

### Implementation for User Story 1

- [ ] T068 [US1] Add `switcherSection` to `src/domain/frame/people.ts` so the new tests in `src/domain/frame/people.test.ts` pass
- [ ] T069 [US1] Create `src/frame/users/useCurrentPerson.ts` returning the selected `Person` from the store
- [ ] T070 [US1] Implement `src/frame/users/UserSwitcher.tsx` and `src/frame/users/UserSwitcher.css` (white text and `--color-focus-on-navy` focus ring inside the navy bar) so the tests in `src/frame/users/UserSwitcher.test.tsx` pass
- [ ] T071 [US1] Implement `src/frame/demo/ResetDemoButton.tsx` so the tests in `src/frame/demo/ResetDemoButton.test.tsx` pass
- [ ] T072 [US1] Implement `src/frame/layout/MobileMenu.tsx` (React Aria `DialogTrigger` with a full-width panel) and `src/frame/layout/MobileMenu.css` so the tests in `src/frame/layout/MobileMenu.test.tsx` pass
- [ ] T073 [US1] Implement `src/frame/layout/Header.tsx` and `src/frame/layout/Header.css` (Varodd name on the left, navy `--color-navy` bar, feature buttons, switcher, and reset on desktop; "Meny" via `MobileMenu` on mobile, chosen with `useLayout()`) so the tests in `src/frame/layout/Header.test.tsx` pass
- [ ] T074 [P] [US1] Implement `src/frame/layout/Footer.tsx` and `src/frame/layout/Footer.css` so the tests in `src/frame/layout/Footer.test.tsx` pass
- [ ] T075 [P] [US1] Implement `src/frame/ui/TimeDebugButton.tsx`, `src/frame/ui/SimulatedLabel.tsx`, and `src/frame/ui/Demo.css` (debug button: dashed `--color-navy` border, transparent background; simulated label: small badge with `--color-info` text and border on `--color-navy-50`) so the tests in `src/frame/ui/TimeDebugButton.test.tsx` and `src/frame/ui/SimulatedLabel.test.tsx` pass
- [ ] T076 [P] [US1] Implement `src/frame/activity/formatRelativeTime.ts` so the tests in `src/frame/activity/formatRelativeTime.test.ts` pass
- [ ] T077 [US1] Implement `src/frame/activity/ActivityFeed.tsx` and `src/frame/activity/ActivityFeed.css` using `visibleActivity` with `allAudienceGroups` so the tests in `src/frame/activity/ActivityFeed.test.tsx` pass
- [ ] T078 [US1] Implement `src/frame/home/HomePage.tsx`, `src/frame/home/HomePage.css` (desktop: two columns, cards about 60% left and feed right; mobile: one column, cards then feed), `src/frame/home/NotFoundPage.tsx`, and `src/frame/home/NoAccessPage.tsx` so the tests in `src/frame/home/*.test.tsx` pass
- [ ] T079 [US1] Implement `src/frame/layout/RequireAccess.tsx` so the tests in `src/frame/layout/RequireAccess.test.tsx` pass
- [ ] T080 [US1] Wire the frame into `src/app/router.tsx`: the root route renders `PageLayout` with `Header` and `Footer`, `/` renders `HomePage`, and `*` renders `NotFoundPage`
- [ ] T081 [US1] Run `pnpm test` and `pnpm test:e2e` until every US1 test, including `tests/e2e/frame.spec.ts`, passes on both projects

**Checkpoint**: The shared frame works on its own. Every later story runs inside it.

---

## Phase 4: User Story 2 – Business owner requests help and chooses a worker (Priority: P1)

**Goal**: An owner publishes a request, matching builds a ranked shortlist of up to 3 workers, and the owner reviews it, invites to interview, messages, makes an offer, or rejects the whole shortlist; the worker accepts; an admin returns a rejected request to Open.

**Independent Test**: As a seeded owner, publish a request with skills seeded workers have, see a ranked shortlist, invite one worker, exchange messages, make an offer, switch to that worker and accept, and see the request become Avtalt. Reject another shortlist with a reason and return it to Open as admin. (Quickstart scenarios 3, 4, 5, 6, 7, 10.)

### Tests for User Story 2 (write first, must fail)

- [ ] T082 [P] [US2] Write failing tests in `src/domain/marketplace/log.test.ts` for the builders in `src/domain/marketplace/log.ts`: each `LogEventKind` used in US2 (`published`, `edited`, `duration-notice`, `shortlisted`, `shortlist-entry-removed`, `interview-invited`, `offered`, `offer-accepted`, `offer-declined`, `shortlist-rejected`, `returned-to-open`, `message-sent`, `status-changed`) produces a `LogEvent` with `id` from `context.newId()`, `at` = `context.now`, the given `actor`, and a Norwegian `text` naming the people involved by name (for example "Kari Nordmann ble lagt til på kortlisten"); `message-sent` text names both people and never contains the message text; `statusLabel(status)` returns Åpen, Kortliste klar, Tilbud sendt, Avtalt, Pågår, Fullført, Avlyst, Til vurdering; matching activity builders return `ActivityEntry` values with `featureId: "marketplace"` and `target.route` `/oppdrag/<requestId>`
- [ ] T083 [P] [US2] Write failing tests in `src/domain/marketplace/matching.test.ts` for `isBusy`, `isEligibleForMatching`, `rankCandidates`, and `fillShortlist(request, state, context)` following data-model.md §Matching rules: a worker is eligible only if `matchedSkills / requiredSkills ≥ 0.5` and `availableFrom ≤ desiredStartDate`; drafts, incomplete profiles, busy workers (agreed worker on an `agreed` or `in-progress` request), workers in `excludedWorkerIds`, and workers with an `active` or `offered` entry on this request are never candidates; ranking is share of required skills (higher first), then `availableFrom` (earlier first), then `lastShortlistedAt` (older first, never shortlisted counts as oldest), then `eligibleSince` (earlier first), then `personId` string order; two workers identical except `navReferral` rank by `personId` only (US2-10); changing `experienceLevel`, `hoursPerWeek`, `workLocation`, or `additionalRequirements` never changes the result; filling stops at 3 entries that are `active` or `offered`; each added entry has a 1-based `rank`, `addedAt`, `matchedSkillIds`, `missingSkillIds`, `state: "active"`; each added worker gets `lastShortlistedAt = now` and a `Conversation` with the owner if none exists for this request; an Open request with at least 1 `active` entry becomes `shortlisted`, and an Open request whose only entries are `removed` stays `open`; a Shortlisted request with 0 `active` entries becomes `open`; an Offered request keeps its status; matching does nothing for any other status; log events and activity use actor `"system"` with the audience in data-model.md (owner + each worker added); `fillRequests(requestIds, state, context)` fills in `createdAt` order, oldest first
- [ ] T084 [P] [US2] Write failing tests in `src/domain/marketplace/visibility.test.ts` for `canSeeRequest(person, request, state)`, `visibleRequests(person, state)`, `canSeeRequestTitle(person, request, state)`, `visibleLogEvents(person, request)`, `canSeeConversation(person, conversation)`, and `canSendMessage(person, conversation, request)` following FR-037, data-model.md, and contracts/routes.md §`/oppdrag`: an owner sees only their own business's requests, in every status; a worker sees every Open request plus requests where they have a non-removed entry or are the agreed worker; a non-owner employee and a person with no worker profile who is not an owner or admin see none; an admin sees every request; `canSeeRequestTitle` is true whenever `canSeeRequest` is true, and also for any person with a non-draft worker profile (such as a worker whose entry was removed, or a worker following a "Nytt oppdrag" entry after the request left Open), and false for everyone else, such as another business's owner or a non-owner employee; an owner and an admin see every log event, a worker only events with their own `workerId` and `status-changed` events; a conversation is visible only to its `ownerId`, `workerId`, and admins; only the owner and the worker can send, while the request is not `completed` or `cancelled` and the worker's entry is not `removed`, or the worker is the agreed worker; admins cannot send
- [ ] T085 [P] [US2] Write failing tests in `src/domain/marketplace/requests.test.ts` for `publishRequest` and `editRequest` per contracts/commands.md: only the owner of `businessId` may publish (`not-allowed` otherwise); validation returns `validation` with a Norwegian message per field for `title` outside "1–100 characters", `description` outside "1–4000 characters", fewer than 1 required skill or an unknown skill ID, missing `desiredStartDate`, `estimatedDuration.amount` not a "Whole number, `amount ≥ 1`", `hoursPerWeek` not a "Whole number, 1–60", and missing `workLocation`; a valid request is stored with `status: "open"`, `createdAt = now`, empty `shortlist` and `excludedWorkerIds`, and log `published`; a duration of `weeks` with `amount < 2` or `amount > 26`, or `months` with `amount > 6`, adds a `warning` notice and a `duration-notice` log event and the request is still published (US2-9); matching runs right after publishing (US2-2); activity "Nytt oppdrag" goes to the owner and group `marketplace.workers`; `editRequest` by the owner of an Open request replaces the fields, logs `edited` (and `duration-notice` if needed), and runs matching; editing any other status returns `invalid-status` (US2-8)
- [ ] T086 [P] [US2] Write failing tests in `src/domain/marketplace/offers.test.ts` for `inviteToInterview`, `makeOffer`, and `acceptOffer` per contracts/commands.md: invite by the owner, status Shortlisted or Offered, entry `active` → sets `interviewInvitedAt`, status unchanged, log `interview-invited`, activity to worker and owner (US2-4); offer by the owner, status Shortlisted, entry `active` → entry `offered` with `offeredAt = now`, `offeredWorkerId` set, status `offered`, logs `offered` and `status-changed`, activity to worker and owner (US2-5); accept by the offered worker, status Offered → status `agreed`, `agreement` with `workerId`, `ownerAgreedAt` = the entry's `offeredAt`, `workerAgreedAt` = now, the worker's own entry stays `offered`, `offeredWorkerId` cleared, the other workers' `active` entries on this request are left as they are, logs `offer-accepted` and `status-changed` (US2-6); on every other request the worker's `active` entries are removed with `accepted-elsewhere` and logged `shortlist-entry-removed` without excluding them, their `offered` entries count as declined (excluded with reason `declined`, logged `offer-declined`, status back to `shortlisted`), and each affected request is filled again (US3-6); wrong person → `not-allowed`, wrong status or entry state → `invalid-status`
- [ ] T087 [P] [US2] Write failing tests in `src/domain/marketplace/review.test.ts` for `rejectShortlist` and `returnToOpen`: reject by the owner, status Shortlisted, `reason` required "1–1000 characters" → every `active` worker excluded with `shortlist-rejected` and their entry `removed`, `rejection` recorded, status `under-review`, logs `shortlist-rejected` and `status-changed`, activity to the owner and the removed workers, and no matching while Under review (US2-7); `returnToOpen` by an admin only, status Under review → status `open`, logs `returned-to-open` and `status-changed`, matching runs, and the excluded workers are never added again (SC-005); activity "Oppdraget er åpent igjen" to the owner and `marketplace.workers`
- [ ] T088 [P] [US2] Write failing tests in `src/domain/marketplace/messages.test.ts` for `sendMessage`: allowed only under `canSendMessage`; `text` must be "1–2000 characters"; the message is added with `id`, `at`, `authorId`, `text`; log `message-sent` names both people and does not contain the text; activity "Ny melding" goes only to the other participant
- [ ] T089 [P] [US2] Write failing component tests in `src/features/marketplace/pages/RequestFormPage.test.tsx`: the form has the fields title, description, required skills (`TagPicker` over the skill list), additional requirements, desired start date (`DatePicker`), estimated duration (`NumberField` plus a `Select` with "uker"/"måneder"), hours per week (`NumberField`), and work location (`RadioGroup` with "Fjernarbeid"/"På stedet"); the duration notice "Varigheten er utenfor det vanlige (2 uker til 6 måneder). Du kan fortsatt publisere oppdraget." appears inline as soon as the duration is outside the range; field errors from a `validation` result are shown on their fields; publishing navigates to the new request page and announces "Oppdraget er publisert"; the edit route for a non-Open request shows "Oppdraget kan bare endres mens det er åpent" with a link back; desktop shows a side panel "Slik finner vi folk til deg" and mobile shows it as a `Disclosure` above the form; `jest-axe` passes
- [ ] T090 [P] [US2] Write failing component tests in `src/features/marketplace/pages/RequestPage.test.tsx` for the owner and admin views: details with a `StatusBadge`; shortlist sorted by rank showing each worker's name, rank, matched and missing skills, experience level (Junior/Erfaren/Senior), availability as an `nb-NO` date, the badge "Henvist fra NAV" when `navReferral` is set, and "Invitert til intervju" when invited; actions "Inviter til intervju", "Gi tilbud", and "Avvis hele kortlisten" (an `AlertDialog` with a required reason) shown only to the owner and only when allowed; a worker who is offered sees "Godta"; the conversation panel shows one tab per worker for the owner, only their own for a worker, and all read-only for an admin; desktop shows two columns (details and log left, shortlist and conversation right) and mobile shows details and then tabs "Kortliste", "Meldinger", "Logg"; a worker for whom `canSeeRequest` is false but `canSeeRequestTitle` is true sees only the request title as the `<h1>`, the text "Dette oppdraget er ikke lenger åpent for deg. Vi gir deg beskjed når vi finner nye oppdrag som passer deg.", and a link "Se oppdrag" to `/oppdrag`, and no details, shortlist, conversation, or log; a person for whom both are false sees `NoAccessPage`; `jest-axe` passes
- [ ] T091 [P] [US2] Write failing component tests in `src/features/marketplace/pages/RequestListPage.test.tsx` for owners, admins, and others: an owner sees only their business's requests with title, business name, `StatusBadge`, desired start, duration, and skill tags, and a "Nytt oppdrag" button; an admin sees every request with a status filter and "Til vurdering" requests first; a non-owner employee sees the explanation "Denne delen er for bedriftseiere og folk som søker oppdrag." and no requests; desktop is a table-like list and mobile is stacked cards with the filter in a `Disclosure`; `jest-axe` passes
- [ ] T092 [P] [US2] Write failing component tests in `src/features/marketplace/pages/AdminPage.test.tsx` for the "Til vurdering" section: only admins can open the page (others get `NoAccessPage`); each request Under review is listed with the owner's reason, a link to the request, and "Gjør åpen igjen" and "Avlys"; `jest-axe` passes
- [ ] T093 [P] [US2] Write failing Playwright tests in `tests/e2e/owner-request.spec.ts` (both projects): as a seeded owner, open "Nytt oppdrag", fill every field with skills seeded workers have, publish, and see status Kortliste klar with up to 3 ranked workers, finished well under 5 minutes (scenario 3, SC-001); the home feed shows the shortlist to the owner and to a shortlisted worker, the new request to an unrelated worker, but not the shortlist entry to that unrelated worker, and clicking an entry opens the request page (scenario 4); a 1-week duration shows the notice and still publishes (scenario 5); the seeded requests with a full shortlist, a shortlist of 1–2, and no eligible worker show 3 workers, 1–2 workers, and Åpen with no shortlist (scenario 6, SC-002); invite a worker, send messages both ways, make an offer, and check status stays Kortliste klar after the invitation and becomes Tilbud sendt; a different shortlisted worker cannot see the conversation (scenario 7); accept as the worker and see Avtalt; reject a whole shortlist with a reason, return it to Open as admin, and check the rejected workers never come back (scenario 10, SC-005); axe scan with zero violations on `/oppdrag`, `/oppdrag/ny`, a request page, and `/admin`

### Implementation for User Story 2

- [ ] T094 [US2] Implement `src/domain/marketplace/log.ts` (log event and activity entry builders with Norwegian text, `statusLabel`, `experienceLabel`, `workLocationLabel`, `outcomeLabel`) so the tests in `src/domain/marketplace/log.test.ts` pass
- [ ] T095 [US2] Implement `src/domain/marketplace/matching.ts` (`isBusy`, `isEligibleForMatching`, `rankCandidates`, `fillShortlist`, `fillRequests`) so the tests in `src/domain/marketplace/matching.test.ts` pass
- [ ] T096 [US2] Implement `src/domain/marketplace/visibility.ts` so the tests in `src/domain/marketplace/visibility.test.ts` pass
- [ ] T097 [US2] Implement `publishRequest`, `editRequest`, `rejectShortlist`, and `returnToOpen` in `src/domain/marketplace/requests.ts`, and `durationNotice(estimatedDuration)`, so the tests in `src/domain/marketplace/requests.test.ts` and `src/domain/marketplace/review.test.ts` pass
- [ ] T098 [US2] Implement `inviteToInterview`, `makeOffer`, and `acceptOffer` in `src/domain/marketplace/offers.ts` so the tests in `src/domain/marketplace/offers.test.ts` pass. Put the "end an outstanding offer" logic in one exported helper, `endOffer(state, requestId, reason: "declined" | "offer-expired", context, options: { actor: Actor; simulated?: true })`, which excludes the worker with `reason`, sets their entry to `removed` with that reason, clears `offeredWorkerId`, sets the status to `shortlisted`, adds the log events, and runs `fillShortlist` (which turns the request `open` if no `active` entry remains). `acceptOffer` uses it with `"declined"` for the worker's offers on other requests; US3 reuses it in T122
- [ ] T099 [US2] Implement `sendMessage` in `src/domain/marketplace/messages.ts` so the tests in `src/domain/marketplace/messages.test.ts` pass
- [ ] T100 [US2] Register the US2 commands (`publishRequest`, `editRequest`, `inviteToInterview`, `makeOffer`, `acceptOffer`, `rejectShortlist`, `returnToOpen`, `sendMessage`) as `commandHandlers` and the audience group `"marketplace.workers"` (every person with a non-draft worker profile) in `src/features/marketplace/feature.ts`; replace `homeCard` with a function returning the owner card from T050 for owners, "Oppdrag som passer deg" / "Vi matcher deg automatisk med oppdrag som passer ferdighetene dine." / "Se oppdrag" for workers, "Følg alle oppdrag" / "Se alle oppdrag og det som venter på vurdering." / "Gå til oppdrag" for admins, and `null` for everyone else
- [ ] T101 [US2] Write failing tests in `scripts/seed/marketplace.test.ts` against the output of `buildSeedFile()`: 5–6 complete worker profiles, at least 2 of them with `navReferral`; 8–10 requests; at least one request with a full shortlist of 3 `active` entries, one with 1 or 2, one `open` with no entries because no worker is eligible (SC-002), one `offered` whose entry has `offeredAt` 2 days before `anchorDate`, one `under-review` with a `rejection` reason, and one `agreed`; every seeded shortlist equals what `fillShortlist` produces from the seeded profiles at that point in the history; every `workerId`, `businessId`, `personId`, and skill ID points to an existing record; at least one conversation has messages
- [ ] T102 [US2] Extend `scripts/seed/marketplace.ts` so it builds a `DemoState` from the frame seed and creates the marketplace history by applying the real domain commands with fixed times written relative to the anchor date `2026-11-16`, fixed actors, and a counter `newId` giving IDs like `oppdrag-N`, `melding-N`, `logg-N`, `aktivitet-N`: 5–6 complete worker profiles (at least 2 with `navReferral: { referredAt, simulated: true }`, with varied skills, experience levels, and `availableFrom`), and 8–10 requests across the seeded businesses covering every case tested in T101, with a few Norwegian messages in the conversations on the shortlisted requests. Return the resulting `marketplace` data and the activity entries created. Run `pnpm seed` and make `scripts/seed/generate.test.ts` and `scripts/seed/marketplace.test.ts` pass
- [ ] T103 [P] [US2] Create `src/features/marketplace/components/RequestStatusBadge.tsx` (maps each status to its Norwegian label and a `StatusBadge` tone) and `src/features/marketplace/components/SkillTags.tsx` (read-only tag list of skill names)
- [ ] T104 [US2] Implement `src/features/marketplace/pages/RequestFormPage.tsx` and `src/features/marketplace/pages/RequestFormPage.css` for `/oppdrag/ny` and `/oppdrag/:requestId/rediger` (dispatches `publishRequest` or `editRequest`, shows field errors, announces notices through `LiveAnnouncer`) so the tests in `src/features/marketplace/pages/RequestFormPage.test.tsx` pass
- [ ] T105 [P] [US2] Create `src/features/marketplace/components/ShortlistPanel.tsx` and `ShortlistPanel.css` (shortlist entries sorted by rank, NAV badge, owner actions, reject dialog using `AlertDialog` with `reasonLabel="Hvorfor passer ingen av disse?"`)
- [ ] T106 [P] [US2] Create `src/features/marketplace/components/ConversationPanel.tsx` and `ConversationPanel.css` (`Tabs` with one tab per visible conversation, messages with author and `nb-NO` time, a `TextArea` and "Send" button only when `canSendMessage`, a note "Du kan lese, men ikke skrive i denne samtalen" for admins)
- [ ] T107 [P] [US2] Create `src/features/marketplace/components/RequestLog.tsx` and `RequestLog.css` (events from `visibleLogEvents`, oldest first, each with an `nb-NO` time in `<time>`, the actor's name or "System", and the text; events with `simulated: true` also show `SimulatedLabel`)
- [ ] T108 [P] [US2] Create `src/features/marketplace/components/WorkerStatusPanel.tsx` showing the current worker's own status on the request; when they are offered, show "Godta" dispatching `acceptOffer`
- [ ] T109 [US2] Create `src/features/marketplace/components/RequestNoLongerOpen.tsx` (title as `PageHeading`, the "ikke lenger åpent for deg" text, and the "Se oppdrag" link), then implement `src/features/marketplace/pages/RequestPage.tsx` and `RequestPage.css` for `/oppdrag/:requestId` (when `canSeeRequest` is false, render `RequestNoLongerOpen` if `canSeeRequestTitle` is true and `NoAccessPage` otherwise, re-checked when the selected user changes; otherwise details, duration notice, "Rediger" for the owner while Open, `ShortlistPanel`, `WorkerStatusPanel`, `ConversationPanel`, `RequestLog`; desktop two columns and mobile tabs chosen with `useLayout()`) so the tests in `src/features/marketplace/pages/RequestPage.test.tsx` pass
- [ ] T110 [US2] Implement `src/features/marketplace/pages/RequestListPage.tsx` and `RequestListPage.css` for `/oppdrag` (owner, admin, and other views; worker view left for US3) so the tests in `src/features/marketplace/pages/RequestListPage.test.tsx` pass
- [ ] T111 [US2] Implement `src/features/marketplace/pages/AdminPage.tsx` for `/admin` with the "Til vurdering" section so the tests in `src/features/marketplace/pages/AdminPage.test.tsx` pass
- [ ] T112 [US2] First write failing tests in `src/features/marketplace/components/FeatureSubNav.test.tsx`: a person with `seeksWork` sees "Min profil" linking to `/profil`; an owner sees "Min bedrift" linking to `/bedrift`; an admin sees "Varodd-verktøy" linking to `/admin`; a person with several of these roles sees one link per role; a non-owner employee who does not seek work and is not an admin sees no links and no empty navigation landmark; the link for the current route has `aria-current="page"`; the links change when the selected user changes; `jest-axe` passes. Then create `src/features/marketplace/components/FeatureSubNav.tsx` (a secondary row of links under the header on every Oppdrag page, each link shown only to the people listed above) and a layout route in `src/features/marketplace/feature.ts` that renders it above `/oppdrag`, `/oppdrag/ny`, `/oppdrag/:requestId`, `/oppdrag/:requestId/rediger`, and `/admin`, so the tests in `src/features/marketplace/components/FeatureSubNav.test.tsx` pass
- [ ] T113 [US2] Run `pnpm test` and `pnpm test:e2e` until every US2 test, including `tests/e2e/owner-request.spec.ts`, passes on both projects

**Checkpoint**: An owner can take a request from publication to Agreed, and an admin can review a rejected shortlist.

---

## Phase 5: User Story 3 – Job seeker registers and appears on shortlists (Priority: P2)

**Goal**: People seeking work register or complete a NAV draft and are matched; workers see every Open request; offers can be declined or expire, also through the time debug button; an admin runs the simulated NAV referral.

**Independent Test**: As a seeded person with no profile, register skills that fit a seeded Open request and appear on its shortlist. As admin, refer another person through NAV, complete the draft as that person, and see them matched. On the seeded Offered request, press the debug button and see the next worker added. (Quickstart scenarios 1 (worker view), 8, 11.)

### Tests for User Story 3 (write first, must fail)

- [ ] T114 [P] [US3] Write failing tests in `src/domain/marketplace/workers.test.ts` for `registerWorkerProfile`, `updateWorkerProfile`, and `simulateNavReferral` per contracts/commands.md: only the person themselves, with `seeksWork`, may register or update (`not-allowed` otherwise); `skillIds` needs "at least 1" known skill, `experienceLevel` and `availableFrom` are required, `wishes` is optional; registering creates the profile or completes a NAV draft, sets `isDraft: false`, and sets `eligibleSince` only if it is not set yet; when the worker becomes eligible, matching runs for every Open, Shortlisted, or Offered request with fewer than 3 active entries, oldest first (US3-1, US3-3, FR-017); updating does not change existing shortlist entries; activity "Profilen din er klar" to the worker; `simulateNavReferral` by an admin only, for a person with `seeksWork` and no profile, creates `{ isDraft: true, skillIds: [], navReferral: { referredAt: now, simulated: true } }`, the draft is never a matching candidate, and activity "Du er henvist fra NAV (simulert)" goes to that person (US3-2)
- [ ] T115 [P] [US3] Add failing tests to `src/domain/marketplace/offers.test.ts` for `declineOffer`, `expireOverdueOffers(state, now)`, and `simulateOfferExpiry`: decline by the offered worker, status Offered → worker excluded with `declined`, entry `removed`, `offeredWorkerId` cleared, status `shortlisted`, logs `offer-declined` and `status-changed`, then matching adds the next eligible worker; if no `active` entry remains, status `open` (US3-4, US3-5); the declined worker remains eligible for other requests and is never listed again for this one (SC-005); `expireOverdueOffers` handles every `offered` entry on an Offered request whose `offeredAt` is more than 7 days before `now` as a decline with reason `offer-expired`, actor `"system"`, log `offer-expired`, and leaves offers of 7 days or less alone; `simulateOfferExpiry` on one Offered request does the same straight away for that request only, with `simulated: true` on the `offer-expired` event and text containing "Simulert med feilsøkingsknappen" and the real `now` as its time; no other request changes (US1-7, FR-033); `simulateOfferExpiry` is allowed for anyone who `canSeeRequest`
- [ ] T116 [P] [US3] Add failing tests to `src/features/marketplace/pages/RequestListPage.test.tsx` for the worker view: a worker sees every Open request and, under the heading "Dine oppdrag", requests where they have a non-removed entry or are the agreed worker; the notice "Du kan ikke søke direkte; vi matcher deg automatisk" is shown; there is no apply button (US3-7)
- [ ] T117 [P] [US3] Add failing tests to `src/features/marketplace/pages/RequestPage.test.tsx`: an offered worker sees "Godta" and "Avslå"; a worker viewing an Open request where they have no entry sees only the details; on an Offered request, a `TimeDebugButton` "Demo: Simuler at 7 dager har gått" is shown and dispatches `simulateOfferExpiry`
- [ ] T118 [P] [US3] Write failing component tests in `src/features/marketplace/pages/WorkerProfilePage.test.tsx` for `/profil`: a person without `seeksWork` sees the explanation "Denne siden er for deg som søker oppdrag."; a person with no profile sees the registration form (skills `TagPicker`, experience level `RadioGroup` Junior/Erfaren/Senior, available from `DatePicker`, optional wishes `TextArea`) and submitting dispatches `registerWorkerProfile`; a NAV draft shows the notice "Du er henvist fra NAV (simulert). Fyll ut profilen din for å bli med i matchingen" with `SimulatedLabel` and the same form; a complete profile shows the profile with "Rediger" and a list of the person's shortlists and offers with links to the request pages; `jest-axe` passes
- [ ] T119 [P] [US3] Add failing tests to `src/features/marketplace/pages/AdminPage.test.tsx` for the "Simulert NAV-henvisning" section: lists every person with `seeksWork` and no profile, each with a "Henvis fra NAV (simulert)" button and a `SimulatedLabel`, which dispatches `simulateNavReferral` and removes the person from the list
- [ ] T120 [P] [US3] Write failing Playwright tests in `tests/e2e/worker.spec.ts` (both projects): as a worker, `/oppdrag` lists every Open request and "Dine oppdrag" with the no-apply notice (scenario 1, US3-7); as a person with no profile, register a profile that fits a seeded Open request and appear on its shortlist (US3-1); as admin, run "Henvis fra NAV (simulert)", switch to that person, see the draft notice, complete the profile, and see it matched (scenario 11); on the seeded Offered request press "Demo: Simuler at 7 dager har gått" and see the offer counted as declined, the next eligible worker added, a log event marked simulated, and no other request changed (scenario 8); decline an offer as the worker and see the request return to Kortliste klar or Åpen, then, still as that worker, click the home feed entry about that offer and see the request title with "Dette oppdraget er ikke lenger åpent for deg" instead of the no-access page (US1-4); axe scan with zero violations on `/profil` in each of its three states

### Implementation for User Story 3

- [ ] T121 [US3] Implement `src/domain/marketplace/workers.ts` so the tests in `src/domain/marketplace/workers.test.ts` pass
- [ ] T122 [US3] Add `declineOffer`, `expireOverdueOffers`, and `simulateOfferExpiry` to `src/domain/marketplace/offers.ts`, each built on the `endOffer` helper from T098 (`declineOffer` with `"declined"` and the worker as actor; the other two with `"offer-expired"` and actor `"system"`, `simulateOfferExpiry` also with `simulated: true`), and add the `offer-expired` builder to `src/domain/marketplace/log.ts`, so the new tests in `src/domain/marketplace/offers.test.ts` pass
- [ ] T123 [US3] Register `registerWorkerProfile`, `updateWorkerProfile`, `simulateNavReferral`, `declineOffer`, and `simulateOfferExpiry` as `commandHandlers`, and `expireOverdueOffers` in `systemSteps`, in `src/features/marketplace/feature.ts`
- [ ] T124 [US3] First add failing assertions to `scripts/seed/marketplace.test.ts`: at least 2 people with `seeksWork` and no worker profile; one request has a worker in `excludedWorkerIds` with reason `declined` and another with `offer-expired` (SC-005). Then extend `scripts/seed/marketplace.ts` with at least 1 person with `seeksWork` and no profile who is meant to register with skills that fit a seeded Open request (registration demo), at least 1 more person with `seeksWork`, no profile, and no NAV referral (NAV referral demo), and those two exclusions, made with `declineOffer` and `expireOverdueOffers`. Run `pnpm seed` and make the seed tests pass
- [ ] T125 [US3] Implement `src/features/marketplace/pages/WorkerProfilePage.tsx` and `WorkerProfilePage.css` for `/profil`, register the route in `src/features/marketplace/feature.ts` under the `FeatureSubNav` layout, so the tests in `src/features/marketplace/pages/WorkerProfilePage.test.tsx` pass
- [ ] T126 [US3] Add the worker view to `src/features/marketplace/pages/RequestListPage.tsx` so the new tests in `src/features/marketplace/pages/RequestListPage.test.tsx` pass
- [ ] T127 [US3] Add "Avslå" (dispatching `declineOffer`) to `src/features/marketplace/components/WorkerStatusPanel.tsx` and the `TimeDebugButton` for Offered requests to `src/features/marketplace/pages/RequestPage.tsx` so the new tests in `src/features/marketplace/pages/RequestPage.test.tsx` pass
- [ ] T128 [US3] Add the "Simulert NAV-henvisning" section to `src/features/marketplace/pages/AdminPage.tsx` so the new tests in `src/features/marketplace/pages/AdminPage.test.tsx` pass
- [ ] T129 [US3] Run `pnpm test` and `pnpm test:e2e` until every US3 test, including `tests/e2e/worker.spec.ts`, passes on both projects

**Checkpoint**: Both sides of the marketplace work, including declines, expiry, and the NAV simulation.

---

## Phase 6: User Story 4 – Full record of a request through to completion (Priority: P2)

**Goal**: The owner records the start and completion with an outcome, the worker can withdraw while Agreed, the owner or an admin can cancel with a reason, and the request page keeps a permanent, correctly filtered log.

**Independent Test**: Take a seeded Agreed request through Pågår to Fullført as "Ble fast ansettelse" and check every step is in the log with time and person, and "System" for automatic events; as admin, open any request and see every detail, conversation, and log event. (Quickstart scenario 9.)

### Tests for User Story 4 (write first, must fail)

- [ ] T130 [P] [US4] Write failing tests in `src/domain/marketplace/lifecycle.test.ts` for `recordStart`, `withdraw`, `completeRequest`, and `cancelRequest` per contracts/commands.md: `recordStart` by the owner, status Agreed, sets `actualStartDate`, status `in-progress`, logs `started` and `status-changed` (US4-4); `withdraw` by the agreed worker, status Agreed, excludes them with `withdrew`, sets their entry to `removed` with reason `withdrew`, clears `agreement`, status `open` (it becomes `shortlisted` again after filling if other `active` entries remain), and afterwards `canSendMessage` is false for that worker on this request, logs `withdrew` and `status-changed`, then fills this request and every request the now-free worker might match, and the worker is never listed for this request again (US4-5); `completeRequest` by the owner, status In progress, `outcome` one of `as-planned`, `extended`, `permanent`, status `completed`, logs `completed` and `status-changed`, frees the worker so matching runs for other requests, and with `permanent` the worker is in `peopleWorkingAt` for that business (US4-6); `cancelRequest` by the owner or an admin, any status except Completed and Cancelled, `reason` required "1–1000 characters", records `cancellation` with `by`, status `cancelled`, logs `cancelled` and `status-changed`; from Agreed or In progress also sets `outcome: "not-completed"` and frees the worker so matching runs for other requests (US4-7); cancelling clears `offeredWorkerId` and leaves shortlist entries as they are (accepted under CHK002 in `checklists/matching-access.md`, so add no other effects); activity for each per data-model.md §Audience rules, and the "Cancelled" activity goes to the owner, every worker with an `active` entry, and the agreed worker when cancelled from Agreed or In progress
- [ ] T131 [P] [US4] Write a failing test in `src/domain/marketplace/log-immutability.test.ts`: starting from the seed state, run every marketplace command type in a valid order with fixed times, and after each command assert that each request's previous `log` is an unchanged prefix of its new `log` and that `frame.activity` before the command is an unchanged prefix of `frame.activity` after it (US4-1, FR-010)
- [ ] T132 [P] [US4] Add failing tests to `src/features/marketplace/pages/RequestPage.test.tsx`: the owner sees "Registrer oppstart" (dialog with a `DatePicker`) while Agreed, "Marker som fullført" (dialog with a `RadioGroup` "Som planlagt" / "Ble forlenget" / "Ble fast ansettelse") while In progress, and "Avlys" (an `AlertDialog` with a required reason) in every status except Completed and Cancelled; the agreed worker sees "Trekk deg" (confirm dialog) while Agreed; an admin sees "Avlys" in every allowed status, and on Under review also "Gjør åpen igjen"; the log shows "System" as the actor for automatic events; an admin sees every log event and every conversation, read-only (US4-3)
- [ ] T133 [P] [US4] Write failing Playwright tests in `tests/e2e/lifecycle.spec.ts` (both projects): as the owner of the seeded Agreed request, record the start, mark it completed as "Ble fast ansettelse", and check the log lists every step from publication to Fullført with a time and a person name or "System" (scenario 9, SC-003); in a separate test starting from the seed, as the agreed worker of the seeded Agreed request, withdraw and see the status become Kortliste klar, with that worker gone from the shortlist and not added back (US4-5); as admin, cancel a request with a reason and see Avlyst; as admin, open a request with several conversations and see all of them and the whole log

### Implementation for User Story 4

- [ ] T134 [US4] Implement `src/domain/marketplace/lifecycle.ts` and add the `started`, `withdrew`, `completed`, and `cancelled` builders to `src/domain/marketplace/log.ts` so the tests in `src/domain/marketplace/lifecycle.test.ts` pass
- [ ] T135 [US4] Register `recordStart`, `withdraw`, `completeRequest`, and `cancelRequest` as `commandHandlers` in `src/features/marketplace/feature.ts`, then make `src/domain/marketplace/log-immutability.test.ts` pass
- [ ] T136 [US4] Create `src/features/marketplace/components/RequestActions.tsx` and `RequestActions.css` with the owner and admin status actions from T132, and add "Trekk deg" to `src/features/marketplace/components/WorkerStatusPanel.tsx`; use both in `src/features/marketplace/pages/RequestPage.tsx` so the new tests in `src/features/marketplace/pages/RequestPage.test.tsx` pass. Make the "Avlys" button on `src/features/marketplace/pages/AdminPage.tsx` dispatch `cancelRequest`
- [ ] T137 [US4] First add failing assertions to `scripts/seed/marketplace.test.ts`: every status in FR-007 is present at least once; all four exclusion reasons appear; one Completed request with outcome `permanent` belongs to an E-Waves member business and its log has `published`, `shortlisted`, `interview-invited`, `offered`, `offer-accepted`, `started`, and `completed` events (SC-003); the seeded Agreed request has at least one other `active` shortlist entry besides the agreed worker's (used by the withdraw test in T133). Then extend `scripts/seed/marketplace.ts` so the history also includes one In progress request, that Completed request, one Cancelled request with a reason, and one request where a worker withdrew. Run `pnpm seed` and make the seed tests pass
- [ ] T138 [US4] Run `pnpm test` and `pnpm test:e2e` until every US4 test, including `tests/e2e/lifecycle.spec.ts`, passes on both projects

**Checkpoint**: A request can be followed from publication to Completed or Cancelled with a full, permanent log.

---

## Phase 7: User Story 5 – Simulated skill suggestions for opted-in businesses (Priority: P3)

**Goal**: Owners switch crawl opt-in on or off, an admin runs the simulated crawl, and opted-in businesses get pre-filled, clearly marked skill suggestions on new requests.

**Independent Test**: As admin, run the simulated crawl; as an opted-in owner open "Nytt oppdrag" and see marked suggestions pre-filled; as a not-opted-in owner see none; existing requests are unchanged. (Quickstart scenario 12, SC-004.)

### Tests for User Story 5 (write first, must fail)

- [ ] T139 [P] [US5] Write failing tests in `src/domain/marketplace/crawl.test.ts` for `setCrawlOptIn` and `simulateCrawl` per contracts/commands.md: `setCrawlOptIn` by the owner of the business only, changes `crawlOptIn`, and keeps existing `crawlSuggestions` (US5-7); `simulateCrawl` by an admin only creates a `CrawlRun` with `id`, `at`, `by`, `crawledBusinessIds` (only businesses with `crawlOptIn: true` at that moment), `skippedBusinessIds`, and `simulated: true`; each crawled business gets `crawlSuggestions` from `rounds[(n − 1) mod rounds.length]` of its catalog entry, where *n* is the number of the run, and `crawlSuggestionsUpdatedAt = now`; skipped businesses are untouched (US5-2); running it a second time can change suggestions, while every existing request's `requiredSkillIds` and `acceptedSuggestionIds` stay as they were (US5-6); activity "Nye forslag til ferdigheter (simulert)" goes to each crawled business's owner; also add a test to `src/domain/marketplace/requests.test.ts` that a suggestion not kept in `requiredSkillIds` never affects matching (US5-4)
- [ ] T140 [P] [US5] Add failing tests to `src/features/marketplace/pages/RequestFormPage.test.tsx`: when the owner's business has `crawlSuggestions`, they are pre-selected in the skills `TagPicker`, each marked "Forslag", with the note "Foreslått fra en simulert gjennomgang av nettsiden deres" and a `SimulatedLabel`; the owner can remove them and add others; on publish, `acceptedSuggestionIds` is the suggestions still selected and `requiredSkillIds` is everything selected; with no suggestions the picker starts empty and publishing works (US5-3, US5-5)
- [ ] T141 [P] [US5] Write failing component tests in `src/features/marketplace/pages/BusinessPage.test.tsx` for `/bedrift`: the owner sees the business name, description, the people working there (from `peopleWorkingAt`), E-Waves membership shown as text and not editable, a `Switch` "Vi vil gjerne få forslag fra en simulert gjennomgang av nettsiden vår" with a plain explanation that dispatches `setCrawlOptIn`, and the current suggestions with `SimulatedLabel` and the time of the last crawl; an employee sees the name and the people read-only; anyone else sees `NoAccessPage`; `jest-axe` passes
- [ ] T142 [P] [US5] Add failing tests to `src/features/marketplace/pages/AdminPage.test.tsx` for the "Simulert gjennomgang av nettsider" section: a "Kjør simulert gjennomgang" button with a `SimulatedLabel` dispatches `simulateCrawl`, and past runs are listed newest first with their time and the names of crawled and skipped businesses
- [ ] T143 [P] [US5] Write failing Playwright tests in `tests/e2e/crawl.spec.ts` (both projects): as admin run "Kjør simulert gjennomgang"; as an opted-in owner open "Nytt oppdrag" and see pre-filled skills marked "Forslag"; as a not-opted-in owner see none; an existing request's skills are unchanged; as an owner, turn opt-in off on `/bedrift`, run the crawl again as admin, and see that business listed as skipped (scenario 12, SC-004); axe scan with zero violations on `/bedrift`

### Implementation for User Story 5

- [ ] T144 [US5] Implement `src/domain/marketplace/crawl.ts` and register `setCrawlOptIn` and `simulateCrawl` as `commandHandlers` in `src/features/marketplace/feature.ts` so the tests in `src/domain/marketplace/crawl.test.ts` pass
- [ ] T145 [US5] First add failing assertions to `scripts/seed/marketplace.test.ts`: every business has one `CrawlCatalogEntry` with 2–3 rounds of 3–5 known skill IDs; there is exactly one `CrawlRun`; every opted-in business has non-empty `crawlSuggestions` and no other business has any (SC-004). Then extend `scripts/seed/marketplace.ts` with those catalog entries and an initial `simulateCrawl` run by the seeded admin one week before the anchor date. Run `pnpm seed` and make the seed tests pass
- [ ] T146 [US5] Add suggestion pre-filling to `src/features/marketplace/pages/RequestFormPage.tsx` (only on `/oppdrag/ny`, never on edit) so the new tests in `src/features/marketplace/pages/RequestFormPage.test.tsx` pass
- [ ] T147 [US5] Implement `src/features/marketplace/pages/BusinessPage.tsx` and `BusinessPage.css` for `/bedrift`, register the route in `src/features/marketplace/feature.ts` under the `FeatureSubNav` layout, so the tests in `src/features/marketplace/pages/BusinessPage.test.tsx` pass
- [ ] T148 [US5] Add the "Simulert gjennomgang av nettsider" section to `src/features/marketplace/pages/AdminPage.tsx` so the new tests in `src/features/marketplace/pages/AdminPage.test.tsx` pass
- [ ] T149 [US5] Run `pnpm test` and `pnpm test:e2e` until every US5 test, including `tests/e2e/crawl.spec.ts`, passes on both projects

**Checkpoint**: All five user stories work and are each covered by passing tests.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility across every page, reproducibility, final checks, and documentation.

- [ ] T150 [P] Write `tests/e2e/accessibility.spec.ts` (both projects) that visits every route in contracts/routes.md (`/`, not found, `/oppdrag`, `/oppdrag/ny`, a request page in each status, `/oppdrag/:requestId/rediger`, `/profil` in each state, `/bedrift`, `/admin`) as a person who may see it, and runs `@axe-core/playwright` with tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, allowing zero violations; also checks every page has exactly one `<h1>` and a `<title>` ending in " – Varodd"
- [ ] T151 [P] Write `tests/e2e/reflow.spec.ts` that loads every route from T150 at a 320 px wide viewport and asserts `document.documentElement.scrollWidth <= 320`, except inside elements marked as wide tables
- [ ] T152 [P] Write a Vitest test in `src/frame/design/tokens.test.ts` that reads every `*.css` file under `src/` except `src/frame/design/tokens.css` and fails if any contains a hex, `rgb(`, or `hsl(` colour value outside a `var(--…)` reference (constitution principle IV)
- [ ] T153 [P] Write performance checks for plan.md §Performance Goals: in `src/domain/frame/performance.test.ts`, load the seed state and apply each of the 19 marketplace command types once with valid input, asserting each `applyCommand` call finishes in under 100 ms; in `tests/e2e/performance.spec.ts` (desktop project), assert the time from navigation start until the `/` page's `<h1>` is visible is under 2 seconds against `pnpm preview`
- [ ] T154 Run `pnpm seed` twice and confirm `git status` shows no change to `src/seed/seed-data.json` (scenario 15, FR-032)
- [ ] T155 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm test:e2e` and fix every failure until all four pass
- [ ] T156 Do the manual checks in quickstart.md §Accessibility checks (keyboard only through scenarios 3, 7, and 13; screen reader through scenario 3; 200% zoom and 320 px reflow; meaning without colour) and record the result of each, with any problem found and how it was fixed, in `specs/001-job-matching-marketplace/accessibility-results.md`
- [ ] T157 [P] Update the "Project state" section of `CLAUDE.md` at the repository root to say that feature 001 and the shared frame are built, list the `pnpm` commands from quickstart.md, and name the stack (React 19 + TypeScript, Vite, Vitest, Playwright, Biome)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup. Blocks every user story.
- **US1 (Phase 3)**: Depends on Foundational. It is the shared frame, so every other story's pages and e2e tests run inside it.
- **US2 (Phase 4)**: Depends on US1 (header, user switcher, home feed, `RequireAccess`).
- **US3 (Phase 5)**: Depends on US1, and on US2's `matching.ts`, `log.ts`, `visibility.ts`, `offers.ts`, `RequestPage`, `RequestListPage`, and `AdminPage`, which it extends.
- **US4 (Phase 6)**: Depends on US1 and US2. Its seed history (T137) and log-immutability test (T131) also use US3's `declineOffer` and `expireOverdueOffers`, so finish US3 first, or run T131 and T137 after US3.
- **US5 (Phase 7)**: Depends on US1 and US2 (`RequestFormPage`, `AdminPage`, matching). Independent of US3 and US4.
- **Polish (Phase 8)**: Depends on every story.

### User Story Dependency Graph

```text
Setup → Foundational → US1 → US2 ─┬─> US3 ──> US4
                                  └─> US5
```

### Within Each Story

- Write the tests and see them fail before the implementation task they cover.
- Domain rules (`src/domain/`) before command registration in `feature.ts`.
- Command registration before seed changes, because the seed step runs the real commands.
- Seed changes before e2e tests that depend on seeded records.
- Pages after the components they use.
- The story's closing "Run `pnpm test` and `pnpm test:e2e`" task marks the story as done.

### Files Changed by Several Stories

These files are extended story by story, so tasks touching them are never parallel with each other: `src/features/marketplace/feature.ts`, `scripts/seed/marketplace.ts`, `scripts/seed/marketplace.test.ts`, `src/seed/seed-data.json`, `src/domain/marketplace/log.ts`, `src/domain/marketplace/offers.ts`, `src/features/marketplace/pages/RequestPage.tsx`, `RequestListPage.tsx`, `RequestFormPage.tsx`, `AdminPage.tsx`, and their test files.

---

## Parallel Examples

### Foundational

```text
Task: "T013 Write failing tests in src/domain/frame/people.test.ts"
Task: "T015 Write failing tests in src/domain/frame/activity.test.ts"
Task: "T017 Write failing tests in src/domain/frame/commands.test.ts"
Task: "T021 Write failing tests in scripts/seed/random.test.ts"
Task: "T036 Create src/frame/design/tokens.css"
Task: "T039–T048 Shared UI components (each in its own files)"
```

### User Story 1

```text
Task: "T057 UserSwitcher tests"   Task: "T058 Header tests"   Task: "T059 MobileMenu tests"
Task: "T061 ActivityFeed tests"   Task: "T062 ResetDemoButton tests"   Task: "T064 HomePage tests"
Task: "T074 Footer"   Task: "T075 TimeDebugButton and SimulatedLabel"   Task: "T076 formatRelativeTime"
```

### User Story 2

```text
Task: "T082 log tests"   Task: "T083 matching tests"   Task: "T084 visibility tests"
Task: "T085 requests tests"   Task: "T086 offers tests"   Task: "T087 review tests"   Task: "T088 messages tests"
Task: "T105 ShortlistPanel"   Task: "T106 ConversationPanel"   Task: "T107 RequestLog"   Task: "T108 WorkerStatusPanel"
```

### User Story 3

```text
Task: "T114 workers tests"   Task: "T115 offers tests (decline, expiry)"   Task: "T118 WorkerProfilePage tests"
```

### User Story 5 (can run alongside US3/US4 once US2 is done)

```text
Task: "T139 crawl tests"   Task: "T141 BusinessPage tests"   Task: "T143 crawl e2e tests"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Phase 1: Setup.
2. Phase 2: Foundational.
3. Phase 3: US1, the shared frame. Stop and check it with `tests/e2e/frame.spec.ts`.
4. Phase 4: US2, the owner journey. Stop and check it with `tests/e2e/owner-request.spec.ts`.
5. Both are P1. Together they give a demo-ready prototype: an owner publishes a request, gets a shortlist, and agrees with a worker.

### Incremental Delivery

1. Setup + Foundational → project runs.
2. US1 → shared frame demo (switcher, header, feed, reset).
3. US2 → core marketplace demo (MVP).
4. US3 → worker registration, NAV simulation, declines and expiry with the debug button.
5. US4 → full lifecycle to Completed or Cancelled.
6. US5 → simulated crawl suggestions.
7. Polish → full accessibility scan, reflow, reproducibility, and docs.

Each step ends with all tests passing and leaves earlier stories working.

---

## Notes

- All 18 items in `checklists/matching-access.md` (CHK001–CHK018) are checked. T130 states the one place where a task had to pick behaviour for an item that was accepted as a plan-level decision (CHK002).
- There is no T012. It used to add `newId` to the command context, and `systemSteps` and a function-valued `homeCard` to `FeatureDefinition`, in the contracts. Those changes are now in contracts/commands.md and contracts/shared-frame.md, so the task was removed. The other task numbers are unchanged.
- Commit after each task or logical group.
