---

description: "Task list for feature 002-shared-knowledge-base"
---

# Tasks: Shared Knowledge Base

**Input**: Design documents from `/specs/002-shared-knowledge-base/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Required. Constitution principle III makes the project test-driven: every domain rule and every acceptance scenario gets a test that is written first, fails, and then passes once the implementation task is done. A task is not done until its tests pass.

**Organization**: Tasks are grouped by user story, so each story can be built and checked on its own once the foundational work is in place. Feature 002 runs inside the shared frame that feature 001 built, which is already done.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: Which user story the task belongs to (US1–US4)
- Every task names the exact file paths it creates or changes

## Rules that apply to every task

- No comments in code (project owner's rule).
- Application code is written by subagents running Claude Sonnet 5.5 (`claude-sonnet-5-5`) at medium reasoning effort; the main agent hands out tasks and checks the results (plan.md Implementation Notes).
- Domain functions in `src/domain/` are pure TypeScript with no React import. They never read the clock, `localStorage`, the DOM, or `crypto`. Time, the acting person, and new IDs come from the command context.
- All interface text is written directly in Norwegian Bokmål, in the warm "du"/"vi" tone of 001's Design Language section.
- CSS uses only the custom properties in `src/frame/design/tokens.css`, and pages use only the shared components in `src/frame/ui/` (FR-023). A missing shared piece is added to `src/frame/`, never to the feature.
- Unit and component tests sit next to the file they test as `*.test.ts` or `*.test.tsx`. Component tests use the helpers in `src/frame/test-utils.tsx` and `src/features/marketplace/pages/renderPage.tsx` as patterns.
- "Run the tests" means `pnpm test` for Vitest tasks and `pnpm exec playwright test --workers=2 <file>` for Playwright tasks. Never run Playwright with more than 2 workers.
- People used in tests and seed data come from `scripts/seed/frame.ts`. Members: Kari Nordmann (`person-1`, owner) and Jonas Berg (`person-2`, employee) at Fjordlys Keramikk (`bedrift-1`), Per Hansen (`person-3`) at Sørlandet Honning (`bedrift-2`), and Ola Dahl (`person-5`) at Kvadraturen Kaffebrenneri (`bedrift-4`). Silje Moen (`person-6`) seeks work and is also a member, because 001's seed places her permanently at Kvadraturen Kaffebrenneri (request `oppdrag-12`, Completed with outcome `permanent`). Non-members: Anne Lie (`person-4`), Ingrid Solberg (`person-7`), and every other job seeker, such as Mats Johansen (`person-8`). Varodd administrator: Marte Vik (`person-15`).

## Path conventions

The existing single frontend project at the repository root (plan.md Project Structure): `src/`, `scripts/seed/`, `tests/e2e/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the starting point. The project, tooling, and shared frame already exist from 001.

- [X] T001 Run `pnpm install`, `pnpm lint`, `pnpm typecheck`, and `pnpm test` on branch `002-shared-knowledge-base` and confirm all pass before any change; record any failure in the task notes and fix it first
- [X] T002 Create the empty directories `src/domain/knowledge-base/`, `src/features/knowledge-base/pages/`, and `src/features/knowledge-base/components/` (each gets its first file in Phase 2)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Types, stored-data schema, the frame additions 002 needs, the text matching and permission rules, the feature registration, and an empty seed module. Nothing a user can see yet beyond an empty "Kunnskapsbank" page.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Types and schema

- [X] T003 Create `src/domain/knowledge-base/types.ts` with every type from data-model.md, field names and optionality exactly as listed: `Topic` (`id`, `name`, `description`), `Moderation` (`"current" | "flagged" | "cleared" | "removed"`), `Question` (`id`, `topicId`, `title`, `description`, `authorId`, `businessId`, `createdAt`, `editedAt?`, `moderation`), `Answer` (`id`, `questionId`, `text`, `authorId`, `businessId`, `createdAt`, `editedAt?`, `moderation`), `FlagReason` (`"outdated" | "incorrect" | "spam" | "off-topic" | "other"`), `Flag` (`id`, `reviewId`, `targetKind: "question" | "answer"`, `targetId`, `flaggedBy`, `reason`, `note?`, `at`), `Review` (`id`, `targetKind`, `targetId`, `openedAt`, `flagIds`, `outcome?: "cleared" | "removed"`, `reviewedBy?`, `reviewedAt?`), `ChatbotQuestion` (`id`, `text`, `answer?: { text; sourceQuestionIds; sourceAnswerIds }`), `NearDuplicateExample` (`id`, `title`, `description`, `matchesQuestionId`), `KnowledgeBaseState` (`topics`, `questions`, `answers`, `flags`, `reviews`, `chatbotQuestions`, `nearDuplicateExamples`), `QuestionStatus` (`"open" | "answered"`), `ChatbotResponse` (`{ kind: "answer"; text; sources: Question[] } | { kind: "no-answer"; closest: Question[] }`), and one input type per command in contracts/commands.md
- [X] T004 Change `src/domain/frame/types.ts`: add `knowledgeBase: KnowledgeBaseState` to `DemoState` and the optional `requiredGroup?: string` to `Audience`. Then fix every place `pnpm typecheck` reports except `src/frame/store/seed.ts` (changed in T010), including the fixture states in `src/domain/marketplace/testState.ts`, `src/frame/test-utils.tsx`, and any test that builds a `DemoState` by hand, by adding an empty knowledge base part (`{ topics: [], questions: [], answers: [], flags: [], reviews: [], chatbotQuestions: [], nearDuplicateExamples: [] }`) through one exported helper `emptyKnowledgeBaseState()` in `src/domain/knowledge-base/types.ts`
- [X] T005 [P] Create `src/features/knowledge-base/schema.ts` with a Zod 4 schema for `KnowledgeBaseState` that enforces data-model.md verbatim: `Topic.name` "Norwegian, 1–40 characters, unique"; `Question.title` "1–120 characters after trimming"; `Question.description` "1–4000 characters after trimming"; `Answer.text` "1–4000 characters after trimming"; `Flag.note` "0–500 characters; required when `reason` is `other`"; `Review.flagIds` "At least 1. Each member at most once."; `ChatbotQuestion.text` "1–200 characters"; `ChatbotQuestion.answer.text` "1–1000 characters" with "At least one source question"; `NearDuplicateExample.title` "1–120 characters"; dates as the frame's `IsoDateTime` schema
- [X] T006 Change `src/frame/store/schema.ts` so the `Audience` schema accepts the optional `requiredGroup` string, and add a test case to the existing schema checks in `src/frame/store/persistence.test.ts` that parsing a stored state whose activity entry has `requiredGroup: "knowledgeBase.members"` with `storedStateSchema` keeps `requiredGroup` in the result, and that an entry without it still parses

### Frame additions (test first)

