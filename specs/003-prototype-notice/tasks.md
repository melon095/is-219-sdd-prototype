---

description: "Task list for feature 003-prototype-notice"
---

# Tasks: Prototype Notice on First Visit

**Input**: Design documents from `/specs/003-prototype-notice/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/notice.md](./contracts/notice.md), [quickstart.md](./quickstart.md)

**Tests**: Required. Constitution principle III makes the project test-driven: every behaviour gets a test, written before the code it covers, and a task is not done until its tests pass. To finish quickly, tests are not run separately to see them fail first, Vitest runs once per story, and Playwright runs only once, for the whole suite, in T015.

**Organization**: Tasks are grouped by user story. The notice is part of the shared frame from 001, and features 001 and 002 are already built.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: Which user story the task belongs to (US1–US3)
- Every task names the exact file paths it creates or changes

## Rules that apply to every task

- No comments in code (project owner's rule).
- Application code is written by subagents running Claude Sonnet 5.5 (`claude-sonnet-5-5`) at medium reasoning effort; the main agent hands out tasks and checks the results.
- All interface text is exactly as written in [contracts/notice.md](./contracts/notice.md), in Norwegian Bokmål.
- CSS uses only the custom properties in `src/frame/design/tokens.css`, and the notice uses only shared components from `src/frame/ui/` (`Dialog`, `Button`).
- Unit and component tests sit next to the file they test. Component tests use the helpers in `src/frame/test-utils.tsx` as patterns.
- Only the tasks that say so run tests. Vitest: `pnpm test`. Playwright runs only in T015, with `--workers=2`, never more.
- Playwright tests of the 5-second wait use Playwright's clock (`page.clock.install()` before `page.goto`, then `page.clock.runFor(...)`), so no test waits 5 real seconds. Vitest tests use `vi.useFakeTimers()`.

## Path conventions

The existing single frontend project at the repository root: `src/`, `tests/e2e/`, `playwright.config.ts`.

---

## Phase 1: Setup

**Purpose**: Confirm the starting point.

- [X] T001 Run `pnpm install`, `pnpm lint`, `pnpm typecheck`, and `pnpm test` on branch `003-prototype-notice` and confirm all pass before any change; fix any failure first

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The stored confirmation, and a test setup that keeps the existing 001 and 002 end-to-end tests from ever seeing the notice.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Write failing tests in `src/frame/store/persistence.test.ts` for `NOTICE_KEY`, `loadNoticeConfirmed(storage)`, and `saveNoticeConfirmed(storage)` per data-model.md: `NOTICE_KEY` is `"varodd-prototype:notice"`; `loadNoticeConfirmed` is "`true` only when the stored text parses to exactly `true`" and "`false` when the key is missing, the text is not valid JSON, the value is anything else, or reading throws" (cover missing, `"false"`, `"\"true\""`, `"1"`, `"{"`, and a storage whose `getItem` throws); `saveNoticeConfirmed` writes the text `true` under `NOTICE_KEY` and returns `{ storageAvailable: true }`, and returns `{ storageAvailable: false }` without throwing when `setItem` throws; saving the notice leaves `STATE_KEY` and `USER_KEY` untouched
- [X] T003 Implement `NOTICE_KEY`, `loadNoticeConfirmed`, and `saveNoticeConfirmed` in `src/frame/store/persistence.ts`, reusing the existing `readItem`, `writeItem`, and `parseJson` helpers, so the tests from T002 pass
- [X] T004 [P] Change `playwright.config.ts`: set `use.storageState` to `{ cookies: [], origins: [{ origin: "http://localhost:4173", localStorage: [{ name: "varodd-prototype:notice", value: "true" }] }] }` next to `baseURL` (research.md §6)

**Checkpoint**: The confirmation can be stored and read, and every existing end-to-end test starts with the notice confirmed.

---

## Phase 3: User Story 1 – A first-time visitor learns what the website is before using it (Priority: P1) 🎯 MVP

**Goal**: The notice covers the first page opened, cannot be dismissed, counts down 5 seconds, and closes with "Jeg forstår".

**Independent Test**: Open `/` with empty storage; check the text, that Escape, clicking outside, and Tab do not get past it, that "Jeg forstår" is disabled for 5 seconds with a countdown, and that it closes after. (Quickstart scenarios 1–4.)

### Tests for User Story 1 (write first)

- [X] T005 [P] [US1] Write failing component tests in `src/frame/notice/PrototypeNotice.test.tsx`, rendering `PrototypeNotice` with an in-memory `StorageLike` (empty) and `vi.useFakeTimers()`: a dialog named "Dette er en prototype" with the three paragraphs exactly as in contracts/notice.md (US1-1, FR-002); "Jeg forstår" is disabled at 0 s and at 4.9 s, and the text "Du kan gå videre om 5 sekunder." at 0 s, "Du kan gå videre om 2 sekunder." at 3 s, and "Du kan gå videre om 1 sekund." at 4 s (US1-3, FR-005); the countdown text is not inside an element with `role="status"` or `aria-live`; the `role="status"` element inside the dialog is empty before 5 s and reads "Nå kan du gå videre." from 5 s, and the countdown text is gone (FR-010); pressing Escape before and after 5 s leaves the dialog open (US1-2, US1-5, FR-004); at 5 s "Jeg forstår" is enabled, and pressing it closes the dialog and writes `true` under `NOTICE_KEY` (US1-4, FR-006); when an `<h1 tabIndex={-1}>` is rendered next to the notice, it has focus after "Jeg forstår"; seconds left are computed from the elapsed time, so advancing the fake clock by 5 s in one step (as a throttled background tab would) makes the button enabled at the next tick; `jest-axe` passes while waiting and while ready
- [X] T006 [P] [US1] Write failing Playwright tests in `tests/e2e/notice.spec.ts` (both projects) with `test.use({ storageState: { cookies: [], origins: [] } })` and `page.clock.install()` before `page.goto("/")`: the dialog "Dette er en prototype" is visible with its three paragraphs (scenario 1); Escape, a click at the top-left corner of the page outside the dialog, and 10 presses of Tab leave the dialog open with focus inside it, and the header link "Kunnskapsbank" cannot be reached (scenario 2, FR-003); "Jeg forstår" is disabled after `runFor(4900)` and enabled after `runFor(100)` more (scenario 3); Escape then still leaves it open, and "Jeg forstår" closes it with the home page's `<h1>` focused (scenario 4); axe with tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` finds zero violations with the dialog open; at 320 px width the dialog's text and button can be reached by scrolling inside the dialog and `document.documentElement.scrollWidth` is at most 320 (FR-010)

