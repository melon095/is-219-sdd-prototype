# Quickstart: Job-Matching Marketplace

**Feature**: `001-job-matching-marketplace` | **Plan**: [plan.md](./plan.md)

How to run the prototype and check that feature 001 and the shared frame work. Rules and page contents are not repeated here; see the linked contracts.

## Prerequisites

- Node.js 26 and pnpm 12.
- For end-to-end tests: Playwright's browsers, installed into Playwright's own cache (not globally) with `pnpm exec playwright install chromium webkit`.

## Setup and commands

Run from the repository root.

| Command | What it does |
|---|---|
| `pnpm install` | Install dependencies from the lockfile. |
| `pnpm seed` | Generate `src/seed/seed-data.json` ([seed-and-storage.md](./contracts/seed-and-storage.md#seed-data-step)). The file is committed, so this is only needed after changing `scripts/seed/`. |
| `pnpm dev` | Start the dev server at `http://localhost:5173`. |
| `pnpm test` | Run Vitest: domain rules, seed checks, and component tests with `jest-axe`. |
| `pnpm test:e2e` | Build and serve the app, then run Playwright at desktop (1280×800) and mobile (390×844) sizes, including axe scans of every page. |
| `pnpm lint` | `biome check`: lint (including Biome's accessibility rules) and format check for TypeScript, TSX, JSON, and CSS. |
| `pnpm format` | `biome check --write`: apply formatting and safe automatic fixes. |
| `pnpm typecheck` | `tsc --noEmit`. |
| `pnpm build` | Build the static site to `dist/`. |
| `pnpm preview` | Serve `dist/` locally. |

**Done means**: `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm test:e2e` all pass, and running `pnpm seed` leaves `git status` clean.

## Validation scenarios

Each scenario is covered by an automated test (Vitest for rules, Playwright for journeys). They can also be walked through by hand in `pnpm dev`. Start every manual run with **Tilbakestill demo**.

| # | Scenario | Expected outcome | Spec |
|---|---|---|---|
| 1 | Switch between a business owner, a worker, and a Varodd administrator in the header. | Each sees their own Norwegian view; the request list changes as described in [routes.md](./contracts/routes.md#oppdrag--oppdrag-request-list). | US1-1, FR-037 |
| 2 | Click each header button, on desktop and on mobile (through "Meny"). | The feature opens; on mobile the menu closes and focus moves to the page heading. | US1-2, FR-029, FR-034 |
| 3 | As an owner, publish a request with skills that seeded workers have. Time it. | Status Åpen, then Kortliste klar with up to 3 ranked workers. Takes under 5 minutes. | US2-1, US2-2, SC-001 |
| 4 | Look at the home page as that owner, then as a shortlisted worker, then as an unrelated worker. | The feed shows the shortlist to the owner and the shortlisted worker, and the new request to all workers, but not the other events to the unrelated worker. Clicking an entry opens the request page. | US1-3, US1-4, FR-030 |
| 5 | Publish a request with a 1-week duration. | Notice shown; request still published. | US2-9, FR-014 |
| 6 | Open the seeded requests with a full shortlist, a short shortlist, and no eligible worker. | 3 workers, 1–2 workers, and Åpen with no shortlist. | SC-002 |
| 7 | Invite a worker to an interview, send messages both ways, then make an offer. Switch to a different shortlisted worker. | Status stays Kortliste klar after the invitation, then Tilbud sendt. The other worker cannot see the conversation. | US2-4, US2-5, US4-2 |
| 8 | On an Offered request, press "Demo: Simuler at 7 dager har gått". | Offer counted as declined; next eligible worker added if any; log event says it was simulated. No other request changes. | US1-7, US3-4, FR-033 |
| 9 | Take a request through Agreed, In progress, and Completed as "Ble fast ansettelse". | Every step is in the log with time and person, and "System" for automatic events. | US2-6, US4-1, US4-4, US4-6, SC-003 |
| 10 | Reject a whole shortlist with a reason; as admin, return it to Open. | Under review, then Open; the rejected workers never come back for that request. | US2-7, FR-009, SC-005 |
| 11 | As admin, run the simulated NAV referral for a person; switch to that person and complete the profile. | Draft marked "Simulert" and not matched; after completion it is matched to suitable open requests. | US3-2, US3-3, FR-018 |
| 12 | As admin, run the simulated crawl. As an opted-in owner and a not-opted-in owner, open "Nytt oppdrag". | Only the opted-in business has pre-filled, marked suggestions; existing requests unchanged. | US5-1–US5-6, SC-004 |
| 13 | Make changes, then press "Tilbakestill demo" and confirm. | Data exactly as the seed (with dates moved to today); the same user stays selected. | US1-5, FR-031, SC-006 |
| 14 | Make changes, then open the prototype in a private window or another browser. | The changes are not there. | US1-6 |
| 15 | Run `pnpm seed` twice and compare. | `git status` shows no changes. | FR-032 |

## Accessibility checks (WCAG 2.1 AA)

Automated (part of `pnpm test` and `pnpm test:e2e`): `jest-axe` on every shared component and page component, and `@axe-core/playwright` with the `wcag2a`, `wcag2aa`, `wcag21a`, and `wcag21aa` tags on every page at both sizes, with zero violations allowed.

Manual, before calling the feature done:

1. **Keyboard only**: complete scenarios 3, 7, and 13 using only Tab, Shift+Tab, Enter, Space, the arrow keys, and Escape. Focus is always visible and never trapped except in open dialogs.
2. **Screen reader**: complete scenario 3 with NVDA (Windows) or VoiceOver (macOS/iOS). Labels, errors, the duration notice, and the "published" message are announced in Norwegian.
3. **Zoom and reflow**: at 200% zoom and at a 320 px wide window, no content is cut off and there is no horizontal scrolling except in wide tables.
4. **Colour**: statuses, errors, and NAV/simulated labels can be understood without colour.