- [X] T007 [P] Add failing tests to `src/domain/frame/activity.test.ts` for `requiredGroup` (research.md §7): an entry with `requiredGroup: "g"` and the person in `audience.personIds` is hidden when group `g`'s check is false and shown when it is true; the same for an entry shown through `audience.groups`; an administrator always sees it; an entry without `requiredGroup` behaves exactly as before
- [X] T008 Implement the `requiredGroup` check in `canSeeEntry` in `src/domain/frame/activity.ts` so the tests in `src/domain/frame/activity.test.ts` pass
- [X] T009 [P] Add failing tests to `src/frame/store/seed.test.ts`: `shiftSeedDates` moves every `IsoDateTime` in the `knowledgeBase` part (`Question.createdAt`, `Question.editedAt`, `Answer.createdAt`, `Answer.editedAt`, `Flag.at`, `Review.openedAt`, `Review.reviewedAt`) by exactly `days` whole days, using a fixture `SeedFile` built in the test with one item of every knowledge base type, and the schema-coverage test walks that fixture's `knowledgeBase` part too
- [X] T010 Change `src/frame/store/seed.ts`: add `knowledgeBase: KnowledgeBaseState` to `SeedFile`, shift every date field listed in T009 explicitly in `shiftSeedDates`, and include `knowledgeBase` in `loadSeedState`, so the tests in `src/frame/store/seed.test.ts` pass
- [X] T011 [P] Create the shared `SearchField` in `src/frame/ui/SearchField.tsx`, `src/frame/ui/SearchField.css`, and `src/frame/ui/SearchField.test.tsx`: copy React Aria's `SearchField` from the Vanilla CSS starter kit, keep the `.react-aria-SearchField` class names, style it like the other form fields (white, `--color-grey-300` border, `--radius`, `--shadow-field`, navy border when focused, a clear button at least `--target-size-min` in size with the accessible name "Tøm søket"), props `label`, `value`, `onChange`, `onSubmit`, optional `description`; the test renders it with the label "Søk i forumet", types, clears with the clear button and with Escape, and asserts `expect(await axe(container)).toHaveNoViolations()`
- [X] T012 [P] Write failing tests in `src/frame/layout/SubNav.test.tsx` for a shared `SubNav` with props `label` (the `<nav>` accessible name) and `links: { label: string; path: string; badge?: string }[]`: it renders one link per item; the link for the current route has `aria-current="page"`; a `badge` is shown after the label and is part of the link's accessible name; with no links it renders nothing (no empty landmark); `jest-axe` passes. Also write `SubNavLayout` tests: it renders `SubNav` above an `<Outlet />`
- [X] T013 Move the markup and CSS of `src/features/marketplace/components/FeatureSubNav.tsx` and `FeatureSubNav.css` into `src/frame/layout/SubNav.tsx` and `src/frame/layout/SubNav.css` (generic, driven by props, with `SubNavLayout({ label, useLinks })` where `useLinks()` is a hook returning the links for the current person), so the tests in `src/frame/layout/SubNav.test.tsx` pass. Then make `src/features/marketplace/components/FeatureSubNav.tsx` a thin wrapper that builds the 001 links ("Min profil", "Min bedrift", "Varodd-verktøy", label "I Oppdrag") and renders the shared component, delete `FeatureSubNav.css`, and confirm `src/features/marketplace/components/FeatureSubNav.test.tsx` still passes unchanged

### Knowledge base rules shared by every story (test first)

