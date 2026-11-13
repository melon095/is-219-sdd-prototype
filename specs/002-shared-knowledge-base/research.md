# Research: Shared Knowledge Base

**Feature**: `002-shared-knowledge-base` | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

Feature 002 runs inside the shared frame that `001-job-matching-marketplace` built, and uses its stack unchanged (constitution principle I). This file records only the decisions that are new for 002. Everything else is in [001 research.md](../001-job-matching-marketplace/research.md).

## 1. Stack

- **Decision**: Use the stack from 001 as it is: React 19 + TypeScript (strict), Vite, pnpm on Node.js 26, React Aria Components copied into `src/frame/ui/`, React Router with hash URLs, Zod, Vitest + React Testing Library + `jest-axe`, Playwright + `@axe-core/playwright`, Biome. No new runtime or development dependencies.
- **Rationale**: The constitution requires one codebase and one set of stack decisions. Everything 002 needs (forms, lists, dialogs, tabs, a live region, storage, seed generation) already exists.
- **Alternatives considered**: A search library (such as MiniSearch or Fuse.js) for forum search and similar-question matching. Rejected: the spec asks for simple word matching that is easy to predict and test (§4), and the data set is about 20 questions.

## 2. How 002 plugs into the frame

- **Decision**: 002 adds one `FeatureDefinition` (`id: "knowledgeBase"`, `label: "Kunnskapsbank"`, `basePath: "/kunnskapsbank"`) to `src/app/features.ts` and one seed module to `scripts/seed/generate.ts`, as [shared-frame.md](../001-job-matching-marketplace/contracts/shared-frame.md) describes. Building 001 showed that a few frame files also have to name each feature's state, so these frame files change too:
  - `src/domain/frame/types.ts`: `DemoState` gets `knowledgeBase: KnowledgeBaseState`.
  - `src/frame/store/seed.ts`: `SeedFile`, `shiftSeedDates`, and `loadSeedState` get the `knowledgeBase` part. Its schema-coverage test fails if a date field is missed.
  - `src/domain/frame/activity.ts` and `src/frame/store/schema.ts`: the optional `audience.requiredGroup` (§7).
  - `src/frame/ui/`: a new shared `SearchField` component (§9).
  - `src/frame/layout/SubNav.tsx`: the secondary row of links that 001 built as `FeatureSubNav` in the marketplace feature moves to the frame, so both features use the same component and CSS (constitution IV).
- **Rationale**: These are additions to the shared definition, which principle IV requires instead of feature-specific copies. Nothing in 001's domain rules changes.
- **Alternatives considered**: Storing feature parts in a `Record<string, unknown>` so `DemoState` never changes. Rejected: it loses type checking for every feature, and stored data is checked by Zod anyway.

## 3. Membership and attribution

- **Decision**: A person is a member when some business with `isEWavesMember: true` lists them in `peopleWorkingAt(business, state)` (the frame function from 001, which includes owners, employees, and workers placed through 001 while In progress or after a permanent completion). `memberBusinessOf(person, state)` returns the first such business in the frame's business order. A question or answer stores the author's `businessId` when it is posted, so its attribution does not change later. Varodd administrators can view everything and review flags, and never post, answer, or flag, even if they also work at a member business (FR-015).
- **Rationale**: Reuses the one shared membership function (constitution I), and matches the spec's assumptions and 001's edge case about placed workers.
- **Alternatives considered**: Looking up the business at display time. Rejected: a placed worker who later loses membership would make old answers lose their business name.

## 4. Search and similar questions

- **Decision**: One pure module, `src/domain/knowledge-base/text.ts`, used by both:
  - `tokenize(text)`: Unicode NFC, lower case (`nb-NO`), split on anything that is not a letter or digit (`/[^\p{L}\p{N}]+/u`), drop words shorter than 3 letters, and drop a fixed list of common Norwegian words (such as *og, i, på, som, det, en, et, for, med, til, jeg, vi, hvordan, hva, kan, har, er, å, noen, man, meg, oss, min, vår*).
  - `wordsMatch(a, b)`: equal, or one is the start of the other and the shorter has at least 4 letters, so *nettbutikk* matches *nettbutikken* and *bilde* matches *bilder*.
  - **Search** (FR-004): the score is the number of distinct query words that match a word in the question's title, description, or the text of any answer that is not removed. Questions with score 0 and removed questions are left out. Order: score (higher first), then the number of matching title words, then newest first.
  - **Similar questions** (FR-005): the same scoring against title and description only. A question is shown when it shares at least 2 distinct words with what the member typed. Up to 3, in the same order as search. Updated 300 ms after the member stops typing.
- **Rationale**: The spec asks for simple word matching. Start-of-word matching handles the most common Norwegian endings without a stemmer. The rule is short enough to explain and to test with the prepared near-duplicate questions (SC-003).
- **Alternatives considered**: A Norwegian stemmer. Rejected: a dependency for little gain at this scale. Matching any part of a word. Rejected: too many false matches, for example *app* in *tapper*.

## 5. Simulated chatbot

