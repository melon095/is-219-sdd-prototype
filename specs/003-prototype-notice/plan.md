# Implementation Plan: Prototype Notice on First Visit

**Branch**: `003-prototype-notice` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-prototype-notice/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

The first time a browser opens the public prototype, a dialog covers whatever page was opened. It says the website is not made by or connected to Varodd, that it is a student prototype, that everything in it is made up, and that changes stay in the browser. The dialog cannot be dismissed. Its only button, "Jeg forstår", is disabled for 5 seconds with a visible countdown. Once confirmed, a separate entry in the browser's storage keeps it from showing again, and "Tilbakestill demo" leaves that entry alone.

Technical approach: a small addition to the shared frame. It uses the shared `Dialog` with dismissing turned off, two small storage functions next to the existing ones in `src/frame/store/persistence.ts`, and one `PrototypeNotice` component rendered once in `src/app/App.tsx`. The existing Playwright tests start with the notice already confirmed, through Playwright's `storageState` setting. The notice gets its own unit, component, and end-to-end tests. Details and reasons are in [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 7.0 (strict) on Node.js 26; React 19.3. Same as 001 and 002.

**Primary Dependencies**: The same as 001: React Aria Components 1.22 (through the shared `Dialog` and `Button`), React Router 8. No new dependencies.

**Storage**: One new `localStorage` entry, `varodd-prototype:notice`, separate from the demo state entry, so the demo reset does not touch it ([data-model.md](./data-model.md)).

**Testing**: Vitest 5 + React Testing Library + `jest-axe` for the storage functions and the component (with fake timers for the countdown); Playwright 1.65 + `@axe-core/playwright` at desktop (1280×800, Chromium) and mobile (390×844, WebKit) sizes, at most 2 workers.

**Target Platform**: Same as 001: current desktop browsers, Safari on iOS, Chrome on Android, served as static files at https://varodd.jflottorp.no.

**Project Type**: Single-page web application (frontend only), the existing project at the repository root.

**Performance Goals**: The notice is part of the first render, with no visible delay before it covers the page. The countdown updates once per second.

**Constraints**: WCAG 2.1 AA. Norwegian Bokmål. No network requests. Only the shared design tokens and components (constitution IV). Reflows down to 320 px and at 200% zoom.

**Scale/Scope**: 1 component, 2 storage functions, 1 change to `App.tsx`, 1 change to `playwright.config.ts`, 1 new Playwright spec. No domain or seed changes.

No item is left as NEEDS CLARIFICATION.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution version 1.2.0.

### Before Phase 0

| Principle | Check | Result |
|---|---|---|
| I. Single Shared Codebase | Built into the shared frame in the same project, so it covers every feature at once. | Pass |
| II. Sandboxed/Fake Data Only | Strengthens the principle: it tells every visitor that the data is fake and stays in their browser. Stores only one confirmation flag in the browser and sends nothing. | Pass |
| III. Test-Driven Development | Storage functions, component behaviour, and every acceptance scenario get tests written first. | Pass |
| IV. Shared Varodd Design Language | Uses the shared `Dialog`, `Button`, and tokens. No new colours, fonts, or styles. | Pass |

### After Phase 1 design

| Principle | Check | Result |
|---|---|---|
| I. Single Shared Codebase | [contracts/notice.md](./contracts/notice.md) places the component in `src/frame/notice/` and renders it once in `App.tsx`; features need no change. | Pass |
| II. Sandboxed/Fake Data Only | [data-model.md](./data-model.md): one browser-only flag, never sent anywhere. | Pass |
| III. Test-Driven Development | [quickstart.md](./quickstart.md) maps every acceptance scenario and edge case to an automated test. | Pass |
| IV. Shared Varodd Design Language | The shared `Dialog` already supports non-dismissable use (`isDismissable`, `isKeyboardDismissDisabled`); the only new CSS is spacing for the countdown line, using tokens. | Pass |

No violations, so Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/003-prototype-notice/
├── plan.md              # This file
├── research.md          # Phase 0: decisions
├── data-model.md        # Phase 1: the stored confirmation
├── quickstart.md        # Phase 1: validation scenarios
├── contracts/
│   └── notice.md        # Text, behaviour, storage, and test setup
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks, not created here)
```

### Source Code (repository root)

New files, and the existing files that change (marked *changed*):

```text
src/
├── app/
│   └── App.tsx                        # changed: renders <PrototypeNotice storage={window.localStorage} />
└── frame/
    ├── notice/
    │   ├── PrototypeNotice.tsx
    │   ├── PrototypeNotice.css
    │   └── PrototypeNotice.test.tsx
    └── store/
        ├── persistence.ts             # changed: NOTICE_KEY, loadNoticeConfirmed, saveNoticeConfirmed
        └── persistence.test.ts        # changed: tests for the two functions

playwright.config.ts                   # changed: storageState with the notice confirmed
tests/e2e/
└── notice.spec.ts                     # the notice's own journeys, axe scan, and 320 px reflow check, starting with empty storage

CLAUDE.md                              # changed: mention the notice and the Playwright storageState
README.md                              # changed: mention the notice
```

**Structure Decision**: The existing single project. The notice is frame code (`src/frame/notice/`), like the demo reset in `src/frame/demo/`, because it applies to every feature. No feature folder changes.

## Implementation Notes

- Code is written by subagents running Claude Sonnet 5.5 (`claude-sonnet-5-5`) at medium reasoning effort, with the main agent coordinating and checking the results.
- No comments in code (project owner's rule).
- Interface text in Norwegian Bokmål, exactly as in [contracts/notice.md](./contracts/notice.md).
- Playwright runs with at most 2 workers.

## Complexity Tracking

No constitution violations to justify.