- [X] T014 [P] Write failing tests in `src/domain/knowledge-base/text.test.ts` for `tokenize(text)`, `wordsMatch(a, b)`, and `matchScore(queryWords, textWords)` per research.md §4: `tokenize` applies NFC and `nb-NO` lower case, splits on `/[^\p{L}\p{N}]+/u`, keeps æ, ø, and å, drops words shorter than 3 letters, and drops exactly the 73 stop words listed in research.md §4, exported as the constant `stopWords` (the test asserts `stopWords` equals that list, and that *hvordan*, *kan*, *jeg*, and *også* are dropped while *nettbutikk*, *bruke*, and *claude* are kept); `wordsMatch` is true for equal words and when one is the start of the other and the shorter has at least 4 letters (*nettbutikk*/*nettbutikken*, *bilde*/*bilder*), and false for *app*/*tapper* and *app*/*apper* (shorter than 4); `matchScore` counts distinct query words that match at least one text word
- [X] T015 Implement `src/domain/knowledge-base/text.ts` so the tests in `src/domain/knowledge-base/text.test.ts` pass
- [X] T016 [P] Write failing tests in `src/domain/knowledge-base/permissions.test.ts` for the table in data-model.md §Who can do what: `isMember(person, state)` is true for Kari, Jonas, Per, Ola, and Silje Moen (placed permanently through `oppdrag-12`) on the seed state, false for Anne, Ingrid, Mats Johansen, and Marte, and true for a worker who is the agreed worker of an `in-progress` request at an E-Waves business, or of a `completed` request there with outcome `permanent`, and false after `completed` with `as-planned` (uses `peopleWorkingAt`); `memberBusinessOf(person, state)` returns the first E-Waves member business in frame order that lists the person (Kvadraturen Kaffebrenneri, `bedrift-4`, for Silje Moen); `canView` (member or admin), `canPost` (member and not admin), `canEditQuestion` and `canEditAnswer` (the author, while not `removed`, never an admin), `canFlag(person, target, state)` (member, not admin, not the author, not `removed`, and no flag by this person in the target's open review), `canReview` (admin only), `canSeeFlaggers` (admin only)
- [X] T017 Implement `src/domain/knowledge-base/permissions.ts` so the tests in `src/domain/knowledge-base/permissions.test.ts` pass
- [X] T018 [P] Write failing tests in `src/domain/knowledge-base/status.test.ts` for `questionStatus(question, state)` (FR-014): `answered` while at least one answer to the question has moderation `current` or `cleared`, `open` when it has no answers, when every answer is `flagged`, when every answer is `removed`, and when the answers are a mix of `flagged` and `removed`; and for `visibleQuestions(state)` (every question that is not `removed`) and `visibleAnswers(questionId, state)` (answers that are not `removed`, oldest first)
- [X] T019 Implement `questionStatus`, `visibleQuestions`, and `visibleAnswers` in `src/domain/knowledge-base/status.ts` so the tests in `src/domain/knowledge-base/status.test.ts` pass
- [X] T020 [P] Write failing tests in `src/domain/knowledge-base/activity.test.ts` for the builders in `src/domain/knowledge-base/activity.ts` (research.md §7, contracts/commands.md): each returns an `ActivityEntry` with `id` from `context.newId()`, `at = context.now`, `featureId: "knowledgeBase"`, `target.route` `/kunnskapsbank/sporsmal/<questionId>`, and `audience.requiredGroup: "knowledgeBase.members"`; `questionPostedActivity` text "Nytt spørsmål: «*title*»" to group `knowledgeBase.members`; `answerPostedActivity` text "*Business* svarte på «*title*»" to group `knowledgeBase.members`; `contentFlaggedActivity` text "Et innlegg i «*title*» er flagget og venter på vurdering" to `personIds` [author, flagger]; `reviewFinishedActivity` text "Varodd har vurdert et flagget innlegg i «*title*»: det er beholdt" or "…: det er fjernet" to `personIds` [author, every flagger] with no duplicates
- [X] T021 Implement `src/domain/knowledge-base/activity.ts` so the tests in `src/domain/knowledge-base/activity.test.ts` pass

### Feature registration, empty page, and empty seed

- [X] T022 [P] Write failing component tests in `src/features/knowledge-base/pages/MembersOnlyPage.test.tsx` and `src/features/knowledge-base/components/KnowledgeBaseLayout.test.tsx`: `MembersOnlyPage` shows the `<h1>` "Kunnskapsbanken er for E-Waves-medlemmer", the text "Kunnskapsbanken er et medlemsgode for bedrifter i E-Waves, et nettverk av nettbutikker. Her hjelper bedriftene hverandre med spørsmål og svar." and a link to `/`; `KnowledgeBaseLayout` renders `MembersOnlyPage` and no outlet for a non-member (Anne), and the shared `SubNav` (label "I Kunnskapsbank") with "Forum" (`/kunnskapsbank`) and "Spør chatboten" (`/kunnskapsbank/chatbot`) plus the outlet for a member; an admin also sees "Til vurdering" (`/kunnskapsbank/vurdering`) with the number of open reviews as its badge; switching user re-checks access; `jest-axe` passes (US1-2)
- [X] T023 Implement `src/features/knowledge-base/pages/MembersOnlyPage.tsx` and `src/features/knowledge-base/components/KnowledgeBaseLayout.tsx` (uses `SubNavLayout` and `canView`; T058 later switches the count to `openReviews`; until then the badge count is `state.knowledgeBase.reviews.filter((review) => review.outcome === undefined).length`) so the tests from T022 pass
- [X] T024 [P] Write failing tests in `src/features/knowledge-base/feature.test.ts`: `id: "knowledgeBase"`, `label: "Kunnskapsbank"`, `basePath: "/kunnskapsbank"`; `homeCard` returns for members "Spør andre bedrifter" / "Still et spørsmål, eller finn svar fra bedrifter som har løst det samme før deg." / "Gå til kunnskapsbanken" / `/kunnskapsbank`, for admins "Kunnskapsbanken" / "Se hva medlemmene spør om, og vurder innhold som er flagget." / "Gå til kunnskapsbanken" / `/kunnskapsbank`, and `null` for everyone else; `audienceGroups` has `"knowledgeBase.members"` equal to `isMember`; `systemSteps` is empty; it comes after `marketplace` in `features` from `src/app/features.ts`
- [X] T025 Create `src/domain/knowledge-base/commands.ts` (an empty `knowledgeBaseCommandHandlers` record for now) and `src/features/knowledge-base/feature.ts` with the definition tested in T024, `stateSchema` from `src/features/knowledge-base/schema.ts`, and `routes` with one layout route rendering `KnowledgeBaseLayout` and three children rendering a placeholder `PageHeading`: `/kunnskapsbank` ("Kunnskapsbank"), `/kunnskapsbank/chatbot` ("Spør chatboten"), and `/kunnskapsbank/vurdering` ("Til vurdering"), so no link in the `SubNav` leads to a missing page before US3 and US4 replace the placeholders. Register it after `marketplaceFeature` in `src/app/features.ts`, so the tests in `src/features/knowledge-base/feature.test.ts` pass
- [X] T026 Create `scripts/seed/knowledge-base.ts` exporting `seedKnowledgeBase: SeedModule` that returns `{ key: "knowledgeBase", data: emptyKnowledgeBaseState(), activity: [] }` for now; add `["knowledgeBase", seedKnowledgeBase]` after `marketplace` in `featureModules` in `scripts/seed/generate.ts`; run `pnpm seed`; run `pnpm test` and confirm `scripts/seed/generate.test.ts` and every 001 seed test still pass, and that `git diff src/seed/seed-data.json` shows only a new `seedId` and the new `knowledgeBase` key, with the `frame` and `marketplace` parts unchanged. Then add to `src/frame/store/seed.test.ts`: `loadSeedState` returns a state with a `knowledgeBase` part, and the schema-coverage test also walks the bundled seed's `knowledgeBase` part
- [X] T027 Run `pnpm lint`, `pnpm typecheck`, and `pnpm test`; run `pnpm exec playwright test --workers=2 tests/e2e/frame.spec.ts` and fix the header and mobile menu tests for the new "Kunnskapsbank" button if they count buttons; open `http://localhost:5173/#/kunnskapsbank` with `pnpm dev` as Kari and as Anne and confirm the placeholder and the members-only page render with no console errors

**Checkpoint**: The feature is registered, data loads with an empty knowledge base, non-members are kept out, and the shared rules for text matching, permissions, status, and activity exist. Story work can start.

---

## Phase 3: User Story 1 – Ask a question and get an answer from another member (Priority: P1) 🎯 MVP

**Goal**: Members post questions and answers, see who answered, edit their own content, and are notified of answers. Non-members are kept out, and administrators can read but not write.

**Independent Test**: As Jonas, post a question; as Per, answer it; see it become Besvart with Sørlandet Honning's answer and Jonas notified in the feed. Check Anne sees only the membership explanation and Marte sees everything without posting controls. (Quickstart scenarios 1, 2, 3.)

### Tests for User Story 1 (write first, must fail)

- [X] T028 [P] [US1] Write failing tests in `src/domain/knowledge-base/questions.test.ts` for `postQuestion` and `editQuestion` per contracts/commands.md: only a member who is not an admin may post (`not-allowed` for Anne and Marte); validation returns `validation` with `fieldErrors` for an unknown `topicId`, `title` outside "1–120 characters after trimming" ("Skriv en tittel på opptil 120 tegn"), and `description` outside "1–4000 characters after trimming" ("Beskriv spørsmålet med opptil 4000 tegn"); a valid question is stored trimmed with `authorId = actorId`, `businessId = memberBusinessOf(actor)`, `createdAt = now`, `moderation: "current"`, and `questionStatus` `open`; activity from `questionPostedActivity`; `editQuestion` by the author replaces `topicId`, `title`, and `description`, sets `editedAt = now`, keeps `moderation` (also when `flagged`), and adds no activity; editing by anyone else is `not-allowed`; editing a `removed` question is `not-found`
- [X] T029 [P] [US1] Write failing tests in `src/domain/knowledge-base/answers.test.ts` for `postAnswer` and `editAnswer`: any member who is not an admin may answer, including the asker and the asker's colleague (Kari answers Jonas's question) (FR-002); `text` outside "1–4000 characters after trimming" gives "Skriv et svar på opptil 4000 tegn"; answering a `removed` or unknown question is `not-found`; the answer is stored with `authorId`, `businessId`, `createdAt`, `moderation: "current"`; the question's status becomes `answered`; a second answer keeps the first (US1-7); activity from `answerPostedActivity` naming the answering business, visible to the asker through `visibleActivity` with `allAudienceGroups` (FR-017); `editAnswer` by the author replaces `text`, sets `editedAt`, keeps `moderation`; others get `not-allowed`
- [ ] T030 [P] [US1] Write failing component tests in `src/features/knowledge-base/pages/ForumPage.test.tsx` for the US1 parts of `/kunnskapsbank` (contracts/routes.md): the `<h1>` "Kunnskapsbank"; the topics, each with name, description, and number of visible questions, linking to `/kunnskapsbank/tema/<topicId>`; the 10 newest visible questions as `QuestionRow`s showing title (link), topic, business name, a `StatusBadge` "Åpent" (tone `neutral`) or "Besvart" (tone `success`), the number of visible answers, and the date in `nb-NO`; "Still et spørsmål" for members and not for admins; desktop shows topics left and the list right, mobile shows the topics in a `Disclosure` "Tema" above the list; `jest-axe` passes
- [ ] T031 [P] [US1] Write failing component tests in `src/features/knowledge-base/pages/QuestionFormPage.test.tsx` for `/kunnskapsbank/sporsmal/ny` and `/kunnskapsbank/sporsmal/:questionId/rediger`: fields `Select` "Tema", `TextField` "Tittel" with a visible character count "*n* av 120 tegn", and `TextArea` "Beskriv spørsmålet"; `?tema=<topicId>` preselects the topic; field errors from a `validation` result appear on their fields; publishing navigates to the new question page and announces "Spørsmålet er publisert"; an admin sees "Som Varodd-ansatt kan du lese, men ikke skrive i kunnskapsbanken." and no form; the edit route is filled in, saves with `editQuestion`, and for someone other than the author shows `NoAccessPage`; `jest-axe` passes
- [ ] T032 [P] [US1] Write failing component tests in `src/features/knowledge-base/pages/QuestionPage.test.tsx` for the US1 parts of `/kunnskapsbank/sporsmal/:questionId`: the title as the `<h1>`, the `StatusBadge`, a link to the topic, the business name, the author's name, the date, "Endret *time*" when `editedAt` is set, and the description; "*N* svar" and each visible answer oldest first with business name, author name, date, "Endret" when edited, and text; the author sees "Rediger" on their question (link to the edit route) and on their own answers (inline `TextArea` with "Lagre" and "Avbryt", dispatching `editAnswer`); members see "Skriv et svar" with a `TextArea` and "Publiser svar", which dispatches `postAnswer`, clears the field, announces "Svaret er publisert", and moves focus to the new answer; there are no comment controls (US1-8); an admin sees no answer form and no "Rediger"; desktop shows a side panel with topic, status, number of answers, and up to 5 other questions in the topic, mobile shows that content after the answers; an unknown question ID shows the frame's not-found page; `jest-axe` passes
- [ ] T033 [P] [US1] Write failing Playwright tests in `tests/e2e/knowledge-base.spec.ts` (both projects): as Kari, Anne, and Marte open "Kunnskapsbank" from the header (on mobile through "Meny") and see the forum, the members-only page with no questions, and the forum with "Til vurdering" and no "Still et spørsmål" (scenario 1, US1-1, US1-2, US1-4); as Jonas post a question and see Fjordlys Keramikk and Åpent; as Per answer it and see Besvart and Sørlandet Honning; as Jonas see the answer entry in the home feed and follow it to the question (scenario 2, US1-3, US1-5, US1-6, FR-017); as Kari answer the same question, see both answers, edit her answer and see "Endret" (scenario 3, US1-7, US1-8); as Anne and as Mats Johansen see no knowledge base entries in the home feed (scenario 12, FR-022); as Silje Moen, who 001's seed places permanently at Kvadraturen Kaffebrenneri, open Kunnskapsbank and see the forum, and post an answer attributed to Kvadraturen Kaffebrenneri (scenario 13); axe scan with tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` finds zero violations on `/kunnskapsbank`, `/kunnskapsbank/sporsmal/ny`, and a question page