- **Decision**: The chatbot is a pure read function with no command and nothing stored. `chatbotResponse(preparedQuestion, state)` returns:
  - an **answer** (`{ kind: "answer", text, sources }`) when the prepared question has a prepared answer and every source question and source answer is visible and not flagged (moderation `current` or `cleared`), or
  - **no answer** (`{ kind: "no-answer", closest }`) otherwise, where `closest` is up to 3 questions from forum search (§4) on the prepared question's text.
  The transcript lives only in the page's React state, so leaving the page clears it. Every answer shows the trust notice and `SimulatedLabel`. Every no-answer response says "Vi fant ikke noe svar på dette i forumet.", links the closest questions, and offers "Still spørsmålet i forumet", which opens `/kunnskapsbank/sporsmal/ny?fra=<preparedQuestionId>` with the title filled in from the prepared question.
- **Rationale**: FR-006–FR-010 and SC-002 are all about what is shown for a given forum state, so a pure function is the simplest thing to test. The sources are fixed seed IDs, so questions and answers posted during a demo are never used (spec edge case).
- **Alternatives considered**: Storing the chat transcript in `DemoState`. Rejected: nothing in the spec needs it, and it would fill the activity feed and the reset data with noise.

## 6. Moderation

- **Decision**: Each question and answer has `moderation: "current" | "flagged" | "cleared" | "removed"`. A `Flag` is one member's report. A `Review` groups the flags on one item from the first flag until an administrator decides. Rules:
  - A member may flag a question or answer that is not removed, is not their own (`authorId`), and that they have not already flagged in the open review. The first flag opens a review and sets `moderation: "flagged"`. Later flags join the open review (spec clarification 2026-11-13).
  - **Clear**: the review closes with outcome `cleared`, and the item becomes `cleared`. A cleared item can be flagged again, which opens a new review.
  - **Remove**: the review closes with outcome `removed`, and the item becomes `removed`. Removing a question also removes every answer in it, and closes every open review in that thread as `removed`.
  - Editing never changes `moderation` (FR-013).
  - A question's status is derived, never stored: answered while at least one answer is `current` or `cleared`, otherwise open (FR-014).
  - Authors see the warning and the reason categories, but not who flagged. Administrators see who flagged and each note.
- **Rationale**: A stored moderation state keeps the visibility rules and the chatbot check to one field. Deriving the status means it can never disagree with the answers. Hiding the flagger from the author avoids conflict between small businesses that know each other.
- **Alternatives considered**: Deriving moderation from the reviews every time. Rejected: harder to read and test, with no benefit.

## 7. Activity feed and who sees it

- **Decision**: Add an optional `requiredGroup` to the frame's `Audience`. An entry with `requiredGroup` is shown only to administrators and to people who pass that group's check, in addition to the existing `personIds` or `groups` rule. 002 registers the audience group `"knowledgeBase.members"` and sets it as `requiredGroup` on every knowledge base entry. Entries:
  - Question posted: "Nytt spørsmål: «*title*»", to group `knowledgeBase.members`.
  - Answer posted: "*Business* svarte på «*title*»", to group `knowledgeBase.members`, so the asker is notified (FR-017) along with other members.
  - Content flagged: "Et innlegg i «*title*» er flagget og venter på vurdering", to the author and the member who flagged.
  - Review finished: "Varodd har vurdert et flagget innlegg i «*title*»: det er beholdt" or "…: det er fjernet", to the author and every member who flagged.
  Each entry links to the question page. Edits create no entry.
- **Rationale**: The spec's edge case says knowledge base activity is never shown to people who cannot use the knowledge base. A placed worker whose placement ends would otherwise still see entries that name them.
- **Alternatives considered**: Separate entries for the asker and for other members. Rejected: the asker would see the same event twice.

## 8. Seed data

- **Decision**: `scripts/seed/knowledge-base.ts` is a `SeedModule` that builds a `DemoState` from the frame seed (with an empty marketplace part, because every seeded author is an owner or employee) and creates the forum history by applying the real 002 commands, as 001 does. It uses fixed times relative to the anchor date and IDs from counters: `tema-N`, `sporsmal-N`, `svar-N`, `flagg-N`, `vurdering-N`, `chatbot-N`, `duplikat-N`, `aktivitet-kb-N`. The content follows the spec's assumptions and SC-004: 5 topics, about 16 questions, 7 prepared chatbot questions (4 with an answer and 3 without), and 3 prepared near-duplicate questions. The seeded flagged item is not a source of any chatbot answer, so the chatbot answers all 4 at the start of a demo.
- **Rationale**: Replaying real commands keeps the seed consistent with the rules, and per-module random generators keep 001's part of the file unchanged (FR-032 in 001).
- **Alternatives considered**: Hand-written JSON. Rejected: it could break the moderation and status rules without anyone noticing.

## 9. Pages and layouts

- **Decision**: Pages are listed in [contracts/routes.md](./contracts/routes.md). Desktop and mobile layouts differ, as in 001 (breakpoint `48rem`). Search uses a new shared `SearchField` (React Aria `SearchField` from the Vanilla CSS starter kit, with a clear button), because 001's kit has none. Status uses the shared `StatusBadge`, flag warnings use the shared `Notice` (warning), and the chatbot's simulated parts use the shared `SimulatedLabel`.
- **Rationale**: Constitution principle IV.

## 10. Testing

- **Decision**: The same layers as 001. Vitest tests for every domain rule (text matching, permissions, commands, chatbot responses), written before the code. Component tests with `jest-axe` for every page and new component. Playwright journeys at desktop and mobile sizes for every quickstart scenario, with axe scans. `tests/e2e/routes.ts` gets the new routes, so the existing accessibility and 320 px reflow checks cover them.
- **Rationale**: Constitution principle III.
