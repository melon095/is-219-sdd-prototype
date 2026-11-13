# Data Model: Shared Knowledge Base

**Feature**: `002-shared-knowledge-base` | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

The frame entities (`Person`, `Business`, `ActivityEntry`, and the `Id`, `IsoDate`, and `IsoDateTime` types) are defined in [001 data-model.md](../001-job-matching-marketplace/data-model.md#frame-entities-shared-by-every-feature) and are not repeated here. 002 adds the `knowledgeBase` part of `DemoState` and one optional field to `Audience`.

```ts
type DemoState = {
  meta: DemoMeta;
  frame: FrameState;
  marketplace: MarketplaceState;
  knowledgeBase: KnowledgeBaseState;
};

type KnowledgeBaseState = {
  topics: Topic[];
  questions: Question[];
  answers: Answer[];
  flags: Flag[];
  reviews: Review[];
  chatbotQuestions: ChatbotQuestion[];
  nearDuplicateExamples: NearDuplicateExample[];
};
```

## Frame addition

### Audience.requiredGroup

| Field | Type | Rules |
|---|---|---|
| `requiredGroup` | `string`, optional | When set, the entry is shown only to Varodd administrators and to people who pass this group's check, in addition to the `personIds` or `groups` rule. Every 002 entry sets it to `"knowledgeBase.members"` (spec edge case, FR-022). Entries without it behave as before. |

## Knowledge base entities

### Topic

| Field | Type | Rules |
|---|---|---|
| `id` | `Id` | `tema-N` |
| `name` | `string` | Norwegian, 1–40 characters, unique |
| `description` | `string` | One short sentence shown on the topic page |

Fixed in the seed data and never edited (spec assumption).

### Question

| Field | Type | Rules |
|---|---|---|
| `id` | `Id` | `sporsmal-N` in the seed, from `newId` during a demo |
| `topicId` | `Id` | An existing topic |
| `title` | `string` | 1–120 characters after trimming (FR-001) |
| `description` | `string` | 1–4000 characters after trimming |
| `authorId` | `Id` | The member who posted it |
| `businessId` | `Id` | The author's member business when posted (research §3), shown as the attribution (FR-011) |
| `createdAt` | `IsoDateTime` | |
| `editedAt` | `IsoDateTime`, optional | Set on every edit; shown as "Endret" with the time |
| `moderation` | `Moderation` | Starts as `current` |

The status is **derived**, never stored (FR-014): `answered` while at least one answer to the question has moderation `current` or `cleared`, otherwise `open`. A removed question has no status; it is not shown anywhere.

### Answer

| Field | Type | Rules |
|---|---|---|
| `id` | `Id` | `svar-N` in the seed |
| `questionId` | `Id` | An existing question that is not removed when the answer is posted |
| `text` | `string` | 1–4000 characters after trimming |
| `authorId` | `Id` | Any member, including the asker and the asker's colleagues (FR-002) |
| `businessId` | `Id` | As for `Question` |
| `createdAt` | `IsoDateTime` | |
| `editedAt` | `IsoDateTime`, optional | |
| `moderation` | `Moderation` | Starts as `current` |

Answers to a question are shown oldest first.

### Moderation

`"current" | "flagged" | "cleared" | "removed"`

```text
current ──flag──▶ flagged ──clear──▶ cleared ──flag──▶ flagged …
                     │
                     └──remove──▶ removed   (final)
```

- Editing never changes it (FR-013).
- Removing a question sets every answer in it to `removed` as well, and closes every open review in the thread with outcome `removed` (FR-013, US3-2).
- `flagged` items are shown with a warning. `removed` items are not shown to anyone except in the administrator's review history.

### Flag

| Field | Type | Rules |
|---|---|---|
| `id` | `Id` | `flagg-N` |
| `reviewId` | `Id` | The review this flag belongs to |
| `targetKind` | `"question" \| "answer"` | |
| `targetId` | `Id` | |
| `flaggedBy` | `Id` | A member who is not the target's author |
| `reason` | `FlagReason` | `"outdated" \| "incorrect" \| "spam" \| "off-topic" \| "other"`, shown as Utdatert, Feil, Spam, Ikke relevant, Annet (FR-012) |
| `note` | `string`, optional | 0–500 characters; required when `reason` is `other` |
| `at` | `IsoDateTime` | |

### Review

| Field | Type | Rules |
|---|---|---|
| `id` | `Id` | `vurdering-N` |
| `targetKind` | `"question" \| "answer"` | |
| `targetId` | `Id` | |
| `openedAt` | `IsoDateTime` | Time of the first flag |
| `flagIds` | `Id[]` | At least 1. Each member at most once. |
| `outcome` | `"cleared" \| "removed"`, optional | Missing while the review is open |
| `reviewedBy` | `Id`, optional | A Varodd administrator; set with `outcome` |
| `reviewedAt` | `IsoDateTime`, optional | Set with `outcome` |

At most one open review per item. The review list shows open reviews, oldest first.

### ChatbotQuestion (Prepared Chatbot Question)

| Field | Type | Rules |
|---|---|---|
| `id` | `Id` | `chatbot-N` |
| `text` | `string` | The question as the member would ask it, 1–200 characters |
| `answer` | optional | `{ text: string; sourceQuestionIds: Id[]; sourceAnswerIds: Id[] }`. `text` is 1–1000 characters. At least one source question. Every source answer belongs to a source question. Missing for a question without stored content. |

The response is computed when the member picks the question (research §5):

| Condition | Response |
|---|---|
| `answer` is set, and every source question and source answer has moderation `current` or `cleared` | The prepared answer, links to the source threads, the trust notice (FR-006, FR-008) |
| `answer` is missing, or any source is `flagged` or `removed` | "Vi fant ikke noe svar på dette i forumet.", up to 3 closest questions from forum search on `text`, and "Still spørsmålet i forumet" (FR-007, FR-009, FR-010) |

### NearDuplicateExample

| Field | Type | Rules |
|---|---|---|
| `id` | `Id` | `duplikat-N` |
| `title` | `string` | A question a member might type, 1–120 characters |
| `description` | `string` | 1–4000 characters |
| `matchesQuestionId` | `Id` | The seeded question it is written to match |

Used by tests and by the demo script in [quickstart.md](./quickstart.md). For each example, the similar-question check (research §4) must list `matchesQuestionId` among its results (SC-003).

## Who can do what

`isMember(person, state)`: some E-Waves member business lists the person in `peopleWorkingAt` (research §3).

| Action | Member | Varodd administrator | Anyone else |
|---|---|---|---|
| See questions, answers, topics, search, chatbot | Yes | Yes | No; sees the membership explanation (US1-2) |
| Post a question, post an answer | Yes | No | No |
| Edit a question or answer | Own only, while not removed (FR-018) | No | No |
| Flag | Not own, not removed, not already in the open review | No | No |
| Review flags (clear or remove) | No | Yes | No |
| See who flagged and their notes | No | Yes | No |

## Seed data requirements

From the spec's assumptions and SC-002–SC-004. Checked by `scripts/seed/knowledge-base.test.ts`.

- 4–6 topics; every topic has at least 2 questions.
- 12–20 questions from at least 3 member businesses, written by owners and employees of E-Waves member businesses only.
- Both open and answered questions; at least one question with 3 or more answers; at least one question answered by the asker's colleague.
- At least one open review waiting (a flagged answer that is not a chatbot source); at least one closed review with outcome `cleared`; at least one removed answer.
- 6–8 chatbot questions; at least 3 with `answer` and at least 2 without. Every source exists and is `current` or `cleared` in the seed.
- Exactly 3 near-duplicate examples, each matching its `matchesQuestionId` under the similar-question rule.
- Every `authorId`, `flaggedBy`, `reviewedBy`, `businessId`, `topicId`, and source ID points to an existing record.
- Activity entries for the seeded history, each with `requiredGroup: "knowledgeBase.members"`.
