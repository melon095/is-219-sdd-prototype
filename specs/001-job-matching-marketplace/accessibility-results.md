# Accessibility Results: Job-Matching Marketplace

**Feature**: `001-job-matching-marketplace` | **Checks defined in**: [quickstart.md](./quickstart.md#accessibility-checks-wcag-21-aa) | **Task**: T156

This file records the four manual checks from quickstart.md. Three of them could be automated and now run as Playwright tests, so they stay checked on every run of `pnpm test:e2e`. The screen reader check needs a person with a screen reader and has not been done.

| # | Check | Result |
|---|---|---|
| 1 | Keyboard only (scenarios 3, 7, 13) | Passed, automated in `tests/e2e/keyboard.spec.ts` (desktop project) |
| 2 | Screen reader (scenario 3) | Not done, needs a person |
| 3 | Zoom and reflow | Passed, automated in `tests/e2e/reflow.spec.ts` (both projects) |
| 4 | Colour | Passed, checked from the code (see below) |

Alongside these, every route is scanned with axe (tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`) at both sizes in `tests/e2e/accessibility.spec.ts` (T150), with zero violations allowed, exactly one `<h1>`, and a `<title>` ending in " – Varodd".

## 1. Keyboard only

**Method.** `tests/e2e/keyboard.spec.ts` drives the app with Playwright using only key presses: Tab, Shift+Tab, Enter, Space, the arrow keys, Delete, and Escape. It never clicks. It runs in the desktop project only, because Tab behaves differently in iOS Safari and the mobile layout is a different component tree.

Every Tab stop is checked for a visible focus indicator. The test takes a screenshot of the focused element and its surroundings, moves focus to a hidden element, takes a second screenshot, and fails if the two images are identical. Focus is moved to a hidden element inside the dialog when a dialog is open, so the dialog's focus trap does not pull it back.

**What is covered.**

- Tab through the home page, the new-request form, and a request page with a shortlist. Each run must leave the header, reach the main content, visit more than three stops, and either return to the start or leave the page. Shift+Tab goes back to the same stops in reverse order.
- Scenario 3: open "Nytt oppdrag" from the list with Enter, check the heading gets focus, fill every field (title, description, skills, additional requirements, date, duration, hours, location), remove skills with Enter and Delete and the arrow keys inside the tag list, pick a skill from the combo box with ArrowDown and Enter, choose "Fjernarbeid" with Space, and publish with Enter. The test checks that the "Oppdraget er publisert" announcement is in the live region, the status is "Kortliste klar", and the shortlist has 3 workers.
- Scenario 7: invite a worker to an interview with Enter, move between conversation tabs with the arrow keys, send messages as the owner and as the worker, switch user with the "Bytt bruker" list (ArrowUp, ArrowDown, Enter; focus returns to the button), make an offer with Space, and check that a different shortlisted worker only sees their own conversation.
- Scenario 13: change data, open "Tilbakestill demo" with Enter, press Tab and Shift+Tab eight times each and check focus never leaves the dialog, close with Escape and check focus returns to "Tilbakestill demo", open it again, confirm with Enter, and check the heading gets focus on the home page, "Demoen er tilbakestilt" is announced, and the changed data is gone.

**Result.** Passed. Focus is visible on every stop, focus is trapped only inside open dialogs and returns to the button that opened them, and Tab always reaches the end of the page.

**Problems found and how they were fixed.**

1. Focus was lost after "Inviter til intervju" and "Gi tilbud". The button is removed from the page once the action is done, so focus dropped to the top of the document, and the next Tab started from the beginning. Fixed in `src/features/marketplace/components/ShortlistPanel.tsx`: after a successful invite or offer, focus moves to the worker's entry in the shortlist (the list item now accepts programmatic focus with `tabIndex={-1}`).
2. While running the same flow, the first version of the focus check gave false alarms for the remove button on skill tags (the button's parent has no box of its own) and for buttons inside dialogs (the dialog pulled focus back). These were faults in the test, not the app, and were fixed in the test.

**Same problem elsewhere, fixed.** Other actions also remove the button that was pressed, so focus dropped to the top of the page. Each now moves focus to a fixed target once the action succeeds, using one shared helper, `focusAfterRender` in `src/frame/ui/useFocusAfter.ts`. It waits until the page has updated and any closing dialog is gone, focuses the target, and stops if the person has already moved focus elsewhere. The status is still announced through `useAnnounce`. The targets are made focusable with `tabIndex={-1}`.

| Action | Where focus lands |
|---|---|
| Invite to interview, make an offer | The worker's entry in the shortlist |
| Reject the whole shortlist | The "Kortliste" heading |
| Accept an offer | The "Din status" heading |
| Decline an offer, withdraw | The page heading (`<h1>`), which now shows the "not open for you" text |
| Record start, complete, cancel, "Gjør åpen igjen" on the request page | The "Detaljer" heading, next to the status badge |
| "Gjør åpen igjen" or cancel on Varodd-verktøy | The next request in "Til vurdering", or the previous one if it was last, or the "Til vurdering" heading if the list is now empty |
| NAV referral on Varodd-verktøy | The next person in the list, or the previous one if it was last, or the "Simulert NAV-henvisning" heading if the list is now empty |

Component tests in `src/features/marketplace/pages/focusAfterAction.test.tsx` check each landing place. `tests/e2e/keyboard.spec.ts` drives accept, decline and cancel by keyboard in a real browser and checks the focus ring is visible on the target. The helper's first version kept pulling focus back to the target after a person had already pressed Tab; the keyboard test for scenario 7 caught it, and it now stops once focus has moved.

## 2. Screen reader

**Ikke utført – krever manuell test med skjermleser av en person.**

No screen reader was used. Nothing below has been checked by listening.

quickstart.md names NVDA or VoiceOver. The project owner works on Linux with KDE Plasma, so this check is planned with **Orca and Firefox** instead, with the Orca voice set to Norwegian Bokmål (`nb`). Orca reads some React Aria widgets differently from NVDA and VoiceOver, so the result is recorded as an Orca result. If an iPhone is available, VoiceOver in Safari also covers the mobile layout.

Steps for the project owner, from quickstart.md scenario 3 and the screen reader check:

1. Start the app (`pnpm dev`, then open `http://localhost:5173` in Firefox, or `pnpm build && pnpm preview`) and start Orca (`orca`; settings with `orca -s`).
2. Press "Tilbakestill demo" and confirm, so the data is the seed data.
3. In "Bytt bruker", choose a business owner, for example Kari Nordmann.
4. Open "Oppdrag", then "Nytt oppdrag". Start a timer.
5. Fill in the form: a title, a description, skills that the seeded workers have (for example "Sosiale medier" and "Innholdsproduksjon"), a desired start date, a duration, hours per week, and "Fjernarbeid" or "På stedet".
6. Enter a duration of 1 week and press Tab. Listen for the duration notice: "Varigheten er utenfor det vanlige (2 uker til 6 måneder). Du kan fortsatt publisere oppdraget."
7. Press "Publiser oppdraget" once with a field left empty, to hear the error messages, then fix them and publish.
8. Listen for the "Oppdraget er publisert" message after publishing, and for the new page title and heading.
9. Check that the status is "Kortliste klar" and that the shortlist has up to 3 ranked workers, and that the whole task took under 5 minutes.
10. Check that these are announced in Norwegian: every field label, every error message, the duration notice, the "Oppdraget er publisert" message, the status, and the shortlist.
11. Record what was heard, any problem, and how it was fixed, in this section.

| | |
|---|---|
| Tested by | |
| Date | |
| Screen reader and browser | |
| Result | |
| Problems found | |
| How they were fixed | |

## 3. Zoom and reflow

**Method.** `tests/e2e/reflow.spec.ts` loads every route in contracts/routes.md as a person who may see it (the same routes and users as the axe scan), including each tab of the request page at mobile size, and fails if `document.documentElement.scrollWidth` is larger than the viewport. It runs in both projects, in two sizes:

- 320 px wide (WCAG 1.4.10 reflow). Limit: 320.
- 200% zoom on a 1280 px wide window. A 1280 px window at 200% zoom is 640 CSS pixels wide, so the test uses a 640 × 400 CSS pixel viewport with `deviceScaleFactor: 2`. Limit: 640.

**Wide tables.** Content inside an element with the class `wide-table` is left out of the measurement. Only one element has the class: the request table (`<table class="request-table wide-table">`) on the request list page in `src/features/marketplace/pages/RequestListPage.tsx`. It lists six columns of data for each request and is only shown from 768 px wide; below that the list is shown as cards. At 320 px and at 640 px it is not on the page at all. Nothing else is marked, so no other content is exempt.

**Result.** Passed at both sizes, in both projects, for every route. There is no horizontal scrolling at 320 px or at 200% zoom.

**Problem found and how it was fixed.** At 200% zoom (640 × 400 CSS pixels), opening "Bytt bruker" inside the "Meny" dialog showed a list that was taller than the space above the button. The list was drawn outside its own frame, over the button and over "Tilbakestill demo", and the mouse release of a click landed on a person in the list, so the wrong user was chosen without the person asking for it. The cause was in `src/frame/ui/ListBox.css`: the pop-up frame did not shrink the list to the space available. The pop-up now lays out as a column and the list may shrink (`min-height: 0`), so it scrolls inside its frame. This fix applies to every select and combo box in the app.

## 4. Colour

**Method.** Read from the code and the tests. The check is that nothing relies on colour alone. The colour tokens are in `src/frame/design/tokens.css`, and `src/frame/design/tokens.test.ts` (T152) makes sure no colour is written anywhere else.

**Request status** (`src/features/marketplace/components/RequestStatusBadge.tsx`, `src/frame/ui/StatusBadge.tsx`). The badge always shows the status name as text. The colour only adds emphasis.

| Status | Text in the badge | Tone (extra, not the meaning) |
|---|---|---|
| open | Åpen | info |
| shortlisted | Kortliste klar | info |
| offered | Tilbud sendt | warning |
| agreed | Avtalt | success |
| in-progress | Pågår | success |
| completed | Fullført | neutral |
| cancelled | Avlyst | error |
| under-review | Til vurdering | warning |

Two statuses share a tone (for example "Avtalt" and "Pågår"), which is fine because the text tells them apart. The log also writes the status change in words ("Status endret fra Åpen til Kortliste klar").

**Errors.**

- Field errors (`.react-aria-FieldError`) are a sentence under the field, such as "Skriv en tittel på 1–100 tegn." The field is also marked `aria-invalid` for screen readers. The red border and red text are extra.
- Notices (`src/frame/ui/Notice.tsx`) have an icon (`i`, `✓`, `!`, `×`) and a hidden text prefix ("Informasjon:", "Vellykket:", "Advarsel:", "Feil:"). Error notices have `role="alert"`. The icon is hidden from screen readers (`aria-hidden`), and the prefix replaces it.
- Error text uses `--color-error-text`, which is dark enough for AA on white. The error red is never used as a fill behind text.

**NAV labels.** The shortlist shows the badge "Henvist fra NAV" (`ShortlistPanel.tsx`). The worker's profile page says "Du er henvist fra NAV (simulert)", and the admin button reads "Henvis fra NAV (simulert)". All are plain text.

**"Simulert" label** (`src/frame/ui/SimulatedLabel.tsx`). It is the word "Simulert" in a small box, so the word carries the meaning, not the blue. It is used next to the NAV referral, the crawl, the crawl suggestions, and simulated log entries. Simulated log entries also say it in the sentence ("Simulert med feilsøkingsknappen"). Crawl suggestions on the new-request form carry the tag text "Forslag", which is part of the tag's accessible name, and the sentence "Foreslått fra en simulert gjennomgang av nettsiden deres". The demo time button starts with the word "Demo:" and has a dashed border, so it is not recognised by colour either.

**Other places where colour could be the only signal.** None found. Selected options in lists have a "✓" mark. Links in the page text are underlined (`src/frame/ui/Link.css`).

**Result.** Passed. Statuses, errors, NAV labels, and "Simulert" labels can all be understood without colour. This is a read-through of the code, not a test with a colour-blindness simulator.

**Problems found.** None.