### Implementation for User Story 1

- [X] T007 [US1] Implement `src/frame/notice/PrototypeNotice.tsx` and `src/frame/notice/PrototypeNotice.css` per contracts/notice.md: props `{ storage: StorageLike }`; reads `loadNoticeConfirmed(storage)` once on first render into React state; renders the shared `Dialog` from `src/frame/ui/Dialog.tsx` with `title="Dette er en prototype"`, `isOpen`, `isDismissable={false}`, and `isKeyboardDismissDisabled`; records `shownAt` when first shown and recomputes seconds left as `max(0, 5 − floor((now − shownAt) / 1000))` every second with `setInterval` (cleared on unmount and when ready); the countdown paragraph, an always-present `role="status"` element that gets "Nå kan du gå videre." when ready, and the shared `Button` "Jeg forstår" in a `.dialog-actions` row, disabled while waiting; on press calls `saveNoticeConfirmed(storage)`, sets confirmed in state whatever it returns, and then focuses the first `h1` in the document, so the tests from T005 pass
- [X] T008 [US1] Render `<PrototypeNotice storage={window.localStorage} />` in `src/app/App.tsx` inside `LiveAnnouncer`, next to `<RouterProvider router={router} />` (research.md §5)
- [X] T009 [US1] Run `pnpm test` until every Vitest test passes, including those from T002 and T005

**Checkpoint**: A first-time visitor cannot use the prototype before reading and confirming the notice. This is the MVP.

---

## Phase 4: User Story 2 – A returning visitor is not interrupted again (Priority: P2)

**Goal**: Once confirmed, the notice stays away in that browser, also after reloads, demo resets, and user switches.

**Independent Test**: Confirm, then reload, open a new tab, press "Tilbakestill demo", and switch user; the notice never returns. A fresh browser context still shows it. (Quickstart scenarios 5, 7, 8.)

### Tests for User Story 2 (write first)

- [X] T010 [P] [US2] Add failing tests to `src/frame/notice/PrototypeNotice.test.tsx`: with `varodd-prototype:notice` = `true` already in storage, nothing is rendered (US2-1); with a storage whose `setItem` throws, "Jeg forstår" still closes the dialog after 5 s, and re-rendering the same component instance keeps it closed (FR-008); with a storage holding `"false"` or invalid JSON, the dialog is shown
- [X] T011 [P] [US2] Add failing Playwright tests to `tests/e2e/notice.spec.ts` (both projects, empty storage, Playwright clock): confirm the notice, then reload and see no dialog; open a second page in the same context and see no dialog; press "Tilbakestill demo" (on mobile through "Meny") and see no dialog; switch user with `switchUser` from `tests/e2e/helpers.ts` and see no dialog (US2-1, US2-2, FR-007); open a new browser context and see the dialog again (US2-3); after confirming, `localStorage` holds `varodd-prototype:notice` = `true`, and every request made by the page during the test is to `http://localhost:4173` (FR-011)

