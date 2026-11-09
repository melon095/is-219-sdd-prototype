# Feature Specification: Job-Matching Marketplace

**Feature Branch**: `001-job-matching-marketplace`

**Created**: 2026-11-09

**Status**: Draft

**Input**: User description: "Varodd wants a service which makes it possible for business owners to ask for help with small tasks (a few weeks to a few months), matched automatically against people seeking work — including people referred through NAV — by skill. A crawler scans partner businesses to determine the skills they require, so that matching does not depend entirely on business owners manually describing their needs."

## Prototype Scope

This feature is a high-fidelity, clickable prototype. All businesses, workers, NAV referrals, and crawl results are fictional seed data. NAV referrals and crawling are shown as visible simulations. There is no login; a button switches between simulated users. The user interface is in Norwegian.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Business owner requests help and chooses a worker (Priority: P1)

A small business owner (for example, a solo Shopify store owner who is too busy with day-to-day operations to improve their products, marketing, or website) submits a request describing the help they need and roughly how long the work should take. The system builds a shortlist of suitable workers. The owner reviews the shortlist, can hold interviews, and decides who they want to work with.

**Why this priority**: This is the core value exchange Varodd is building: giving time-starved business owners a practical way to find help while keeping the final choice in the owner's hands. Without this, there is no product.

**Independent Test**: Can be fully tested by having a simulated business owner submit a task request against seeded worker profiles, confirming a suitable shortlist appears, and taking one worker through to an agreed engagement.

**Acceptance Scenarios**:

1. **Given** the prototype is open, **When** the user switches between a business owner, a worker, and a Varodd administrator, **Then** the prototype shows that user's view in Norwegian, using only fictional seed data.
2. **Given** a simulated business owner, **When** they submit a task request with a description, required skills from the shared skill list, a desired start date, an estimated duration, hours per week, and whether the work is remote or on-site, **Then** the request is published with status Open.
3. **Given** a newly published request and at least one worker who has at least half of the required skills and can start in time, **When** matching runs, **Then** a ranked shortlist of up to 3 workers is created, the status changes to Shortlisted, and the owner and the shortlisted workers are notified.
4. **Given** a shortlist, **When** the owner views it, **Then** each worker's matched skills, missing skills, experience level, availability, and any NAV referral are shown.
5. **Given** a shortlist, **When** the owner invites a worker to an interview, **Then** the worker is notified, the interview can be arranged through their message conversation, and the status remains Shortlisted.
6. **Given** a shortlist, **When** the owner picks one worker, **Then** the status changes to Offered and the worker is notified.
7. **Given** an Offered request, **When** the worker accepts, **Then** the status changes to Agreed and the agreement of both parties is recorded.
8. **Given** a shortlist, **When** the owner rejects the whole shortlist, **Then** the owner must give a reason, the status changes to Under review, and a Varodd administrator can return the request to Open or cancel it.
9. **Given** a request with status Open, **When** the owner edits it, **Then** the changes are saved; **Given** any other status, **Then** the request cannot be edited.
10. **Given** an owner enters an estimated duration outside 2 weeks to 6 months, **When** they publish the request, **Then** a notice is shown and the request is still published.
11. **Given** two workers who are identical except that one was referred through NAV, **When** matching runs, **Then** the NAV referral does not affect their ranking.

---

### User Story 2 - Job seeker registers and appears on shortlists (Priority: P2)

A person who needs work — including someone referred through NAV — registers their skills, experience level, and availability. The system considers them for open task requests and notifies them when they are shortlisted or offered work.

**Why this priority**: This is the other half of the marketplace. It is ranked P2 rather than P1 because it can be developed and tested with seeded task-request data, independent of the business-facing submission flow.

**Independent Test**: Can be fully tested by registering a worker profile against seeded task requests and confirming the worker appears on the shortlist for a request they qualify for.

**Acceptance Scenarios**:

1. **Given** a person seeking work, **When** they register their skills, experience level, and availability, **Then** the profile becomes eligible for matching and matching runs for open requests.
2. **Given** the simulated NAV referral action, **When** it is triggered, **Then** a draft profile with basic details is created, marked as NAV-referred and labelled as simulated, and it is not eligible for matching.
3. **Given** a draft NAV-referred profile, **When** the person adds their skills, experience level, and availability, **Then** the profile becomes eligible for matching.
4. **Given** an Offered request, **When** the worker declines or does not answer within 7 days, **Then** the worker stays available for other requests, is never listed for this request again, the status returns to Shortlisted, and the next eligible worker is added to the shortlist if one exists.
5. **Given** the last remaining worker on a shortlist declines and no other eligible worker exists, **When** the decline is recorded, **Then** the status returns to Open.
6. **Given** a worker on several shortlists, **When** they accept an offer, **Then** they are removed from their other shortlists and any other open offers count as declined.

