# Quickstart: Prototype Notice on First Visit

**Feature**: `003-prototype-notice` | **Plan**: [plan.md](./plan.md)

Setup and commands are the same as in [001 quickstart.md](../001-job-matching-marketplace/quickstart.md#setup-and-commands). To see the notice again by hand, clear the site's data in the browser (or open a private window) and reload.

## Validation scenarios

Each scenario is covered by an automated test: Vitest for the storage functions and the component, Playwright (`tests/e2e/notice.spec.ts`, desktop and mobile) for the journeys.

| # | Scenario | Expected outcome | Spec |
|---|---|---|---|
| 1 | Open `/` in a browser with no stored data. | The dialog "Dette er en prototype" is shown with the three paragraphs from [contracts/notice.md](./contracts/notice.md). | US1-1, FR-001, FR-002 |
| 2 | Right away, press Escape, click outside the dialog, and press Tab several times. | The dialog stays open, focus stays inside it, and nothing behind it reacts. | US1-2, FR-003, FR-004 |
| 3 | Look at the button during the first 5 seconds. | "Jeg forstår" is disabled and the countdown goes from 5 down. | US1-3, FR-005 |
| 4 | After 5 seconds, press Escape, then press "Jeg forstår". | Escape does nothing. "Jeg forstår" closes the dialog, and focus is on the page's heading. | US1-4, US1-5, FR-006 |
| 5 | Reload; open the site in a new tab; press "Tilbakestill demo"; switch user. | The dialog never shows again. | US2-1, US2-2, FR-007 |
| 6 | Open `/#/kunnskapsbank/sporsmal/sporsmal-1` in a browser with no stored data, then confirm. | The dialog shows first; after confirming, the question page is shown at the same URL. | US3-1, US3-2 |
| 7 | Make storage throw (component test), then confirm. | The dialog closes and the app keeps working. | FR-008, edge case |
| 8 | Open a new browser context (Playwright) and check the notice entry after confirming. | Only `varodd-prototype:notice` = `true` was added; no request leaves the page. | FR-011 |
| 9 | Run the whole existing Playwright suite. | Every 001 and 002 test passes without seeing the notice. | Assumption, research §6 |

## Accessibility checks (WCAG 2.1 AA)

- `jest-axe` on the component while waiting and while ready.
- `@axe-core/playwright` with the `wcag2a`, `wcag2aa`, `wcag21a`, and `wcag21aa` tags on `/` with the dialog open, at both sizes, with zero violations.
- 320 px width and 200% zoom with the dialog open: the text and the button can be reached by scrolling inside the dialog, and the page does not scroll sideways.
- Screen reader behaviour is covered by the component tests: the dialog is named by its title, the countdown is not in a live region, and the status element inside the dialog says "Nå kan du gå videre." only once the wait is over.
