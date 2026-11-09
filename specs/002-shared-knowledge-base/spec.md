# Feature Specification: Shared Knowledge Base

**Feature Branch**: `002-shared-knowledge-base`

**Created**: 2026-11-09

**Status**: Draft

**Input**: User description: "In Agder there exists a lot of very small businesses that sell products online, often with only 1-4 people working there. Every person is good at something, but not everyone knows everything — for example, improving a webstore, doing something technical, or learning to make proper use of AI like Claude. They may not have enough time or knowledge to even start. Varodd wants a knowledge database where businesses can help each other by asking questions, with other businesses answering, and that information stored and accessible between the businesses — so a business that has had success integrating AI can help others with the same problem. The knowledge database may also use AI itself, or a chatbot, to alleviate the problem of searching for the exact answer (e.g., RAG)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ask a question and get an answer from another business (Priority: P1)

A small business owner who is stuck on a problem — improving their webstore, a technical task, or figuring out how to use AI tools like Claude — posts a question describing what they're trying to do. Another business that has faced and solved the same problem answers it, and that answer stays available for others later.

**Why this priority**: This is the core value exchange: businesses that already know something helping businesses that don't, without Varodd staff being the bottleneck. Without this loop, there is no knowledge base.

**Independent Test**: Can be fully tested by having one business submit a question and a second business submit an answer to it, and confirming the question now shows as answered with that answer attached.

**Acceptance Scenarios**:

1. **Given** a business is part of Varodd's knowledge-base network, **When** they submit a question describing a problem they need help with, **Then** the question is published and visible to other eligible businesses.
2. **Given** a published, unanswered question, **When** another eligible business submits an answer to it, **Then** the answer is attached to the question, attributed to the answering business, and the question is marked answered.
3. **Given** a question that already has one answer, **When** a different business submits another answer, **Then** both answers remain visible against the question rather than one replacing the other.

---

### User Story 2 - Find an existing answer before asking (Priority: P2)

Before posting a new question, a business searches or browses previously answered questions to see if someone has already solved their problem.

**Why this priority**: Reusing existing answers is what makes the knowledge base valuable at scale — otherwise the same questions get asked repeatedly and the answering businesses bear all the burden. It depends on User Story 1 already having produced answered questions to find.

**Independent Test**: Can be fully tested by seeding the knowledge base with a set of answered questions, then confirming a business searching with related terms finds the relevant ones.

**Acceptance Scenarios**:

1. **Given** the knowledge base contains previously answered questions, **When** a business searches using terms describing their problem, **Then** relevant previously answered questions are returned.
2. **Given** a business is about to submit a new question, **When** an existing question covers a closely related problem, **Then** the system surfaces that existing question so the business can check it before posting a duplicate.

---

### User Story 3 - Ask the chatbot instead of searching (Priority: P3)

A business owner asks a question in their own words to a chatbot, which answers directly using the knowledge already stored in the database (retrieval-augmented generation), instead of the owner having to guess the right search terms.

**Why this priority**: This improves the experience of finding existing knowledge, but the knowledge base is still functional without it via manual search (User Story 2). It is an enhancement layered on top of the core ask/answer/search loop.

**Independent Test**: Can be fully tested by seeding the knowledge base with answered questions and confirming the chatbot returns an answer grounded in that stored content when asked a related question in natural language.

**Acceptance Scenarios**:

1. **Given** the knowledge base contains an answer relevant to a business's natural-language question, **When** the business asks the chatbot, **Then** the chatbot responds with an answer drawn from that stored content.
2. **Given** no stored content is relevant to the business's question, **When** the business asks the chatbot, **Then** the chatbot indicates it has no relevant answer rather than inventing one.

---

### Edge Cases

- What happens when a posted question receives no answer from any business within a reasonable time?
- How does the system handle a business submitting a question that is nearly identical to one already answered?
- How does the system handle an answer that turns out to be outdated or incorrect after it has already helped other businesses?
- What happens when a business that is not eligible to participate tries to view or post to the knowledge base?
- How does the system handle spam, irrelevant, or off-topic submissions?
- What happens when the chatbot is asked something only tangentially related to any stored content — does it say so, or guess?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow an eligible business to submit a question describing a problem they need help with (e.g., webstore improvement, a technical task, or adopting AI tools).
- **FR-002**: System MUST allow any other eligible business to submit an answer to a posted question.
- **FR-003**: System MUST store each question together with its answer(s) so they remain accessible to other eligible businesses afterward.
- **FR-004**: System MUST let a business search or browse previously answered questions.
- **FR-005**: System MUST surface existing questions that closely match a new question a business is about to submit, so the business can check for an existing answer first.
- **FR-006**: System MUST allow a business to ask a question in natural language to a chatbot and receive an answer generated from the content stored in the knowledge base.
- **FR-007**: The chatbot MUST indicate when it has no relevant stored content to answer a question, rather than generating an answer not grounded in the knowledge base.
- **FR-008**: System MUST attribute each answer to the business that submitted it.
- **FR-009**: System MUST allow an answer to be flagged as outdated or incorrect so its quality can be reviewed and maintained over time.
- **FR-010**: System MUST restrict visibility of questions and answers to businesses within Varodd's network; the knowledge base MUST NOT be visible on the open public internet.
- **FR-011**: System MUST restrict eligibility to ask and answer questions to businesses that are partners of Varodd and/or partners of E-Waves.
- **FR-012**: System MUST publish a submitted answer immediately, making it visible to other eligible businesses without a prior review/moderation step; quality issues are handled after publication via the flagging mechanism in FR-009.

### Key Entities

- **Business (Participant)**: A small online-selling business (or a person acting on its behalf) that can ask and/or answer questions in the knowledge base.
- **Question**: A problem or need posted by a business, including its description, topic (e.g., webstore, technical task, AI adoption), and status (open/answered).
- **Answer**: A response to a Question submitted by a Business Participant, attributed to that business, with a status (e.g., current, flagged as outdated/incorrect).
- **Topic/Category**: A grouping used to classify Questions and Answers so they can be searched, browsed, and retrieved (including by the chatbot).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A business can find an existing relevant answer, via search or the chatbot, in under 2 minutes.
- **SC-002**: At least 50% of newly posted questions receive an answer from another business within 1 week.
- **SC-003**: At least 70% of chatbot questions that have a relevant stored answer result in that answer being surfaced to the business.
- **SC-004**: At least 80% of businesses that use the knowledge base report that it helped them make progress on their problem.
- **SC-005**: The rate of duplicate questions being posted (where a closely matching question already existed) decreases by at least 30% after the existing-question surfacing in FR-005 is in place.

## Assumptions

- Businesses participating in the knowledge base are the same kind of small, 1-4 person, online-selling businesses in Agder described in the feature input; large or non-local businesses are out of scope for v1.
- An answer may come from any eligible business, not just from Varodd staff or designated experts; the knowledge base's value comes from businesses helping each other directly.
- A question may receive more than one answer, and all answers remain visible rather than only the first or "best" one.
- The chatbot (RAG) capability is additive to, not a replacement for, the plain ask/answer/search loop — a business can always ask a question directly without using the chatbot.
- Multi-language support (Norwegian/English) is a reasonable future need given the regional context, but is not required for v1 unless specified otherwise during planning.
- "Partners of Varodd and/or E-Waves" (per FR-011) is treated as a combined eligible-business list; how that list is determined/maintained (e.g., a shared registry vs. two separate partner lists) is a planning-level detail, not a specification-level one.