---

### User Story 3 - Full record of a request through to completion (Priority: P2)

Everything concerning a request is kept in one place, like a case in a business system. The owner and worker use it to communicate and record progress, and Varodd administrators can use it to understand the full picture.

**Why this priority**: It closes the loop after the owner and worker agree, and gives Varodd the information it needs when a human decision is required.

**Independent Test**: Can be fully tested by taking a seeded request through every status and confirming that the request page shows the complete conversation and event history.

**Acceptance Scenarios**:

1. **Given** any event on a request, such as a shortlist, invitation, offer, decline, message, or status change, **When** it happens, **Then** it is added to the request's permanent log with its time and the person responsible, and it cannot be changed or removed.
2. **Given** an owner and a shortlisted worker, **When** either sends a message, **Then** it is stored on the request page in a conversation visible only to those two people and Varodd administrators.
3. **Given** a Varodd administrator, **When** they open any request, **Then** they can see all of its details, conversations, and log.
4. **Given** an Agreed request, **When** the owner records the start date, **Then** the status changes to In progress.
5. **Given** an Agreed request, **When** the worker withdraws, **Then** the status returns to Open and the worker is never listed for this request again.
6. **Given** an In progress request, **When** the owner marks it completed and records whether it finished as planned, was extended, or became a permanent position, **Then** the status changes to Completed.
7. **Given** a request that is not Completed, **When** the owner or a Varodd administrator cancels it and gives a reason, **Then** the status changes to Cancelled; a cancellation after Agreed counts as not completed.

---

### User Story 4 - Simulated skill suggestions for opted-in businesses (Priority: P3)

A business that has opted in receives skill suggestions from a simulated crawl of its public information. The suggestions are pre-filled when the owner creates a request, so the owner only has to confirm or change them.

**Why this priority**: This reduces the burden on business owners, but the marketplace works without it because owners can select skills themselves. Crawling cannot give a full picture of a task's requirements, so suggestions never replace the owner's judgment.

**Independent Test**: Can be fully tested by running the simulated crawl for seeded businesses, some opted in and some not, and confirming that only opted-in businesses receive suggestions.

**Acceptance Scenarios**:

1. **Given** an opted-in business, **When** the simulated crawl action is triggered, **Then** skills from the shared skill list are recorded for that business and the crawl is labelled as simulated.
2. **Given** a business that has not opted in, **When** the simulated crawl action is triggered, **Then** that business is not crawled and receives no suggestions.
3. **Given** suggestions exist for a business, **When** its owner creates a request, **Then** the suggestions are pre-filled and the owner can accept, change, or ignore them and add their own requirements.
4. **Given** a suggestion the owner did not accept, **When** matching runs, **Then** that suggestion is not used.
5. **Given** no suggestions exist for a business, **When** its owner creates a request, **Then** the owner selects the required skills manually and is not blocked.
6. **Given** a new crawl changes a business's suggestions, **When** the crawl finishes, **Then** only future suggestions change and existing requests stay as they are.

---

### Edge Cases

