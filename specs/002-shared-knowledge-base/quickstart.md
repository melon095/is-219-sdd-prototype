# Quickstart: Shared Knowledge Base

**Feature**: `002-shared-knowledge-base` | **Plan**: [plan.md](./plan.md)

How to check that feature 002 works inside the shared frame. Setup, commands, and the definition of done are the same as in [001 quickstart.md](../001-job-matching-marketplace/quickstart.md#setup-and-commands). Rules and page contents are not repeated here; see the linked contracts.

## Simulated people used below

From the shared seed data ([scripts/seed/frame.ts](../../scripts/seed/frame.ts)):

| Person | Role in 002 |
|---|---|
| Kari Nordmann (owner) and Jonas Berg (employee), Fjordlys Keramikk | Members, colleagues |
| Per Hansen, Sørlandet Honning | Member |
| Ola Dahl, Kvadraturen Kaffebrenneri | Member |
| Anne Lie, Lindesnes Ullvarer | Non-member (business is not in E-Waves) |
| Marte Vik | Varodd administrator |

## Validation scenarios

Each scenario is covered by an automated test (Vitest for rules, Playwright for journeys). Start every manual run with **Tilbakestill demo**.

| # | Scenario | Expected outcome | Spec |
|---|---|---|---|
| 1 | Open Kunnskapsbank as Kari, as Anne, and as Marte. | Kari sees the forum. Anne sees only the membership explanation and no questions. Marte sees everything, with "Til vurdering" and no posting, answering, or flagging controls. | US1-1, US1-2, US1-4, FR-015 |
| 2 | As Jonas (not an owner), post a question; as Per, answer it. | Jonas can post like any member. The question shows Fjordlys Keramikk and Åpent, then Besvart with Sørlandet Honning's answer. Jonas's home feed shows the answer entry. | US1-3, US1-5, US1-6, FR-011, FR-017 |
| 3 | As Kari, answer Jonas's question as well; then edit her own answer. | Both answers stay visible; the edit is shown with "Endret". No comment controls exist. | US1-6, US1-7, US1-8 |
| 4 | Search the forum for words from a seeded answer (not its question), then open a topic. | The question appears in the results; the topic lists its questions with status. | US2-1, US2-2, FR-004 |
| 5 | Start a new question by typing each of the 3 prepared near-duplicate questions (see `nearDuplicateExamples` in the seed). Time a search for an existing answer. | Each shows its matching question under "Har noen spurt om dette før?", and publishing still works. Finding an answer takes under 2 minutes. | US2-3, FR-005, SC-001, SC-003 |
| 6 | As Per, flag Ola's answer with a reason; then try to flag his own answer. | Ola's answer shows the warning and appears in Marte's review list. Per has no "Flagg" button on his own content. | US3-1, FR-012 |
| 7 | Flag the only answer on a question; as Marte, clear it; flag it again and remove it. | Question goes Åpent, then Besvart, then Åpent again and stays Åpent. The author and the flagger see each outcome in their feed. | US3-3, US3-6, FR-014, FR-017 |
| 8 | Flag one of several answers on a question; as the author, edit the flagged answer. | The question stays Besvart; the warning stays after the edit. | US3-4, US3-5, FR-013 |
| 9 | As Marte, remove a flagged question. | The whole thread, with every answer, disappears from the forum and search; its link shows "Spørsmålet er fjernet". | US3-2, FR-013 |
| 10 | Open "Spør chatboten" and pick each prepared question. | Questions with stored content get an answer with source links and the trust notice. The rest get "Vi fant ikke noe svar på dette i forumet.", the closest questions, and "Still spørsmålet i forumet", which opens the form with the title filled in. | US4-1–US4-4, FR-006–FR-009, SC-002 |
| 11 | Flag a source answer of a chatbot answer, ask that question again, then clear the flag as Marte and ask again. | First the no-answer response, then the answer again. A question posted during the demo never appears as a chatbot source. | US4-5, FR-010, SC-002 |
| 12 | Look at the home feed as Anne and as a job seeker after scenarios 2 and 6. | No knowledge base entries are shown to them. | FR-022, spec edge case |
| 13 | As the worker placed permanently at an E-Waves business in 001's seed, open Kunnskapsbank. | They have member access. | spec assumption, 001 edge case |

## Accessibility checks (WCAG 2.1 AA)

The same automated checks as 001: `jest-axe` on every new component and page, and `@axe-core/playwright` with the `wcag2a`, `wcag2aa`, `wcag21a`, and `wcag21aa` tags on every page in [routes.md](./contracts/routes.md) at both sizes, with zero violations allowed. The 320 px reflow check covers the new routes.

Manual, before calling the feature done:

1. **Keyboard only**: scenarios 2, 6, and 10. Focus moves to the new answer after "Publiser svar", returns to "Flagg" (now "Du har flagget dette") after the flag dialog, and moves to each chatbot response.
2. **Screen reader**: scenarios 5 and 10. The number of similar questions, the search result count, the flag warning, and each chatbot response with its trust notice are announced in Norwegian.
3. **Zoom and reflow**: 200% zoom and 320 px width on the forum, question page, and chatbot.
4. **Colour**: Åpent, Besvart, Flagget, and Simulert can be understood without colour.
