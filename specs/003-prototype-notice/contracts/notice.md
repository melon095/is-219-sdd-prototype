# Contract: Prototype Notice

**Feature**: `003-prototype-notice` | **Plan**: [plan.md](../plan.md)

## Component

`PrototypeNotice({ storage }: { storage: StorageLike })` in `src/frame/notice/PrototypeNotice.tsx`, rendered once in `src/app/App.tsx` next to `<RouterProvider>`.

- On first render it calls `loadNoticeConfirmed(storage)`. If true, it renders nothing.
- Otherwise it renders the shared `Dialog` with `isOpen`, `isDismissable={false}`, and `isKeyboardDismissDisabled`.

## Text (Norwegian Bokmål, exactly)

- Dialog title: **Dette er en prototype**
- Paragraph 1: "Denne nettsiden er ikke laget av Varodd, og den har ingen tilknytning til Varodd. Den er en prototype, laget som et studentprosjekt."
- Paragraph 2: "Alle personer, bedrifter, oppdrag, spørsmål og svar her er oppdiktet. De viser ikke til noen ekte personer eller bedrifter."
- Paragraph 3: "Det du endrer, lagres bare i din egen nettleser. Ingenting blir sendt noe sted."
- Countdown, while waiting: "Du kan gå videre om *n* sekunder." with *n* from 5 down to 2, and "Du kan gå videre om 1 sekund." at 1. Not a live region. Hidden once the wait is over.
- Status (`role="status"`, inside the dialog): empty while waiting, then "Nå kan du gå videre."
- Button: **Jeg forstår** (shared `Button`, primary). Disabled while waiting.

## Behaviour

| When | Then |
|---|---|
| Not confirmed, any route loads | The dialog is open above the page; the page behind is blocked. |
| Escape, click or tap outside, Tab | The dialog stays open; focus stays inside. |
| 0–5 s after the dialog appeared | "Jeg forstår" is disabled; the countdown shows the seconds left. |
| 5 s after the dialog appeared | "Jeg forstår" is enabled; the countdown is hidden; the status says "Nå kan du gå videre." |
| "Jeg forstår" pressed | `saveNoticeConfirmed(storage)` is called; the dialog closes; the URL is unchanged; focus moves to the page's `<h1>`. |
| Saving failed | The dialog still closes and stays closed until the next full page load. |
| Confirmed earlier | Nothing is rendered. |

Seconds left = `max(0, 5 − floor((now − shownAt) / 1000))`, checked once per second, where `shownAt` is when the dialog first rendered.

## Layout

The shared dialog layout (`max-width: var(--width-reading)`, scrolls inside when taller than the screen). The button sits in the shared `.dialog-actions` row (full width on mobile). The countdown and status lines sit just above it. Any new CSS in `PrototypeNotice.css` uses only tokens.

## Test setup

- `playwright.config.ts`: `use.storageState` = `{ cookies: [], origins: [{ origin: "http://localhost:4173", localStorage: [{ name: "varodd-prototype:notice", value: "true" }] }] }`, so every existing spec starts with the notice confirmed.
- `tests/e2e/notice.spec.ts`: `test.use({ storageState: { cookies: [], origins: [] } })`, so it starts as a first-time visitor.
- Component tests render `PrototypeNotice` with an in-memory `StorageLike`, and use Vitest fake timers for the countdown.