- A published request with no eligible worker stays Open until an eligible worker appears or the request is cancelled.
- A request with a duration outside the typical range shows a notice but can still be published. Work that lasts longer or becomes a permanent position is a good outcome.
- When more than 3 workers qualify, the shortlist takes the workers with the highest share of required skills, then the earliest possible start, then the longest time since they were last shortlisted.
- A person with little documented work history can register and describe what they would like to do. They are shortlisted under the same rules as everyone else.
- Workers on a rejected shortlist are never listed for that request again, but remain available for other requests.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow any small business owner in Norway/Agder to submit a task request with a description, required skills, optional additional requirements in free text, a desired start date, an estimated duration, hours per week, and whether the work is remote or on-site.
- **FR-002**: System MUST allow a person seeking work to register a worker profile capturing their skills, experience level, and availability, and optionally what they would like to do.
- **FR-003**: System MUST automatically build a ranked shortlist of up to 3 workers for an Open request, including only workers who have at least half of the required skills and can start in time.
- **FR-004**: System MUST notify the owner when a shortlist is ready, and notify a worker when they are shortlisted, invited to an interview, or offered work.
- **FR-005**: System MUST leave the choice of worker to the business owner, who can review the shortlist, invite workers to interviews, and pick one worker.
- **FR-006**: System MUST require both the owner and the worker to agree before an engagement is recorded as Agreed. The form of signing is out of scope.
- **FR-007**: System MUST track each request through these statuses: Open, Shortlisted, Offered, Agreed, In progress, Completed, Cancelled, and Under review.
- **FR-008**: System MUST remember, for each request, every worker who declined, let an offer expire, withdrew, or was on a rejected shortlist, and MUST NOT list those workers for that request again.
- **FR-009**: System MUST require a reason when an owner rejects a whole shortlist and MUST place the request Under review until a Varodd administrator returns it to Open or cancels it.
- **FR-010**: System MUST keep a permanent log of every event on every request, including its time and the person responsible.
- **FR-011**: System MUST provide a page for each request containing its details, its log, and separate message conversations between the owner and each worker. A conversation MUST be visible only to its two participants and Varodd administrators.
- **FR-012**: System MUST let the owner record the start date and mark an In progress request as Completed, with an outcome of finished as planned, extended, or became a permanent position.
- **FR-013**: System MUST let the owner or a Varodd administrator cancel a request that is not Completed, with a required reason.
- **FR-014**: System MUST show a notice when a request's estimated duration is outside the typical range of 2 weeks to 6 months, and MUST NOT block publication because of it.
- **FR-015**: System MUST allow a request to be edited only while its status is Open.
- **FR-016**: System MUST treat an offer as declined if the worker has not answered within 7 days.
- **FR-017**: System MUST run matching whenever a request is published or returned to Open, and whenever a worker profile becomes eligible.
- **FR-018**: System MUST provide a visible simulated NAV referral action that creates a draft worker profile, which becomes eligible only after the person adds their skills, experience level, and availability.
- **FR-019**: System MUST show business owners whether a worker was referred through NAV and MUST NOT use this in ranking.
- **FR-020**: System MUST use one shared Norwegian skill list, owned by Varodd, for requests, worker profiles, and crawl suggestions.
- **FR-021**: System MUST let a business opt in to crawling and MUST NOT crawl a business that has not opted in.
- **FR-022**: System MUST provide a visible simulated crawl action that produces suggestions from the shared skill list for opted-in businesses.
- **FR-023**: System MUST pre-fill crawl suggestions on new requests, let the owner accept, change, or ignore them, and use only the skills on the final request for matching.
- **FR-024**: System MUST let the owner select required skills manually when no suggestions exist.
- **FR-025**: System MUST provide a button for switching between simulated business owners, workers, and Varodd administrators, instead of login.
- **FR-026**: System MUST present its user interface in Norwegian.
- **FR-027**: System MUST use only fictional seed data.

### Key Entities

- **Task Request**: Work requested by a business owner, including its description, skills, duration, hours, work location, status, and outcome.
- **Business Profile**: A business and its owner, including crawl opt-in, E-Waves membership, and crawl suggestions.
- **Worker Profile**: A person seeking work, including skills, experience level, availability, what they would like to do, whether the profile is a draft, and whether they were referred through NAV.
- **Skill**: An entry in the shared skill list.
- **Shortlist Entry**: A worker listed for a request, including their rank, matched and missing skills, and whether they were invited to an interview, offered work, or excluded.
- **Message Conversation**: Stored messages between an owner and one worker about a request.
- **Log Event**: A permanent record of something that happened on a request.
- **Varodd Administrator**: Varodd staff who can see all requests, review rejected shortlists, and cancel requests.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A person trying the prototype can submit a complete task request in under 5 minutes.
- **SC-002**: At least 70% of the seeded task requests receive a shortlist with at least one worker when matching runs.
- **SC-003**: A seeded request can be taken through every stage to Completed, and every step appears in its log.
- **SC-004**: Every opted-in seeded business receives pre-filled suggestions, and no business that has not opted in receives any.
- **SC-005**: In the seeded test scenarios, no worker is ever listed again for a request after being excluded from it.

## Assumptions

- Varodd is a company that helps people who need work find a place to work. It is not a membership network, so using this service does not require a Varodd membership.
- E-Waves is a network of online stores. Its members receive access to the shared knowledge base in feature `002-shared-knowledge-base` as their membership benefit.
- A worker may be referred through NAV or register directly; both paths result in the same kind of worker profile.
- The prototype stops at recording who works where and how the work went. Employment, contracts, hours, and payment are out of scope, and who employs the worker remains an open question for Varodd, especially for people referred through NAV.
