# Feature Specification: Job-Matching Marketplace

**Feature Branch**: `001-job-matching-marketplace`

**Created**: 2026-11-09

**Status**: Draft

**Input**: User description: "Varodd wants a service which makes it possible for business owners to ask for help with small tasks (a few weeks to a few months), matched automatically against people seeking work — including people referred through NAV — by skill. A crawler scans partner businesses to determine the skills they require, so that matching does not depend entirely on business owners manually describing their needs."

## Prototype Scope

This feature is a high-fidelity, clickable prototype. All businesses, workers, NAV referrals, and crawl results are fictional seed data. NAV referrals and crawling are shown as visible simulations. There is no login; a button switches between simulated users. The user interface is in Norwegian Bokmål.

This feature is built first, so it also defines the shared frame of the whole prototype: the home page, header, user switcher, activity feed, demo reset, seed data, and design language. Feature `002-shared-knowledge-base` and any later features are shown inside this frame.

## Clarifications

### Session 2026-11-10

- Q: Where are the parts shared by every feature specified? → A: In this spec, because this feature is built first; `002-shared-knowledge-base` reuses them.
- Q: How is demo data created, and can it be reset? → A: Seed data is created by a separate step that generates a seed data file. Changes made during a demo can be reset back to the seed data.
- Q: How does a demo show time-based rules such as the 7-day offer expiry? → A: A debug button on the object itself, such as an Offered request, simulates that the time has passed.
- Q: Which simulated people exist across the features? → A: One shared set of simulated people for the whole prototype. A business owner whose business is an E-Waves member is also a member in `002-shared-knowledge-base`, and the Varodd administrator is the same role in both. The exact people are left to the seed data.
- Q: Is the business in this feature the same as the member business in `002-shared-knowledge-base`? → A: Yes. There is one list of businesses, and E-Waves membership is a yes/no on each business.
- Q: How does a user move between features? → A: With buttons in a shared header.
- Q: Where are notifications shown? → A: In an activity feed on one home page shared by all features. It shows every status and activity change, and clicking an entry opens the page it concerns. The shared home page allows more features to be added later.
- Q: Which screen sizes must the prototype support? → A: Desktop and mobile, each with its own design. The desktop design must not be an enlarged mobile design.
- Q: How much seed data is needed? → A: About 5 businesses, each with 1–3 people working there, and a few workers seeking work, some of them referred through NAV. Overall, enough that every page looks populated and realistic.
- Q: Which written form of Norwegian is used? → A: Norwegian Bokmål.
- Q: What should SC-002 measure, instead of the earlier target that 70% of seeded requests get a shortlist? → A: That the seed data shows every matching outcome: a full shortlist, a shorter shortlist, and no eligible worker.
- Q: Should hours per week, remote or on-site work, or location affect matching? → A: No.
- Q: Should experience level affect ranking? → A: No. It is shown to the owner only.
- Q: Who maintains the shared skill list? → A: Undecided. Assumed to be fixed in the seed data, with no editing in the prototype.
- Q: What visual design should the prototype use? → A: The design language of the Varodd website (https://varodd.no/), defined once in this spec's Design Language section and reused by every feature.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Shared home page and demo controls (Priority: P1)

Everyone using the prototype starts on one home page shared by every Varodd feature. From there they can switch simulated user, move between features, follow what has happened, and reset the demo.

**Why this priority**: Every other user story, in this feature and in `002-shared-knowledge-base`, is shown inside this frame. It is built first so that later features are added to it instead of each having their own.

**Independent Test**: Can be fully tested by switching between simulated users, moving between features from the header, performing an action, following it from the activity feed, and resetting the prototype to its seed data.

**Acceptance Scenarios**:

1. **Given** the prototype is open, **When** the user switches between a business owner, a worker, and a Varodd administrator with the switcher in the header, **Then** the prototype shows that user's view in Norwegian, using only fictional seed data.
2. **Given** any page, **When** the user selects a feature in the header, **Then** that feature opens.
3. **Given** the home page, **When** it is shown, **Then** the activity feed lists status changes and other activity from every feature, limited to what the current simulated user is allowed to see.
4. **Given** an entry in the activity feed, **When** the user clicks it, **Then** the page of the item it concerns opens.
5. **Given** changes made during a demo, **When** the user resets the prototype, **Then** all data returns to the seed data.
6. **Given** an object with a time-based rule, such as an Offered request, **When** the user presses its debug button, **Then** the prototype behaves as if the relevant time had passed.
7. **Given** a desktop screen or a mobile screen, **When** the prototype is opened, **Then** the layout designed for that screen size is shown.
8. **Given** any page in any feature, **When** it is shown, **Then** it uses the colours, fonts, button and link styles, and tone of voice described in the Design Language section.

---

### User Story 2 - Business owner requests help and chooses a worker (Priority: P1)

A small business owner (for example, a solo Shopify store owner who is too busy with day-to-day operations to improve their products, marketing, or website) submits a request describing the help they need and roughly how long the work should take. The system builds a shortlist of suitable workers. The owner reviews the shortlist, can hold interviews, and decides who they want to work with.

**Why this priority**: This is the core value exchange Varodd is building: giving time-starved business owners a practical way to find help while keeping the final choice in the owner's hands. Without this, there is no product.

**Independent Test**: Can be fully tested by having a simulated business owner submit a task request against seeded worker profiles, confirming a suitable shortlist appears, and taking one worker through to an agreed engagement.

**Acceptance Scenarios**:

1. **Given** a simulated business owner, **When** they submit a task request with a description, required skills from the shared skill list, a desired start date, an estimated duration, hours per week, and whether the work is remote or on-site, **Then** the request is published with status Open.
2. **Given** a newly published request and at least one worker who has at least half of the required skills and can start in time, **When** matching runs, **Then** a ranked shortlist of up to 3 workers is created, the status changes to Shortlisted, and the owner and the shortlisted workers are notified.
3. **Given** a shortlist, **When** the owner views it, **Then** each worker's matched skills, missing skills, experience level, availability, and any NAV referral are shown.
4. **Given** a shortlist, **When** the owner invites a worker to an interview, **Then** the worker is notified, the interview can be arranged through their message conversation, and the status remains Shortlisted.
5. **Given** a shortlist, **When** the owner picks one worker, **Then** the status changes to Offered and the worker is notified.
6. **Given** an Offered request, **When** the worker accepts, **Then** the status changes to Agreed and the agreement of both parties is recorded.
7. **Given** a shortlist, **When** the owner rejects the whole shortlist, **Then** the owner must give a reason, the status changes to Under review, and a Varodd administrator can return the request to Open or cancel it.
8. **Given** a request with status Open, **When** the owner edits it, **Then** the changes are saved; **Given** any other status, **Then** the request cannot be edited.
9. **Given** an owner enters an estimated duration outside 2 weeks to 6 months, **When** they publish the request, **Then** a notice is shown and the request is still published.
10. **Given** two workers who are identical except that one was referred through NAV, **When** matching runs, **Then** the NAV referral does not affect their ranking.

---

### User Story 3 - Job seeker registers and appears on shortlists (Priority: P2)

A person who needs work — including someone referred through NAV — registers their skills, experience level, and availability. The system considers them for open task requests and notifies them when they are shortlisted or offered work.

**Why this priority**: This is the other half of the marketplace. It is ranked P2 rather than P1 because it can be developed and tested with seeded task-request data, independent of the business-facing submission flow.

**Independent Test**: Can be fully tested by registering a worker profile against seeded task requests and confirming the worker appears on the shortlist for a request they qualify for.

**Acceptance Scenarios**:

1. **Given** a person seeking work, **When** they register their skills, experience level, and availability, **Then** the profile becomes eligible for matching and matching runs for open requests.
2. **Given** the simulated NAV referral action, **When** it is triggered, **Then** a draft profile with basic details is created, marked as NAV-referred and labelled as simulated, and it is not eligible for matching.
3. **Given** a draft NAV-referred profile, **When** the person adds their skills, experience level, and availability, **Then** the profile becomes eligible for matching.
4. **Given** an Offered request, **When** the worker declines, or the debug button simulates that 7 days have passed without an answer, **Then** the worker stays available for other requests, is never listed for this request again, the status returns to Shortlisted, and the next eligible worker is added to the shortlist if one exists.
5. **Given** the last remaining worker on a shortlist declines and no other eligible worker exists, **When** the decline is recorded, **Then** the status returns to Open.
6. **Given** a worker on several shortlists, **When** they accept an offer, **Then** they are removed from their other shortlists and any other open offers count as declined.

---

### User Story 4 - Full record of a request through to completion (Priority: P2)

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

### User Story 5 - Simulated skill suggestions for opted-in businesses (Priority: P3)

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
- Hours per week, whether the work is remote or on-site, and the worker's experience level do not affect matching or ranking.
- A person with little documented work history can register and describe what they would like to do. They are shortlisted under the same rules as everyone else.
- Workers on a rejected shortlist are never listed for that request again, but remain available for other requests.
- An activity feed entry about something the current simulated user is not allowed to see, such as another pair's message conversation, is not shown to that user.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow any small business owner in Norway/Agder to submit a task request with a description, required skills, optional additional requirements in free text, a desired start date, an estimated duration, hours per week, and whether the work is remote or on-site.
- **FR-002**: System MUST allow a person seeking work to register a worker profile capturing their skills, experience level, and availability, and optionally what they would like to do.
- **FR-003**: System MUST automatically build a ranked shortlist of up to 3 workers for an Open request, including only workers who have at least half of the required skills and can start in time. Hours per week, remote or on-site work, and experience level MUST NOT affect matching or ranking.
- **FR-004**: System MUST notify the owner when a shortlist is ready, and notify a worker when they are shortlisted, invited to an interview, or offered work. Notifications are shown in the activity feed.
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
- **FR-016**: System MUST treat an offer as declined if the worker has not answered within 7 days, and MUST provide a debug button on an Offered request that simulates that 7 days have passed.
- **FR-017**: System MUST run matching whenever a request is published or returned to Open, and whenever a worker profile becomes eligible.
- **FR-018**: System MUST provide a visible simulated NAV referral action that creates a draft worker profile, which becomes eligible only after the person adds their skills, experience level, and availability.
- **FR-019**: System MUST show business owners whether a worker was referred through NAV and MUST NOT use this in ranking.
- **FR-020**: System MUST use one shared Norwegian skill list, owned by Varodd, for requests, worker profiles, and crawl suggestions.
- **FR-021**: System MUST let a business opt in to crawling and MUST NOT crawl a business that has not opted in.
- **FR-022**: System MUST provide a visible simulated crawl action that produces suggestions from the shared skill list for opted-in businesses.
- **FR-023**: System MUST pre-fill crawl suggestions on new requests, let the owner accept, change, or ignore them, and use only the skills on the final request for matching.
- **FR-024**: System MUST let the owner select required skills manually when no suggestions exist.
- **FR-025**: System MUST provide one user switcher in the shared header, instead of login, for switching between the simulated people of the whole prototype, including business owners, workers, and Varodd administrators.
- **FR-026**: System MUST present its user interface in Norwegian Bokmål.
- **FR-027**: System MUST use only fictional seed data.
- **FR-028**: System MUST provide one home page shared by every feature of the prototype, built so that later features can be added to it.
- **FR-029**: System MUST provide a shared header with a button for each feature.
- **FR-030**: System MUST show on the home page an activity feed of every status change and other activity in every feature, limited to what the current simulated user is allowed to see. Clicking an entry MUST open the page of the item it concerns.
- **FR-031**: System MUST keep changes made during a demo until the prototype is reset, and MUST provide a reset action that returns all data to the seed data.
- **FR-032**: System MUST create its seed data through a separate, repeatable step that generates a seed data file.
- **FR-033**: System MUST provide a debug button on each object that has a time-based rule, which simulates that the relevant time has passed.
- **FR-034**: System MUST provide separate layouts designed for desktop and for mobile screens. The desktop layout MUST NOT be an enlarged mobile layout.
- **FR-035**: System MUST use the design language described in the Design Language section on every page of every feature, defined once in the shared frame and reused by later features.

### Key Entities

- **Task Request**: Work requested by a business owner, including its description, skills, duration, hours, work location, status, and outcome.
- **Business**: A business and its owner, including crawl opt-in, whether it is an E-Waves member, and crawl suggestions. The same list of businesses is used by `002-shared-knowledge-base` (formerly referred to as "Business Profile").
- **Worker Profile**: A person seeking work, including skills, experience level, availability, what they would like to do, whether the profile is a draft, and whether they were referred through NAV.
- **Skill**: An entry in the shared skill list.
- **Shortlist Entry**: A worker listed for a request, including their rank, matched and missing skills, and whether they were invited to an interview, offered work, or excluded.
- **Message Conversation**: Stored messages between an owner and one worker about a request.
- **Log Event**: A permanent record of something that happened on a request.
- **Activity Entry**: Something that happened in any feature, shown in the activity feed on the home page and linked to the page of the item it concerns.
- **Simulated User**: A fictional person the user switcher can select, such as a business owner, a worker, or a Varodd administrator. There is one set of simulated users for the whole prototype.
- **Varodd Administrator**: Varodd staff who can see all requests, review rejected shortlists, and cancel requests.

## Design Language

The whole prototype follows the design language of the Varodd website (https://varodd.no/), as read from the site on 2026-11-10. These values are defined once in the shared frame and reused by every feature.

- **Colours**: Main colour deep navy `#000082`, used for buttons, links, and the header. Lighter navy tints for backgrounds and highlights: `#F6F6FF`, `#E5E5F8`, `#D0D0EA`, `#9999D9`. Darker navy for hover `#000070` and pressed `#000090`. Text near-black `#1e1e1e` on a white `#ffffff` background. Greys `#FAFAFA`, `#EEEEEE`, `#D5D5D5`, `#BDBDBD`, `#8B8B8B`, `#737373` for borders, dividers, and secondary text. Status colours: success green `#77AC94`, warning orange `#FF8C00`, error red `#F04438`, information blue `#0000A0`.
- **Typography**: Headings in Bree Serif, normal weight, with tight line height (1.2). Body text in Barlow with relaxed line height (1.7). Body text is about 16–18 px, headings scale from about 18 px (smallest) to 30–36 px (page title).
- **Buttons**: Solid navy with white, semi-bold text and 8 px rounded corners. They turn a darker navy on hover and when pressed. Secondary buttons have a navy outline on a transparent background.
- **Links**: Navy text, darker navy on hover.
- **Form fields**: White with a light grey `#BDBDBD` border, 8 px rounded corners, and a soft shadow.
- **Layout**: Reading text is at most about 650 px wide, and full page content at most about 1300 px wide. Generous white space between sections. Content is grouped in sections or cards with a heading, a short text, and one clear action, like the image-and-text blocks on the Varodd website.
- **Navigation**: The header follows the Varodd website's header: the Varodd name on the left and a navy navigation bar with the feature buttons, the user switcher, and the demo controls. On mobile the navigation collapses behind a "Meny" button.
- **Tone of voice**: Warm, encouraging, and plain Norwegian Bokmål. The reader is addressed as "du" and Varodd as "vi", with short and positive sentences.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A person trying the prototype can submit a complete task request in under 5 minutes.
- **SC-002**: The seed data includes at least one request that gets a full shortlist of 3 workers, one that gets a shortlist of 1 or 2 workers, and one with no eligible worker that stays Open, so every matching outcome can be shown in a demo.
- **SC-003**: A seeded request can be taken through every stage to Completed, and every step appears in its log.
- **SC-004**: Every opted-in seeded business receives pre-filled suggestions, and no business that has not opted in receives any.
- **SC-005**: In the seeded test scenarios, no worker is ever listed again for a request after being excluded from it.
- **SC-006**: After a reset, the prototype shows exactly the seed data again, regardless of what was changed during the demo.

## Assumptions

- Varodd is a company that helps people who need work find a place to work. It is not a membership network, so using this service does not require a Varodd membership.
- E-Waves is a network of online stores. Its members receive access to the shared knowledge base in feature `002-shared-knowledge-base` as their membership benefit.
- A worker may be referred through NAV or register directly; both paths result in the same kind of worker profile.
- The prototype stops at recording who works where and how the work went. Employment, contracts, hours, and payment are out of scope, and who employs the worker remains an open question for Varodd, especially for people referred through NAV.
- The shared skill list is fixed in the seed data and cannot be edited in the prototype. Who maintains it is an open question for later.
- The seed data contains about 5 fictional businesses, each with 1–3 people working there, and a few workers seeking work, some of them referred through NAV. Together with seeded requests, this is enough that every page and the activity feed look populated and realistic.
