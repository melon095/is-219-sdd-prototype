# Feature Specification: Job-Matching Marketplace

**Feature Branch**: `001-job-matching-marketplace`

**Created**: 2026-11-09

**Status**: Draft

**Input**: User description: "Varodd wants a service which makes it possible for business owners to ask for help with small tasks (a few weeks to a few months), matched automatically against people seeking work — including people referred through NAV — by skill. A crawler scans partner businesses to determine the skills they require, so that matching does not depend entirely on business owners manually describing their needs."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Business owner requests help and gets matched (Priority: P1)

A small business owner (for example, a solo Shopify store owner who is too busy with day-to-day operations to improve their products, marketing, or website) submits a request describing the kind of help they need and roughly how long the work should take. The system finds a worker whose skills fit the request and connects the two.

**Why this priority**: This is the core value exchange Varodd is building: giving time-starved business owners a practical way to get help without having to recruit, screen, and hire on their own. Without this, there is no product.

**Independent Test**: Can be fully tested by having a business owner submit a task request against a pool of worker profiles seeded with varying skills, and confirming the system proposes a worker whose skills match the request.

**Acceptance Scenarios**:

1. **Given** a business owner has an active partner account, **When** they submit a task request with a description, required skills, and an estimated duration of a few weeks to a few months, **Then** the request is published and becomes eligible for matching.
2. **Given** a published task request and at least one worker profile whose skills satisfy the request's required skills, **When** the matching process runs, **Then** the system proposes that worker to the business owner and notifies both parties.
3. **Given** a proposed match, **When** the business owner accepts it, **Then** the task request's status changes to reflect an active engagement.

---

### User Story 2 - Job seeker registers and is matched to work (Priority: P2)

A person who needs work — including someone referred through NAV after reporting they are seeking a job — registers their skills, experience level, and availability. The system matches them against open task requests and notifies them when a suitable one appears.

**Why this priority**: This is the other half of the marketplace. Without a pool of registered workers, User Story 1 cannot produce any real matches. It is ranked P2 rather than P1 because it can be developed and tested with seeded task-request data, independent of the business-facing submission flow.

**Independent Test**: Can be fully tested by registering a worker profile with a defined set of skills against a pool of seeded task requests, and confirming the worker receives a match proposal for a request whose required skills they satisfy.

**Acceptance Scenarios**:

1. **Given** a person has reported needing a job (directly, or via a NAV referral), **When** they register a worker profile with their skills, experience level, and availability, **Then** the profile becomes eligible for matching.
2. **Given** a registered worker profile and an open task request whose required skills the worker satisfies, **When** the matching process runs, **Then** the worker is notified of the proposed match.
3. **Given** a proposed match, **When** the worker declines it, **Then** the worker profile remains available for future matches and the task request returns to open status.

---

### User Story 3 - Automatic skill-requirement discovery for partner businesses (Priority: P3)

Instead of relying on every business owner to correctly describe the skills their task requires, the system runs a crawler over the list of partner businesses to determine what skills each one is likely to need, and uses that information to improve matching quality.

**Why this priority**: This improves match quality and reduces the burden on business owners, but the marketplace is still functional without it — business owners can describe required skills manually (User Story 1). It is an enhancement layered on top of the core matching loop.

**Independent Test**: Can be fully tested by pointing the crawler at a seeded list of partner businesses and confirming it produces a set of inferred required skills for each one, which then shows up as input to the matching process.

**Acceptance Scenarios**:

1. **Given** a business is on the partner list, **When** the crawler runs, **Then** it records a set of skills that business is likely to require, derived from that business's public information.
2. **Given** crawler-derived skill requirements exist for a business, **When** that business owner submits or edits a task request, **Then** the derived skills are offered as suggestions the owner can accept, adjust, or ignore.
3. **Given** the crawler cannot determine any skill requirements for a partner business (for example, its site is unreachable or has no usable content), **When** a task request for that business is created, **Then** the business owner can still specify required skills manually and the request is not blocked.

---

### Edge Cases