### Implementation for User Story 1

- [X] T034 [US1] Implement `postQuestion` and `editQuestion` in `src/domain/knowledge-base/questions.ts` so the tests in `src/domain/knowledge-base/questions.test.ts` pass
- [X] T035 [US1] Implement `postAnswer` and `editAnswer` in `src/domain/knowledge-base/answers.ts` so the tests in `src/domain/knowledge-base/answers.test.ts` pass
- [X] T036 [US1] Register `postQuestion`, `editQuestion`, `postAnswer`, and `editAnswer` in `knowledgeBaseCommandHandlers` in `src/domain/knowledge-base/commands.ts`
- [X] T037 [US1] First add failing tests in `scripts/seed/knowledge-base.test.ts` against the output of `buildSeedFile()`: exactly 5 topics, every topic with at least 2 visible questions; 12–20 questions written only by `person-1`, `person-2`, `person-3`, and `person-5`, from at least 3 businesses; both open and answered questions; at least one question with 3 or more answers; at least one question answered by the asker's colleague; each of `person-1`, `person-2`, `person-3`, and `person-5` writes at least one question and at least one answer; at least one answer by Ola (`person-5`) is not a chatbot source and has no flag (used by T057); every `authorId`, `businessId`, and `topicId` points to an existing record; every knowledge base activity entry has `requiredGroup: "knowledgeBase.members"`; the part passes the schema from `src/features/knowledge-base/schema.ts`. Then extend `scripts/seed/knowledge-base.ts` so it builds a `DemoState` from the frame seed with an empty marketplace part and creates 5 topics (`tema-1`…`tema-5`: Nettbutikk, Teknisk hjelp, Kunstig intelligens, Markedsføring, Drift og regnskap, each with a one-sentence description) and about 16 Norwegian questions with answers by applying the real `postQuestion` and `postAnswer` commands with fixed times between 30 and 3 days before the anchor date `2026-11-16`, fixed actors, and counter IDs `sporsmal-N`, `svar-N`, `aktivitet-kb-N`. Include at least 2 questions about using AI tools such as Claude, and the content the chatbot (T072) and near-duplicate examples (T046) will point to. Run `pnpm seed` and make the seed tests pass
- [ ] T038 [P] [US1] Create `src/features/knowledge-base/components/QuestionStatusBadge.tsx` (maps `questionStatus` to "Åpent" `neutral` or "Besvart" `success` on the shared `StatusBadge`) and `src/features/knowledge-base/components/QuestionRow.tsx` and `QuestionRow.css` (the row described in T030, with "Flagget" shown when the question's moderation is `flagged`)
- [ ] T039 [US1] Implement `src/features/knowledge-base/pages/ForumPage.tsx` and `ForumPage.css` (US1 parts only; search comes in US2) and register it as the `/kunnskapsbank` child route in `src/features/knowledge-base/feature.ts`, so the tests in `src/features/knowledge-base/pages/ForumPage.test.tsx` pass
- [ ] T040 [US1] Implement `src/features/knowledge-base/pages/QuestionFormPage.tsx` and `QuestionFormPage.css` (form at reading width; on desktop leave a right column for the similar-questions panel added in US2) and register `/kunnskapsbank/sporsmal/ny` and `/kunnskapsbank/sporsmal/:questionId/rediger`, so the tests in `src/features/knowledge-base/pages/QuestionFormPage.test.tsx` pass
- [ ] T041 [US1] Create `src/features/knowledge-base/components/AnswerItem.tsx` and `AnswerItem.css` (one answer with attribution, "Endret", and inline edit for the author), then implement `src/features/knowledge-base/pages/QuestionPage.tsx` and `QuestionPage.css` and register `/kunnskapsbank/sporsmal/:questionId`, so the tests in `src/features/knowledge-base/pages/QuestionPage.test.tsx` pass. Use `focusAfterRender` from `src/frame/ui/useFocusAfter.ts` for focus after "Publiser svar" and after saving an edit
- [ ] T042 [US1] Run `pnpm test` and `pnpm exec playwright test --workers=2 tests/e2e/knowledge-base.spec.ts` until every US1 test passes on both projects

**Checkpoint**: Members can ask and answer, and access rules hold. This is the MVP.

---

## Phase 4: User Story 2 – Find questions and answers in the forum (Priority: P2)

**Goal**: Members search the forum, browse by topic, and see similar questions before posting.

**Independent Test**: Search for words that appear only in a seeded answer and find its question; open a topic and see its questions with status; type each prepared near-duplicate question into the new-question form and see its match, then still publish. (Quickstart scenarios 4, 5.)

### Tests for User Story 2 (write first, must fail)

- [ ] T043 [P] [US2] Write failing tests in `src/domain/knowledge-base/search.test.ts` for `searchQuestions(query, state)`, `similarQuestions(title, description, state)`, and `questionsByTopic(topicId, state)` per research.md §4: search scores each visible question by `matchScore` against its title, description, and the text of answers that are not `removed`; a word found only in an answer finds the question; a word found only in a `removed` answer does not; `removed` questions never appear; score-0 questions are left out; order is score, then matching title words, then newest; an empty or stop-word-only query returns `[]`. `similarQuestions` scores against title and description only, requires at least 2 shared distinct words, returns at most 3 in the same order, and excludes `removed` questions. `questionsByTopic` returns visible questions in the topic, newest first. Also add a test that for each `nearDuplicateExamples` entry in the seed, `similarQuestions(example.title, example.description, seedState)` contains `matchesQuestionId` (SC-003)
- [ ] T044 [P] [US2] Add failing tests to `src/features/knowledge-base/pages/ForumPage.test.tsx` for search: a `SearchField` "Søk i forumet"; submitting writes `?sok=<query>` to the URL and shows "*N* treff for «*query*»" (announced through `LiveAnnouncer`) and the matching `QuestionRow`s in order; no results shows the `EmptyState` "Vi fant ingen spørsmål som passer. Prøv andre ord, eller still spørsmålet selv."; clearing the field returns to the topics and newest questions; opening `/kunnskapsbank?sok=<query>` directly shows the results. Write failing tests in `src/features/knowledge-base/pages/TopicPage.test.tsx` for `/kunnskapsbank/tema/:topicId`: the topic name as `<h1>`, its description, its visible questions newest first as `QuestionRow`s, "Still et spørsmål i dette temaet" for members linking to `/kunnskapsbank/sporsmal/ny?tema=<topicId>`, and the not-found page for an unknown topic; `jest-axe` passes for both (US2-1, US2-2)
- [ ] T045 [P] [US2] Add failing tests to `src/features/knowledge-base/pages/QuestionFormPage.test.tsx` for similar questions (FR-005): 300 ms after typing stops in "Tittel" or "Beskriv spørsmålet" (use fake timers), the panel "Har noen spurt om dette før?" lists up to 3 questions from `similarQuestions`, each with title (link), `QuestionStatusBadge`, business name, and the first 160 characters of its first visible answer, followed by "Du kan fortsatt publisere spørsmålet ditt."; a change in the number of matches is announced through `LiveAnnouncer` ("Vi fant 2 lignende spørsmål"); the panel is absent when nothing matches and on the edit route; publishing works while the panel is shown; desktop shows the panel beside the form, mobile between "Tittel" and "Beskriv spørsmålet"; `jest-axe` passes with the panel shown
- [ ] T046 [US2] First add failing tests to `scripts/seed/knowledge-base.test.ts`: exactly 3 `nearDuplicateExamples` with IDs `duplikat-1`…`duplikat-3`, each `matchesQuestionId` points to a visible seeded question, and each example matches it under `similarQuestions`. Then extend `scripts/seed/knowledge-base.ts` with those 3 examples (Norwegian, worded differently from their target but sharing at least 2 content words with its title or description). Run `pnpm seed` and make the seed tests pass
- [ ] T047 [P] [US2] Write failing Playwright tests in `tests/e2e/search.spec.ts` (both projects): as Ola, search for a word that appears only in a seeded answer and open the question it finds; open a topic and see its questions with Åpent or Besvart (scenario 4, US2-1, US2-2); open "Still et spørsmål", type each of the 3 seeded near-duplicate examples (read from `src/seed/seed-data.json`) into "Tittel" and "Beskriv spørsmålet", and see its matching question listed under "Har noen spurt om dette før?", then publish the last one and see the new question page (scenario 5, US2-3, SC-003); from `/`, reach a seeded answer through the header, the search field, and a result link, which is the path a person takes in the SC-001 manual timing in T079; axe scan with zero violations on a search result page, a topic page, and the form with the similar-questions panel shown

### Implementation for User Story 2

- [ ] T048 [US2] Implement `searchQuestions`, `similarQuestions`, and `questionsByTopic` in `src/domain/knowledge-base/search.ts` so the tests in `src/domain/knowledge-base/search.test.ts` pass
- [ ] T049 [US2] Add search to `src/features/knowledge-base/pages/ForumPage.tsx` with the shared `SearchField`, and implement `src/features/knowledge-base/pages/TopicPage.tsx` and register `/kunnskapsbank/tema/:topicId` in `src/features/knowledge-base/feature.ts`, so the new tests in `ForumPage.test.tsx` and `TopicPage.test.tsx` pass
- [ ] T050 [US2] Create `src/features/knowledge-base/components/SimilarQuestions.tsx` and `SimilarQuestions.css` and use it in `src/features/knowledge-base/pages/QuestionFormPage.tsx` so the new tests in `QuestionFormPage.test.tsx` pass
- [ ] T051 [US2] Run `pnpm test` and `pnpm exec playwright test --workers=2 tests/e2e/search.spec.ts tests/e2e/knowledge-base.spec.ts` until every US1 and US2 test passes on both projects

**Checkpoint**: Members can find existing answers before asking.

---

## Phase 5: User Story 3 – Keep the knowledge trustworthy (Priority: P2)

**Goal**: Members flag questions and answers after publication; flagged content shows a warning; Varodd administrators clear or remove it; everyone involved is told the outcome.

**Independent Test**: As Per, flag Ola's answer; see the warning; as Marte, clear it, then flag and remove another; check statuses, warnings, removed threads, and feed entries. (Quickstart scenarios 6, 7, 8, 9.)

### Tests for User Story 3 (write first, must fail)

- [ ] T052 [P] [US3] Write failing tests in `src/domain/knowledge-base/moderation.test.ts` for `flagContent` per contracts/commands.md and research.md §6: only under `canFlag` (`not-allowed` for the author, for Marte, and for Anne; `not-allowed` for a member who already has a flag in the open review); `reason` must be one of the five `FlagReason` values; `note` "0–500 characters; required when `reason` is `other`" ("Fortell kort hva som er galt"); the first flag on a `current` or `cleared` item opens a `Review` with `openedAt = now` and `flagIds` [the flag], and sets the target's `moderation` to `flagged`; a second member's flag joins the same open review and does not open another; a `removed` target is `not-found`; the result has the `info` notice "Takk! Varodd ser på det du har flagget."; activity from `contentFlaggedActivity`; flagging the only answer makes the question `open`, and flagging one of two answers leaves it `answered` (US3-3, US3-4)
- [ ] T053 [P] [US3] Add failing tests to `src/domain/knowledge-base/moderation.test.ts` for `reviewContent` and `openReviews`: only an admin (`not-allowed` otherwise); a closed review gives `invalid-status`; `clear` sets `outcome: "cleared"`, `reviewedBy`, `reviewedAt = now`, and the target to `cleared`, after which the question is `answered` again if it was the answer that counted, and the item can be flagged again, which opens a new review (US3-3); `remove` on an answer sets it to `removed` and the question stays `open` if no other answer counts; `remove` on a question sets the question and every answer in it to `removed` and closes every other open review in the thread with `outcome: "removed"` (US3-2); each closed review adds one `reviewFinishedActivity` to the author and every flagger (US3-6); editing a flagged item with `editQuestion` or `editAnswer` keeps `flagged` (US3-5); `openReviews(state)` returns open reviews oldest first
- [ ] T054 [P] [US3] Write failing component tests in `src/features/knowledge-base/components/FlagDialog.test.tsx` and `FlagWarning.test.tsx`: "Flagg" opens a `Dialog` "Flagg innlegget" with a `RadioGroup` "Hva er galt?" (Utdatert, Feil, Spam, Ikke relevant, Annet) and a `TextArea` "Fortell kort hva som er galt" that becomes required for "Annet"; "Send" dispatches `flagContent`, closes the dialog, announces the notice, and returns focus to the control, which now reads "Du har flagget dette" and is not a button; "Avbryt" changes nothing; `FlagWarning` is a warning `Notice` "Dette innlegget er flagget (*reasons*) og blir vurdert av Varodd. Vær forsiktig med å stole på det." listing each distinct reason label in the open review, and for an admin also each flagger's name, reason, note, and time; `jest-axe` passes for both
- [ ] T055 [P] [US3] Add failing tests to `src/features/knowledge-base/pages/QuestionPage.test.tsx`: members see "Flagg" on other people's question and answers but not on their own; flagged items show `FlagWarning`; an admin sees "Behold" and "Fjern" on flagged items ("Fjern" opens an `AlertDialog`, which for a question says "Hele tråden blir fjernet, med alle svarene."); removed answers are not shown and not counted; a removed question shows the `<h1>` "Spørsmålet er fjernet", the text "Varodd har fjernet dette spørsmålet fordi det ikke passet i forumet.", a link to `/kunnskapsbank`, and none of its content; `jest-axe` passes
- [ ] T056 [P] [US3] Write failing component tests in `src/features/knowledge-base/pages/ReviewPage.test.tsx` for `/kunnskapsbank/vurdering`: only admins (others get `NoAccessPage`); open reviews oldest first, each showing "Spørsmål" or "Svar", the question title as a link, the content text, author and business, and every flag with name, reason, note, and time; "Behold" dispatches `reviewContent` with `clear` and announces "Innlegget er beholdt"; "Fjern" asks in an `AlertDialog` and then dispatches `remove` and announces "Innlegget er fjernet"; after either, focus moves to the next review or to the empty state; "Tidligere vurderinger" lists the 10 newest closed reviews with outcome, admin name, and time; with no open reviews, the `EmptyState` "Ingenting venter på vurdering."; `jest-axe` passes
- [ ] T057 [P] [US3] Write failing Playwright tests in `tests/e2e/moderation.spec.ts` (both projects): as Per flag the first seeded answer by Ola that is not a chatbot source and has no flag (found in `src/seed/seed-data.json`) with "Utdatert", see the warning and "Du har flagget dette", and see no "Flagg" on Per's own content; as Marte see it in "Til vurdering" with Per's name (scenario 6, US3-1). Scenarios 7–9 create their own content through the UI at the start of each test, so they do not depend on which seeded questions have one or several answers: as Jonas post a question and as Ola post its only answer; as Per flag that answer and see Åpent, clear it as Marte and see Besvart, flag it again as Per and remove it as Marte and see Åpent stay; as Ola (the author) and as Per (the flagger) see each outcome entry in the home feed (scenario 7, US3-3, US3-6); as Jonas post a question and as Ola and Kari each post an answer; as Per flag Ola's answer and see Besvart stay; as Ola edit the flagged answer and see the warning stay (scenario 8, US3-4, US3-5); as Jonas post a question with a word not used anywhere in the seed and as Ola answer it; as Per flag the question; as Marte remove it and see the thread gone from the forum and from a search for that word, and its link show "Spørsmålet er fjernet" (scenario 9, US3-2); axe scan with zero violations on `/kunnskapsbank/vurdering` and on a question page with a flagged answer

### Implementation for User Story 3

- [ ] T058 [US3] Implement `flagContent`, `reviewContent`, and `openReviews` in `src/domain/knowledge-base/moderation.ts`, register `flagContent` and `reviewContent` in `src/domain/knowledge-base/commands.ts`, and switch the badge count in `src/features/knowledge-base/components/KnowledgeBaseLayout.tsx` to `openReviews`, so the tests in `src/domain/knowledge-base/moderation.test.ts` pass
- [ ] T059 [US3] First add failing tests to `scripts/seed/knowledge-base.test.ts`: at least one open review on an answer that is not a source of any chatbot answer; at least one closed review with outcome `cleared`; at least one `removed` answer with a closed review `removed`; every `flaggedBy` and `reviewedBy` points to an existing person, and no flag is on the flagger's own content. Then extend `scripts/seed/knowledge-base.ts` with that history, made with the real `flagContent` and `reviewContent` commands (IDs `flagg-N` and `vurdering-N`, admin `person-15`). Run `pnpm seed` and make the seed tests pass
- [ ] T060 [P] [US3] Create `src/features/knowledge-base/components/FlagDialog.tsx`, `FlagWarning.tsx`, and `Moderation.css` so the tests in `FlagDialog.test.tsx` and `FlagWarning.test.tsx` pass
- [ ] T061 [US3] Create `src/features/knowledge-base/components/ReviewActions.tsx` ("Behold" and "Fjern" with the `AlertDialog`, shared by the question page and the review page), add flagging, warnings, admin actions, and the removed-question view to `src/features/knowledge-base/pages/QuestionPage.tsx` and `src/features/knowledge-base/components/AnswerItem.tsx`, so the new tests in `QuestionPage.test.tsx` pass
- [ ] T062 [US3] Create `src/features/knowledge-base/components/ReviewItem.tsx`, implement `src/features/knowledge-base/pages/ReviewPage.tsx` and `ReviewPage.css`, and replace the `/kunnskapsbank/vurdering` placeholder from T025 with it in `src/features/knowledge-base/feature.ts`, so the tests in `ReviewPage.test.tsx` pass
- [ ] T063 [US3] Run `pnpm test` and `pnpm exec playwright test --workers=2 tests/e2e/moderation.spec.ts tests/e2e/knowledge-base.spec.ts tests/e2e/search.spec.ts` until every US1–US3 test passes on both projects

**Checkpoint**: Flagging and review work, and the question status follows the moderation rules.

---

## Phase 6: User Story 4 – Ask the simulated chatbot instead of searching (Priority: P3)

**Goal**: Members pick a prepared question and get either a short answer with source links and a trust notice, or a clear no-answer response with the closest questions and an offer to post. Flagged or removed sources turn an answer into a no-answer response.

**Independent Test**: Pick every prepared question and check the response; flag a source of an answer and see the no-answer response; clear the flag and see the answer come back. (Quickstart scenarios 10, 11.)

### Tests for User Story 4 (write first, must fail)

- [ ] T064 [P] [US4] Write failing tests in `src/domain/knowledge-base/chatbot.test.ts` for `chatbotResponse(chatbotQuestion, state)` per data-model.md §ChatbotQuestion and research.md §5: with `answer` set and every source question and source answer `current` or `cleared`, it returns `{ kind: "answer", text, sources }` with the source questions in the order given; with `answer` missing it returns `{ kind: "no-answer", closest }` where `closest` is the first 3 results of `searchQuestions(chatbotQuestion.text, state)`; any source question or source answer `flagged` gives the no-answer response, and clearing it gives the answer again (FR-010, US4-5); any source `removed` gives the no-answer response; a question or answer posted with `postQuestion` or `postAnswer` during the test never appears in `sources` (spec edge case); the function never returns text that is not in the seed's `answer.text` (FR-007)
- [ ] T065 [P] [US4] Write failing component tests in `src/features/knowledge-base/pages/ChatbotPage.test.tsx` for `/kunnskapsbank/chatbot` (contracts/routes.md): the `<h1>` "Spør chatboten", a `SimulatedLabel`, and the text "I den ekte tjenesten kan du skrive spørsmålet ditt med egne ord. I denne prototypen velger du blant noen ferdige spørsmål."; one button per prepared question and no text input (US4-1); picking one adds the question and the response to a transcript with `role="log"`, and moves focus to the response; an answer shows its text, "Kilder:" with links to each source question, and the info `Notice` "Svaret er laget av en chatbot og kan ta feil. Sjekk kildene før du stoler på det." (US4-2, US4-3); a no-answer response shows "Vi fant ikke noe svar på dette i forumet.", "Disse spørsmålene ligner kanskje:" with up to 3 links when there are any, and for members a link "Still spørsmålet i forumet" to `/kunnskapsbank/sporsmal/ny?fra=<chatbotQuestionId>`, which an admin does not see (US4-4); desktop shows the list left and the transcript right, mobile the transcript first; `jest-axe` passes with both kinds of response in the transcript
- [ ] T066 [P] [US4] Add failing tests to `src/features/knowledge-base/pages/QuestionFormPage.test.tsx`: `?fra=<chatbotQuestionId>` fills in "Tittel" with that prepared question's text (cut to 120 characters), and an unknown ID leaves it empty (FR-009)
- [ ] T067 [P] [US4] Write failing Playwright tests in `tests/e2e/chatbot.spec.ts` (both projects): as Kari open "Spør chatboten" and pick every prepared question; each one with stored content shows an answer with at least one source link and the trust notice, each one without shows "Vi fant ikke noe svar på dette i forumet."; follow "Still spørsmålet i forumet" and see "Tittel" filled in (scenario 10, US4-1–US4-4, SC-002); as Per flag the first source answer, not written by Per, of the first chatbot question that has an answer (found in `src/seed/seed-data.json`), ask that question again as Kari and see the no-answer response, clear the flag as Marte and see the answer again; post a new question and answer during the test and confirm no chatbot response links to them (scenario 11, US4-5, FR-010, SC-002); axe scan with zero violations on `/kunnskapsbank/chatbot` with an answer and a no-answer response shown

### Implementation for User Story 4

- [ ] T068 [US4] Implement `chatbotResponse` in `src/domain/knowledge-base/chatbot.ts` so the tests in `src/domain/knowledge-base/chatbot.test.ts` pass
- [ ] T069 [US4] Create `src/features/knowledge-base/components/ChatbotTranscript.tsx` and `ChatbotTranscript.css`, implement `src/features/knowledge-base/pages/ChatbotPage.tsx` and `ChatbotPage.css`, and replace the `/kunnskapsbank/chatbot` placeholder from T025 with it in `src/features/knowledge-base/feature.ts`, so the tests in `ChatbotPage.test.tsx` pass. The transcript lives in the page's React state only
- [ ] T070 [US4] Add the `?fra=` prefill to `src/features/knowledge-base/pages/QuestionFormPage.tsx` so the new tests in `QuestionFormPage.test.tsx` pass
- [ ] T071 [US4] First add failing tests to `scripts/seed/knowledge-base.test.ts`: 7 `chatbotQuestions` (`chatbot-1`…`chatbot-7`); at least 4 with `answer` and at least 2 without; every source question and answer exists and is `current` or `cleared`; every source answer belongs to one of the answer's source questions; no source is the target of an open review; at least one chatbot answer has a source answer that Per (`person-3`) did not write and has not flagged (used by T067); `chatbotResponse` gives `answer` for each with `answer` and `no-answer` for the rest on the seed state (SC-002)
- [ ] T072 [US4] Extend `scripts/seed/knowledge-base.ts` with the 7 prepared chatbot questions (Norwegian, in the member's own words, such as "Hvordan kan jeg bruke KI til å skrive produkttekster?"), 4 with a short prepared answer of 2–4 sentences that only restates what its source answers say, and 3 about problems the forum has no answer to. Run `pnpm seed` and make the tests from T071 pass
- [ ] T073 [US4] Run `pnpm test` and `pnpm exec playwright test --workers=2 tests/e2e/chatbot.spec.ts` until every US4 test passes on both projects

**Checkpoint**: All four user stories work and are each covered by passing tests.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility on every page, regression checks for 001, reproducibility, performance, final checks, and documentation.

- [ ] T074 Add the 002 pages to `tests/e2e/routes.ts` as new groups, so `tests/e2e/accessibility.spec.ts` and `tests/e2e/reflow.spec.ts` cover them: a member (Kari) visiting `/kunnskapsbank`, `/kunnskapsbank?sok=<a seeded word>`, `/kunnskapsbank/tema/tema-1`, `/kunnskapsbank/sporsmal/ny`, a seeded open question, a seeded answered question with a flagged answer, the edit route of one of Kari's questions, and `/kunnskapsbank/chatbot`; a non-member (Anne) visiting `/kunnskapsbank`; an admin (Marte) visiting `/kunnskapsbank` and `/kunnskapsbank/vurdering`; a removed question's page. Run both spec files with `--workers=2` and fix every violation and every page wider than 320 px
- [ ] T075 [P] Add knowledge base checks to `src/domain/frame/performance.test.ts`: apply each of the 6 knowledge base command types once to the seed state with valid input, and run `searchQuestions` and `similarQuestions` once, each finishing in under 100 ms (plan.md Performance Goals)
- [ ] T076 Run the whole 001 end-to-end suite with `pnpm exec playwright test --workers=2 tests/e2e/frame.spec.ts tests/e2e/owner-request.spec.ts tests/e2e/worker.spec.ts tests/e2e/lifecycle.spec.ts tests/e2e/crawl.spec.ts tests/e2e/keyboard.spec.ts tests/e2e/performance.spec.ts` and fix every failure caused by 002 (for example, knowledge base entries in the home feed of Kari, Jonas, Per, or Ola pushing a 001 entry past the first 20, or the new header button), without weakening any 001 test
- [ ] T077 Run `pnpm seed` twice and confirm `git status` shows no change to `src/seed/seed-data.json` (001 FR-032)
- [ ] T078 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm exec playwright test --workers=2` and fix every failure until all four pass
- [ ] T079 Do the manual checks in quickstart.md §Accessibility checks (keyboard only through scenarios 2, 6, and 10; screen reader through scenarios 5 and 10; 200% zoom and 320 px reflow; meaning without colour) and record the result of each, with any problem found and how it was fixed, in `specs/002-shared-knowledge-base/accessibility-results.md`. In the same file, record a timed manual run for SC-001: a person who has not used the prototype before starts at `/` after **Tilbakestill demo** as Ola, is given one of the seeded problems in plain words, and finds an existing answer through search or the chatbot; record the time in seconds and pass only if it is under 120 seconds
- [ ] T080 [P] Update the "Project state" section of `CLAUDE.md` at the repository root to say that feature 002 is built, and add `src/domain/knowledge-base/` and `src/features/knowledge-base/` to the code layout list. Update `specs/001-job-matching-marketplace/contracts/shared-frame.md` to list `SearchField`, `SubNav`, and `Audience.requiredGroup` among the shared parts

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup. Blocks every user story.
- **US1 (Phase 3)**: Depends on Foundational. Its seed questions and answers are the content every later story searches, flags, and cites.
- **US2 (Phase 4)**: Depends on US1 (forum page, question form, seeded questions).
- **US3 (Phase 5)**: Depends on US1 (question page, answers). Independent of US2, except that its e2e test checks a removed thread is gone from search, so run T057 after T049.
- **US4 (Phase 6)**: Depends on US1 (seeded sources), US2 (`searchQuestions` for the closest questions), and US3 (`flagContent` and `reviewContent` for the flag-a-source test).
- **Polish (Phase 7)**: Depends on every story.

### User Story Dependency Graph

```text
Setup → Foundational → US1 ─┬─> US2 ─┐
                            └─> US3 ─┴─> US4
```

### Within Each Story

- Write the tests and see them fail before the implementation task they cover.
- Domain rules (`src/domain/knowledge-base/`) before command registration in `commands.ts`.
- Command registration before seed changes, because the seed step runs the real commands.
- Seed changes before e2e tests that depend on seeded records.
- Pages after the components they use.
- The story's closing "Run `pnpm test` and Playwright" task marks the story as done.

### Files Changed by Several Stories

These files are extended story by story, so tasks touching them are never parallel with each other: `src/features/knowledge-base/feature.ts`, `src/domain/knowledge-base/commands.ts`, `scripts/seed/knowledge-base.ts`, `scripts/seed/knowledge-base.test.ts`, `src/seed/seed-data.json`, `src/features/knowledge-base/pages/ForumPage.tsx`, `QuestionFormPage.tsx`, `QuestionPage.tsx`, `src/features/knowledge-base/components/AnswerItem.tsx`, and their test files.

---

## Parallel Examples

### Foundational

```text
Task: "T005 KnowledgeBaseState schema"   Task: "T007 requiredGroup tests"   Task: "T009 seed date tests"
Task: "T011 SearchField"   Task: "T012 SubNav tests"   Task: "T014 text matching tests"
Task: "T016 permissions tests"   Task: "T018 status tests"   Task: "T020 activity builder tests"
```

### User Story 1

```text
Task: "T028 questions tests"   Task: "T029 answers tests"   Task: "T030 ForumPage tests"
Task: "T031 QuestionFormPage tests"   Task: "T032 QuestionPage tests"   Task: "T033 e2e tests"
```

### User Story 2

```text
Task: "T043 search tests"   Task: "T044 ForumPage search and TopicPage tests"   Task: "T045 similar questions tests"
```

### User Story 3

```text
Task: "T052 flagContent tests"   Task: "T054 FlagDialog and FlagWarning tests"   Task: "T056 ReviewPage tests"
```

### User Story 4

```text
Task: "T064 chatbot tests"   Task: "T065 ChatbotPage tests"   Task: "T066 prefill tests"
```

---

## Implementation Strategy

### MVP First (US1)

1. Phase 1: Setup.
2. Phase 2: Foundational.
3. Phase 3: US1. Stop and check it with `tests/e2e/knowledge-base.spec.ts`.
4. US1 alone is a demo-ready knowledge base: members ask and answer, non-members are kept out, and answers reach the home feed.

### Incremental Delivery

1. Setup + Foundational → feature registered, empty knowledge base loads.
2. US1 → ask and answer (MVP).
3. US2 → search, topics, and similar questions.
4. US3 → flagging and review.
5. US4 → simulated chatbot.
6. Polish → full accessibility scan, 001 regression check, reproducibility, and docs.

Each step ends with all tests passing and leaves earlier stories and feature 001 working.

---

## Notes

- Two points the spec left open were settled in plan.md: authors see why their content was flagged but not who flagged it (T054), and the chatbot's offer to post opens the question form with the title filled in (T066, T070).
- Commit after each task or logical group.
