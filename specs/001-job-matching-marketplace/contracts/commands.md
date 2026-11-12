# Contract: Domain Commands

**Feature**: `001-job-matching-marketplace` | **Data model**: [../data-model.md](../data-model.md)

Every change to demo data goes through one function:

```ts
applyCommand(state: DemoState, command: Command, context: { actorId: Id; now: IsoDateTime }): CommandResult

type CommandResult =
  | { ok: true; state: DemoState; notices: Notice[] }
  | { ok: false; error: CommandError }
```

- `applyCommand` is pure: it never reads the clock, `localStorage`, or the DOM, and it never changes the `state` it is given.
- Before handling the command, `applyCommand` runs `expireOverdueOffers(state, now)` (see [research.md §8](../research.md#8-time-offer-expiry-and-the-time-debug-button)).
- A failed command leaves the state unchanged. `CommandError` has a `code` (below) and a Norwegian `message` shown to the user.
- `Notice` is a non-blocking message for the user, such as the duration notice (FR-014). The UI announces notices and successful commands through a polite live region.
- Every successful command adds the listed log events to the request's `log` and the listed activity entries to `frame.activity`, using `context.now` and `context.actorId`. Effects caused by matching or expiry use the actor `"system"`.
- The UI hides or disables actions the current person cannot perform, but `applyCommand` still checks permissions itself, and tests call it directly.

Error codes: `not-allowed`, `not-found`, `invalid-status`, `validation`, `excluded-worker`.

"Owner" below means the owner of the request's business. "Admin" means a Varodd administrator.

---

## Requests

### `publishRequest`

| | |
|---|---|
| **Input** | `businessId`, `title`, `description`, `requiredSkillIds`, `acceptedSuggestionIds`, `additionalRequirements?`, `desiredStartDate`, `estimatedDuration`, `hoursPerWeek`, `workLocation` |
| **Allowed** | The owner of `businessId` only (FR-001, FR-037). |
| **Validation** | As in the data model. Errors return `validation` with a message per field. |
| **Effects** | New request with status Open. Then `fillShortlist` runs (FR-017). |
| **Notices** | Duration notice if outside 2 weeks to 6 months; publication is not blocked (FR-014, US2-9). |
| **Log** | `published`; `duration-notice` if shown; then any matching events. |
| **Activity** | "Nytt oppdrag" to owner + `marketplace.workers`. |
| **Spec** | FR-001, FR-014, FR-017, FR-023, FR-024, US2-1, US2-9, US5-3, US5-4, US5-5 |

### `editRequest`

| | |
|---|---|
| **Input** | `requestId` and the same fields as `publishRequest` except `businessId` |
| **Allowed** | Owner, only while status is Open (FR-015). Any other status → `invalid-status`. |
| **Effects** | Fields replaced; then `fillShortlist` runs. |
| **Log** | `edited`, then `duration-notice` if shown. |
| **Spec** | FR-015, FR-017, US2-8 |

### `inviteToInterview`

| | |
|---|---|
| **Input** | `requestId`, `workerId` |
| **Allowed** | Owner; status Shortlisted or Offered; the worker's entry is `active`. |
| **Effects** | Sets `interviewInvitedAt`. Status unchanged (US2-4). |
| **Log** | `interview-invited`. |
| **Activity** | "Du er invitert til intervju" to the worker, also shown to the owner. |
| **Spec** | FR-004, FR-005, US2-4 |

### `makeOffer`

| | |
|---|---|
| **Input** | `requestId`, `workerId` |
| **Allowed** | Owner; status Shortlisted; the worker's entry is `active`. |
| **Effects** | Entry becomes `offered` with `offeredAt = now`; `offeredWorkerId` set; status → Offered. |
| **Log** | `offered`, `status-changed`. |
| **Activity** | "Du har fått et tilbud" to the worker and owner. |
| **Spec** | FR-004, FR-005, US2-5 |

### `acceptOffer`

| | |
|---|---|
| **Input** | `requestId` |
| **Allowed** | The offered worker; status Offered. |
| **Effects** | Status → Agreed; `agreement` recorded with `ownerAgreedAt` = the entry's `offeredAt` and `workerAgreedAt` = now (FR-006). The worker's entry stays `offered`; `offeredWorkerId` cleared. The worker is now busy: their `active` entries elsewhere are removed with `accepted-elsewhere`, and their `offered` entries elsewhere count as declined. Every affected request runs `fillShortlist` (US3-6). |
| **Log** | `offer-accepted`, `status-changed`; on other requests `shortlist-entry-removed` or `offer-declined`. |
| **Activity** | To owner and worker; to the owners of the other affected requests. |
| **Spec** | FR-006, US2-6, US3-6 |

### `declineOffer`

| | |
|---|---|
| **Input** | `requestId` |
| **Allowed** | The offered worker; status Offered. |
| **Effects** | Worker excluded with reason `declined`; entry `removed`; `offeredWorkerId` cleared; status → Shortlisted; then `fillShortlist`. If no `active` entries remain afterwards, status → Open (US3-4, US3-5). |
| **Log** | `offer-declined`, `status-changed`, then any matching events. |
| **Spec** | FR-008, US3-4, US3-5 |

### Offer expiry (system) and `simulateOfferExpiry`

| | |
|---|---|
| **Trigger** | `expireOverdueOffers` finds an `offered` entry on an Offered request whose `offeredAt` is more than 7 days before `now`. `simulateOfferExpiry { requestId }` does the same for one Offered request straight away. |
| **Allowed** | System step: always. `simulateOfferExpiry`: anyone who can see the request page, because the button is a demo control (US1-7). |
| **Effects** | Same as `declineOffer`, with exclusion reason `offer-expired` and actor `"system"`. |
| **Log** | `offer-expired`. For `simulateOfferExpiry` the event has `simulated: true` and text including "Simulert med feilsøkingsknappen" (FR-033). |
| **Spec** | FR-016, FR-033, US1-7, US3-4 |

### `rejectShortlist`

| | |
|---|---|
| **Input** | `requestId`, `reason` (required, 1–1000 characters) |
| **Allowed** | Owner; status Shortlisted. |
| **Effects** | All `active` workers excluded with reason `shortlist-rejected` and their entries `removed`; `rejection` recorded; status → Under review. Matching does not run while Under review. |
| **Log** | `shortlist-rejected`, `status-changed`. |
| **Activity** | To owner, removed workers, and `admins` (always included). |
| **Spec** | FR-008, FR-009, US2-7 |

### `returnToOpen`

| | |
|---|---|
| **Input** | `requestId` |
| **Allowed** | Admin; status Under review. |
| **Effects** | Status → Open; then `fillShortlist`. Excluded workers stay excluded. |
| **Log** | `returned-to-open`, `status-changed`. |
| **Spec** | FR-009, FR-017, US2-7 |

### `recordStart`

| | |
|---|---|
| **Input** | `requestId`, `actualStartDate` |
| **Allowed** | Owner; status Agreed. |
| **Effects** | `actualStartDate` set; status → In progress. |
| **Log** | `started`, `status-changed`. |
| **Spec** | FR-012, US4-4 |

### `withdraw`

| | |
|---|---|
| **Input** | `requestId` |
| **Allowed** | The agreed worker; status Agreed. |
| **Effects** | Worker excluded with reason `withdrew`; their entry `removed` with reason `withdrew`; `agreement` cleared; status → Open; then `fillShortlist` for this request and for every request the now-free worker might match. |
| **Log** | `withdrew`, `status-changed`. |
| **Spec** | FR-008, FR-017, US4-5 |

### `completeRequest`

| | |
|---|---|
| **Input** | `requestId`, `outcome`: `as-planned` \| `extended` \| `permanent` |
| **Allowed** | Owner; status In progress. |
| **Effects** | `outcome` set; status → Completed. The worker is free again, so matching runs for other requests. With `permanent`, the worker counts as working at the business (`peopleWorkingAt`). |
| **Log** | `completed`, `status-changed`. |
| **Spec** | FR-012, US4-6 |

### `cancelRequest`

| | |
|---|---|
| **Input** | `requestId`, `reason` (required, 1–1000 characters) |
| **Allowed** | Owner or admin; any status except Completed and Cancelled. |
| **Effects** | `cancellation` recorded; status → Cancelled. From Agreed or In progress, `outcome = not-completed`, and the worker is free again, so matching runs for other requests. |
| **Log** | `cancelled`, `status-changed`. |
| **Activity** | To the owner, every worker with an `active` entry, and the agreed worker, if any. |
| **Spec** | FR-013, US4-7 |

### `sendMessage`

| | |
|---|---|
| **Input** | `conversationId`, `text` (1–2000 characters) |
| **Allowed** | The conversation's owner or worker, under the "Who can send" rule in the data model. Admins can read but not send. |
| **Effects** | Message added to the conversation. |
| **Log** | `message-sent`, naming both people; the message text is not copied into the log. |
| **Activity** | "Ny melding" to the other participant only. |
| **Spec** | FR-011, US2-4, US4-2 |

---

## Workers

### `registerWorkerProfile` / `updateWorkerProfile`

| | |
|---|---|
| **Input** | `skillIds` (at least 1), `experienceLevel`, `availableFrom`, `wishes?` |
| **Allowed** | The person themselves, if `seeksWork`. Registering creates the profile, or completes a NAV draft. |
| **Effects** | Profile complete, `isDraft: false`, `eligibleSince` set if not yet set. If the worker is now eligible, `fillShortlist` runs for every Open, Shortlisted, or Offered request with fewer than 3 `active` or `offered` entries, oldest first (FR-017). Updating an existing profile does not change the worker's existing shortlist entries. |
| **Activity** | "Profilen din er klar" to the worker. |
| **Spec** | FR-002, FR-017, US3-1, US3-3 |

### `simulateNavReferral`

| | |
|---|---|
| **Input** | `personId` |
| **Allowed** | Admin only. The person must have `seeksWork` and no profile. |
| **Effects** | Draft profile created with `isDraft: true`, no skills, and `navReferral: { referredAt, simulated: true }`. Not eligible for matching (FR-018). |
| **Activity** | "Du er henvist fra NAV (simulert)" to the person. |
| **Spec** | FR-018, US3-2 |

---

## Businesses and crawling

### `setCrawlOptIn`

| | |
|---|---|
| **Input** | `businessId`, `optIn` |
| **Allowed** | The owner of the business only. |
| **Effects** | `crawlOptIn` changed; takes effect from the next crawl (US5-7). Existing suggestions are kept. |
| **Spec** | FR-021, US5-7 |

### `simulateCrawl`

| | |
|---|---|
| **Input** | none |
| **Allowed** | Admin only. |
| **Effects** | New `CrawlRun`. Each opted-in business gets `crawlSuggestions` from its catalog round; others are skipped. Existing requests are not changed (US5-6). |
| **Activity** | "Nye forslag til ferdigheter (simulert)" to each crawled business's owner. |
| **Spec** | FR-021, FR-022, US5-1, US5-2, US5-6 |

---

## Frame

### `resetDemo`

Not a domain command: handled by the store. It replaces the stored state with freshly loaded seed data (dates moved as in [research.md §10](../research.md#10-keeping-seed-dates-current)) and keeps the selected user. Allowed for everyone, after a confirm dialog (FR-031, US1-5).

### Selecting a user

Not a domain command: handled by the store and saved separately (FR-025).