- What happens when a published task request matches no worker profile at all? (The request should remain open and visible for future matching rather than failing silently.)
- How does the system handle a task request whose estimated duration falls outside the supported "a few weeks to a few months" range?
- What happens when more than one worker profile satisfies a task request's required skills? (The system needs a way to decide which worker(s) to propose.)
- What happens when a matched worker becomes unavailable or withdraws before the engagement starts?
- How does the system handle a worker profile with little to no documented work history or skills (for example, someone new to the job market via NAV)?
- What happens when a business wants to submit a task request but is not yet on Varodd's partner list?
- How does the system handle a partner business whose crawled skill requirements change significantly between crawler runs?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow a business owner to submit a task request describing the work needed, the skills/capabilities required, and an estimated duration between a few weeks and a few months.
- **FR-002**: System MUST allow a person seeking work, including those referred through NAV, to register a worker profile capturing their skills, experience level, and availability.
- **FR-003**: System MUST automatically propose matches between open task requests and worker profiles based on how closely a worker's skills satisfy a task request's required skills.
- **FR-004**: System MUST notify both the business owner and the matched worker whenever a match is proposed.
- **FR-005**: Business owners and workers MUST each be able to accept or decline a proposed match.
- **FR-006**: System MUST track a task request's status through its lifecycle (e.g., open, matched, in progress, completed, cancelled) and update it as matches are proposed, accepted, declined, or completed.
- **FR-007**: System MUST maintain a list of partner businesses eligible for crawler-based skill discovery.
- **FR-008**: System MUST periodically scan each partner business's public information to infer the skills that business is likely to require, and make that information available to the matching process described in FR-003.
- **FR-009**: System MUST allow a business owner to review, accept, adjust, or ignore crawler-derived skill requirements for their own business before they are used in a task request.
- **FR-010**: System MUST allow a task request to be created and published even when the crawler could not determine any skill requirements for that business, by letting the owner specify required skills manually.
- **FR-011**: System MUST keep a worker profile available for future matching after that worker declines a proposed match, and return the associated task request to open status.
- **FR-012**: System MUST record a history of proposed, accepted, declined, and completed matches sufficient to report on matching outcomes.
- **FR-013**: System MUST reject or flag task requests whose estimated duration falls outside the supported "a few weeks to a few months" range before they are published.
- **FR-014**: System MUST receive referred job seekers through a direct, system-to-system data integration with NAV, rather than relying solely on manual self-registration.
- **FR-015**: System MUST track basic engagement details for an accepted match (e.g., start date, current status, and completion outcome) sufficient to measure completion rate and support reporting. Whether Varodd also facilitates contract terms, hours tracking, or payment for the engagement is an open decision, deferred to a future iteration (see Assumptions).
- **FR-016**: The crawler described in FR-008 MUST be scoped only to businesses that have explicitly opted in as Varodd partners; it MUST NOT scan businesses that have not partnered with Varodd.

### Key Entities

- **Task Request**: A request for help submitted by a business owner; represents the work to be done, the skills it requires, its estimated duration, and its current status through the matching lifecycle.
- **Business Profile**: Represents a business owner and their business (e.g., a Shopify store), including whether it is an active Varodd partner and the skill requirements the crawler has inferred for it.
- **Worker Profile**: Represents a person seeking work, including their skills, experience level, availability, and whether they were referred through NAV.
- **Skill**: A capability that can be required by a Task Request or Business Profile and held by a Worker Profile, used as the basis for matching.
- **Match**: A proposed, accepted, declined, or completed pairing between a Task Request and a Worker Profile, including when it was proposed and how it was resolved.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A business owner can submit a complete task request in under 5 minutes.
- **SC-002**: At least 70% of published task requests receive at least one proposed worker match within 2 weeks of publication.
- **SC-003**: At least 90% of workers who register a profile after a NAV referral receive at least one task match proposal within 30 days.
- **SC-004**: For at least 60% of partner businesses, the crawler-derived skill requirements require no manual correction from the business owner.
- **SC-005**: At least 75% of accepted matches result in the task request reaching "completed" status.

## Assumptions

- Business owners must have an active Varodd partner account/relationship before submitting a task request; businesses outside the partner list are out of scope for v1 (Edge Case: "business not yet on the partner list" is handled by directing the owner through partner onboarding first).
- The skill vocabulary used for matching (on task requests, business profiles, and worker profiles) is a shared, Varodd-maintained taxonomy rather than free-text, so that skill matching can be done systematically.
- A worker may be referred through NAV or may self-register directly with Varodd; both paths result in the same kind of worker profile for matching purposes.
- Selecting among multiple equally-qualified workers for the same task request uses the closest overall skill match, with ties broken by earliest registration/availability, absent a more specific business rule.
- The geographic focus for the initial version is Norway (Agder region businesses in particular), consistent with the NAV integration and the described partner businesses.
- For v1, the system tracks engagement status and completion outcome for an accepted match (per FR-015), but does not facilitate contract terms, hours tracking, or payment. Whether to add full engagement facilitation (contracts, hours, payment) in a later iteration is an open decision, to be made once there is more clarity on which model best fits Varodd's operating model.
- Varodd integrates directly with NAV to receive referred job seekers (per FR-014); the exact data shared, consent handling, and update frequency of that integration are implementation-level details to be worked out during planning, not this specification.
