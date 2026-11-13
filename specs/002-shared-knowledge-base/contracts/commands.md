# Contract: Knowledge Base Commands

**Feature**: `002-shared-knowledge-base` | **Data model**: [data-model.md](../data-model.md) | **Frame**: [001 shared-frame.md](../../001-job-matching-marketplace/contracts/shared-frame.md)

Every command is a pure `CommandHandler` in `src/domain/knowledge-base/`, registered in `src/features/knowledge-base/feature.ts`. It receives `(state, command, context)` with `context = { actorId, now, newId }` and returns `{ ok: true, state, notices }` or `{ ok: false, error }`, as in 001. A failed command changes nothing. The "is this allowed" checks live in `src/domain/knowledge-base/permissions.ts` and are shared by the commands and the pages, as in 001.

Common errors:

| Code | When |
|---|---|
| `not-allowed` | The acting person may not do this (see [data-model.md §Who can do what](../data-model.md#who-can-do-what)) |
| `not-found` | An ID does not exist, or points to removed content |
| `validation` | A field breaks a rule; `fieldErrors` has one Norwegian message per field |
| `invalid-status` | The target is in a state that does not allow this (for example, reviewing a review that is already closed) |

The knowledge base has no time-based rules, so it registers no system steps and no time debug buttons.

## postQuestion

| | |
|---|---|
| **Input** | `{ topicId, title, description }` |
| **Who** | A member who is not an administrator |
| **Validation** | `topicId` exists; `title` 1–120 characters, "Skriv en tittel på opptil 120 tegn"; `description` 1–4000 characters, "Beskriv spørsmålet med opptil 4000 tegn". Text is trimmed first. |
| **Effects** | Adds a `Question` with `authorId = actorId`, `businessId = memberBusinessOf(actor)`, `createdAt = now`, `moderation: "current"`. |
| **Activity** | "Nytt spørsmål: «*title*»" to group `knowledgeBase.members`. |
| **Spec** | FR-001, FR-016, FR-022, US1-5 |

## editQuestion

| | |
|---|---|
| **Input** | `{ questionId, topicId, title, description }` |
| **Who** | The question's author, while it is not removed |
| **Validation** | As `postQuestion` |
| **Effects** | Replaces the three fields and sets `editedAt = now`. `moderation` is unchanged. |
| **Activity** | None |
| **Spec** | FR-013, FR-018, US1-8, US3-5 |

## postAnswer

| | |
|---|---|
| **Input** | `{ questionId, text }` |
| **Who** | A member who is not an administrator, on a question that is not removed |
| **Validation** | `text` 1–4000 characters, "Skriv et svar på opptil 4000 tegn" |
| **Effects** | Adds an `Answer` with `authorId`, `businessId`, `createdAt = now`, `moderation: "current"`. The question becomes answered, because its status is derived. |
| **Activity** | "*Business* svarte på «*title*»" to group `knowledgeBase.members`. |
| **Spec** | FR-002, FR-003, FR-014, FR-017, US1-6, US1-7 |

## editAnswer

| | |
|---|---|
| **Input** | `{ answerId, text }` |
| **Who** | The answer's author, while it is not removed |
| **Validation** | As `postAnswer` |
| **Effects** | Replaces `text` and sets `editedAt = now`. `moderation` is unchanged. |
| **Activity** | None |
| **Spec** | FR-013, FR-018 |

## flagContent

| | |
|---|---|
| **Input** | `{ targetKind: "question" \| "answer", targetId, reason, note? }` |
| **Who** | A member who is not an administrator and not the target's author, and who has no flag in the target's open review |
| **Validation** | `reason` is one of the five `FlagReason` values; `note` 0–500 characters and required when `reason` is `other`, "Fortell kort hva som er galt" |
| **Effects** | Adds a `Flag`. If the target has an open review, the flag joins it. Otherwise a new `Review` opens with `openedAt = now`, and the target's `moderation` becomes `flagged`. |
| **Activity** | "Et innlegg i «*title*» er flagget og venter på vurdering" to the target's author and the member who flagged. |
| **Notice** | `info`: "Takk! Varodd ser på det du har flagget." |
| **Spec** | FR-012, FR-013, FR-014, US3-1, US3-3, US3-4 |

## reviewContent

| | |
|---|---|
| **Input** | `{ reviewId, decision: "clear" \| "remove" }` |
| **Who** | A Varodd administrator |
| **Validation** | The review is open (`invalid-status` otherwise) |
| **Effects, clear** | Closes the review with `outcome: "cleared"`, `reviewedBy`, `reviewedAt = now`. The target's `moderation` becomes `cleared`. |
| **Effects, remove** | Closes the review with `outcome: "removed"`. The target's `moderation` becomes `removed`. For a question, every answer in it also becomes `removed`, and every other open review in the thread closes with `outcome: "removed"`. |
| **Activity** | For each review closed: "Varodd har vurdert et flagget innlegg i «*title*»: det er beholdt" (or "…: det er fjernet") to the target's author and every member who flagged it. |
| **Spec** | FR-013, FR-014, FR-017, US3-2, US3-3, US3-6 |

## Read functions (no command)

These are pure functions in `src/domain/knowledge-base/` used by the pages. They never change the state.

| Function | Returns | Spec |
|---|---|---|
| `isMember(person, state)` | Whether the person works at an E-Waves member business | FR-015 |
| `questionStatus(question, state)` | `"open" \| "answered"` | FR-014 |
| `searchQuestions(query, state)` | Matching visible questions in ranked order | FR-004 |
| `similarQuestions(title, description, state)` | Up to 3 visible questions sharing at least 2 words | FR-005 |
| `questionsByTopic(topicId, state)` | Visible questions in the topic, newest first | FR-004, US2-2 |
| `chatbotResponse(chatbotQuestion, state)` | An answer with sources, or a no-answer response with the closest questions | FR-006–FR-010 |
| `openReviews(state)` | Open reviews, oldest first | FR-013 |
