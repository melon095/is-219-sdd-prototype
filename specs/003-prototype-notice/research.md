# Research: Prototype Notice on First Visit

**Feature**: `003-prototype-notice` | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

The stack is the one from [001 research.md](../001-job-matching-marketplace/research.md), unchanged. This file records only the decisions new for 003.

## 1. Which dialog to use

- **Decision**: The shared `Dialog` from `src/frame/ui/Dialog.tsx` with `isOpen`, `isDismissable={false}`, and `isKeyboardDismissDisabled`. Its only control is the shared `Button`.
- **Rationale**: React Aria's modal already does what FR-003 and FR-004 ask: it hides and blocks everything outside the dialog from pointer, keyboard, and screen readers, keeps focus inside, and with these two props ignores Escape and clicks outside. The shared `Dialog` already passes both props through, so the shared kit needs no change (constitution IV).
- **Alternatives considered**: `AlertDialog`. Rejected: it always has a cancel button that closes it, which FR-004 forbids. A hand-built overlay. Rejected: it would duplicate focus trapping and inert handling that React Aria already gets right.

## 2. Remembering the confirmation

- **Decision**: A separate `localStorage` entry, `varodd-prototype:notice`, holding the JSON value `true` once confirmed. Two functions in `src/frame/store/persistence.ts`, next to `saveUser` and `loadUser`: `loadNoticeConfirmed(storage): boolean` (true only when the stored value parses to exactly `true`; false when missing, malformed, or when storage throws) and `saveNoticeConfirmed(storage): { storageAvailable: boolean }`. Both reuse the existing `readItem` and `writeItem` helpers, which already catch storage errors.
- **Rationale**: The demo reset (`store.reset()`) only overwrites the state entry, so a separate entry survives "Tilbakestill demo" (FR-007). The store's seed-ID check, which replaces stored demo data when the seed changes, never touches it either. The person only has to confirm once per browser.
- **Alternatives considered**: A field inside `DemoState`. Rejected: resetting the demo or a new seed would bring the notice back, against FR-007. `sessionStorage`. Rejected: the notice would come back in every new tab.

## 3. The 5-second wait

- **Decision**: The component records the time when the notice first renders and checks the elapsed time every second with `setInterval`. Seconds left = `max(0, 5 − floor(elapsed seconds))`. The button is disabled while seconds left is above 0.
- **Rationale**: Computing from the elapsed time, instead of counting ticks, keeps the wait correct when a background tab slows timers down (spec edge case). It is easy to test with Vitest fake timers.
- **Alternatives considered**: A single 5-second `setTimeout`. Rejected: it gives no countdown to show (FR-005).

## 4. What screen reader users hear

- **Decision**:
  - When the notice opens, React Aria moves focus into the dialog. Since the only button is still disabled, focus lands on the dialog itself, and its title, "Dette er en prototype", is read as its name.
  - The countdown ("Du kan gå videre om *n* sekunder.") is plain text, not a live region, so it is not read out every second.
  - A separate `role="status"` element inside the dialog stays empty until the wait is over, then says "Nå kan du gå videre." once.
  - When the button becomes enabled, focus is not moved; the person reaches it with Tab.
  - After "Jeg forstår", focus moves to the page's `<h1>`, which `PageHeading` already renders with `tabIndex={-1}`.
- **Rationale**: FR-010 and the spec's edge case ask for the ready moment to be announced once, without announcing every second. The status element must be inside the dialog, because the modal hides everything outside it from screen readers, including the frame's shared `LiveAnnouncer`. Moving focus away from the text automatically would interrupt someone still reading.
- **Alternatives considered**: Announcing through the shared `LiveAnnouncer`. Rejected for the reason above.

## 5. Where it is rendered

- **Decision**: `<PrototypeNotice storage={window.localStorage} />` is rendered once in `src/app/App.tsx`, next to `<RouterProvider>` inside `LiveAnnouncer`. It reads the confirmation once when it first renders and keeps `confirmed` in React state, so after confirming it stays closed for the rest of the page's life even if saving failed (FR-008).
- **Rationale**: Rendering it outside the router means it covers every route, including direct links to inner pages (US3), and confirming does not change the URL (US3-2). Passing the storage in keeps it testable, like the store.
- **Alternatives considered**: Rendering it in the home page. Rejected: direct links would skip it.

## 6. Existing end-to-end tests

- **Decision**: `playwright.config.ts` sets `use.storageState` to an object with one origin, `http://localhost:4173`, whose `localStorage` holds `varodd-prototype:notice` = `true`. Every existing test starts with the notice confirmed and needs no change. `tests/e2e/notice.spec.ts` overrides this with `test.use({ storageState: { cookies: [], origins: [] } })`, so its tests start like a first-time visitor.
- **Rationale**: One line of configuration instead of changing every 001 and 002 spec, and the 5-second wait never slows the other tests. The notice's own tests check real first-visit behaviour.
- **Alternatives considered**: A helper called at the start of every test. Rejected: easy to forget, and it touches many files.

## 7. Wording

- **Decision**: The exact text is in [contracts/notice.md](./contracts/notice.md). It uses "du" for the reader but does not use "vi".
- **Rationale**: Constitution IV says "vi" means Varodd, and this notice is about not being Varodd, so "vi" would be confusing here.