### Implementation for User Story 2

- [X] T012 [US2] Make any change needed in `src/frame/notice/PrototypeNotice.tsx` or `src/frame/store/persistence.ts` so the tests from T010 and T011 pass, without changing `store.reset()` in `src/frame/store/store.ts`; run `pnpm test`

**Checkpoint**: Returning visitors are not interrupted.

---

## Phase 5: User Story 3 – Visitors who arrive through a direct link are also told (Priority: P2)

**Goal**: The notice also covers inner pages opened directly, and confirming leaves the visitor on that page.

**Independent Test**: With empty storage, open a link to a knowledge base question; the notice shows; after confirming, the question page is shown at the same URL. (Quickstart scenario 6.)

### Tests for User Story 3 (write first)

- [X] T013 [P] [US3] Add failing Playwright tests to `tests/e2e/notice.spec.ts` (both projects, empty storage, Playwright clock): `page.goto("/#/kunnskapsbank/sporsmal/sporsmal-1")` shows the dialog over the question page (US3-1); after `runFor(5000)` and "Jeg forstår", the URL is unchanged and the question's `<h1>` is visible and focused (US3-2); the same for `/#/oppdrag` or another 001 route listed in `tests/e2e/routes.ts`

### Implementation for User Story 3

- [X] T014 [US3] Make any change needed in `src/frame/notice/PrototypeNotice.tsx` or `src/app/App.tsx` so the tests from T013 can pass (they run in T015)

**Checkpoint**: Every way into the prototype passes through the notice.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T015 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and the whole suite with `pnpm exec playwright test --workers=2`, and fix every failure until all pass; no 001 or 002 test may be weakened (quickstart scenario 9)
- [X] T016 [P] Update docs: in `CLAUDE.md`, add `src/frame/notice/` to the code layout and note under Commands that `playwright.config.ts` starts every test with the notice confirmed and that `tests/e2e/notice.spec.ts` clears this; in `README.md`, add one sentence to "Slik bruker du demoen" saying a notice about the prototype is shown on the first visit and how to see it again (clear the site's data or open a private window); in `specs/001-job-matching-marketplace/contracts/shared-frame.md`, list the prototype notice among the frame's parts

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup. Blocks every user story. T004 must be done before T008, or the existing end-to-end tests start seeing the notice.
- **US1 (Phase 3)**: Depends on Foundational.
- **US2 (Phase 4)** and **US3 (Phase 5)**: Depend on US1 (the component exists). Independent of each other, but both add to `tests/e2e/notice.spec.ts`, so run them one after the other.
- **Polish (Phase 6)**: Depends on every story.

### User Story Dependency Graph

```text
Setup → Foundational → US1 ─┬─> US2 ─┐
                            └─> US3 ─┴─> Polish
```

### Within Each Story

- Write the tests before the implementation task they cover.
- Playwright tests written in US1–US3 are first run in T015, which marks the feature as done.

### Files Changed by Several Stories

`src/frame/notice/PrototypeNotice.tsx`, `src/frame/notice/PrototypeNotice.test.tsx`, and `tests/e2e/notice.spec.ts` are extended story by story, so tasks touching them are never run at the same time.

---

## Parallel Examples

### Foundational

```text
Task: "T002 persistence tests"   Task: "T004 Playwright storageState"
```

### User Story 1

```text
Task: "T005 PrototypeNotice component tests"   Task: "T006 notice.spec.ts first-visit journeys"
```

### User Story 2

```text
Task: "T010 component tests for a returning visitor"   Task: "T011 e2e tests for a returning visitor"
```

---

## Implementation Strategy

### MVP First (US1)

1. Phase 1: Setup.
2. Phase 2: Foundational.
3. Phase 3: US1. Stop and check it with `tests/e2e/notice.spec.ts`.
4. US1 alone already makes the public site honest about what it is.

### Incremental Delivery

1. Setup + Foundational → confirmation storage and test setup ready.
2. US1 → the notice (MVP).
3. US2 → not shown again.
4. US3 → covers direct links.
5. Polish → full suite and docs.

---

## Notes

- Commit after each phase.
