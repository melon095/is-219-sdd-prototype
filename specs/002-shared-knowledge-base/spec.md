# Feature Specification: Shared Knowledge Base

**Feature Branch**: `002-shared-knowledge-base`

**Created**: 2026-11-09

**Status**: Draft

**Input**: User description: "In Agder there exists a lot of very small businesses that sell products online, often with only 1-4 people working there. Every person is good at something, but not everyone knows everything — for example, improving a webstore, doing something technical, or learning to make proper use of AI like Claude. They may not have enough time or knowledge to even start. Varodd wants a knowledge database where businesses can help each other by asking questions, with other businesses answering, and that information stored and accessible between the businesses — so a business that has had success integrating AI can help others with the same problem. The knowledge database may also use AI itself, or a chatbot, to alleviate the problem of searching for the exact answer (e.g., RAG)."

## Prototype Scope

This feature is a high-fidelity, clickable prototype. All businesses, questions, answers, and chatbot responses are fictional seed data, and the chatbot is a visible simulation. There is no login; a button switches between simulated users. The user interface is in Norwegian. The knowledge base is a membership benefit for E-Waves, a network of online stores.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ask a question and get an answer from another member (Priority: P1)

An E-Waves member who is stuck on a problem — improving their webstore, a technical task, or figuring out how to use AI tools like Claude — posts a question in a forum. Another member that has solved the same problem answers it, and that answer stays available for others later.

**Why this priority**: This is the core value exchange: businesses that already know something helping businesses that don't, without Varodd staff being the bottleneck. Without this loop, there is no knowledge base.

**Independent Test**: Can be fully tested by having one simulated member post a question and a second simulated member answer it, and confirming the question shows as answered with that answer attached.

**Acceptance Scenarios**:

1. **Given** the prototype is open, **When** the user switches between an E-Waves member, a non-member, and a Varodd administrator, **Then** the prototype shows that user's view in Norwegian, using only fictional seed data.
2. **Given** a simulated non-member, **When** they open the knowledge base, **Then** no questions or answers are shown and they are told it is an E-Waves membership benefit.
3. **Given** a simulated member, **When** they post a question with a description and topic, **Then** it is published immediately with status open, shows the business name, and is visible to other members.
4. **Given** a published question, **When** another member submits an answer, **Then** the answer is published immediately, attributed to the answering business, the question is marked answered, and the asker is notified.
5. **Given** a question that already has an answer, **When** a different member submits another answer, **Then** both answers remain visible.
6. **Given** a member's own question or answer, **When** they edit or delete it, **Then** the change is applied; there are no comments on questions or answers.

---

### User Story 2 - Find questions and answers in the forum (Priority: P2)

A member searches the forum or browses it by topic, either to find an existing solution before asking or to find open questions they can answer.

**Why this priority**: Reusing existing answers is what makes the knowledge base valuable at scale. It depends on User Story 1 having produced questions to find.

**Independent Test**: Can be fully tested by seeding the forum with open and answered questions, then confirming a member can find them by search and by browsing topics.

**Acceptance Scenarios**:

1. **Given** the forum contains questions, **When** a member searches using terms describing a problem, **Then** relevant open and answered questions are returned.
2. **Given** the forum contains questions, **When** a member browses a topic, **Then** that topic's questions are listed with their status.
3. **Given** a member is about to post a question, **When** an existing question covers a closely related problem, **Then** the system shows that question and the member can still choose to post.

---

### User Story 3 - Keep the knowledge trustworthy (Priority: P2)

Questions and answers are published immediately, so members can flag problems afterward and Varodd administrators review them.

**Why this priority**: Immediate publication keeps the forum quick to use, but it needs a way to deal with wrong, outdated, or irrelevant content.

**Independent Test**: Can be fully tested by flagging seeded questions and answers, then confirming their warnings, review outcomes, and effect on the simulated chatbot.

**Acceptance Scenarios**:

1. **Given** a published question or answer, **When** a member flags it and gives a reason, **Then** it stays visible with a warning and is added to the review list.
2. **Given** flagged content, **When** a Varodd administrator clears it, **Then** the warning is removed; **When** the administrator removes it, **Then** it is no longer shown.
3. **Given** a question whose only answer is flagged, **When** the flag is added, **Then** the question returns to open; **When** the answer is cleared, **Then** the question returns to answered.

---

### User Story 4 - Ask the simulated chatbot instead of searching (Priority: P3)

A member asks a question in their own words to a chatbot, which gives a short answer based on knowledge already in the forum, instead of the member having to guess the right search terms. The chatbot is simulated using prepared responses.

**Why this priority**: This improves the experience of finding existing knowledge, but the knowledge base works without it through forum search.

**Independent Test**: Can be fully tested by asking the prepared test questions and confirming that the simulated chatbot responds correctly for questions with and without stored answers.

**Acceptance Scenarios**:

1. **Given** the forum contains content relevant to a prepared question, **When** a member asks the chatbot, **Then** the chatbot gives a short written answer with links to its source questions.
2. **Given** any chatbot answer, **When** it is shown, **Then** a visible notice tells the member that the answer cannot be entirely trusted and should be checked against its sources.
3. **Given** no relevant content or only a weak match exists, **When** a member asks the chatbot, **Then** the chatbot says it has no answer, links the closest questions if any exist, and offers to help post the question.
4. **Given** flagged content that has not been cleared, **When** the chatbot answers, **Then** it does not use that content.

---

### Edge Cases

- A question that receives no answer stays open and visible.
- A member can still post a question after being shown a similar existing one.
- A flagged answer stays visible with a warning until a Varodd administrator reviews it.
- Spam and off-topic posts are handled through the same flagging process.
- A chatbot question with only a weak match is treated as having no answer.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow an E-Waves member to post a question with a description and topic.
- **FR-002**: System MUST allow any other E-Waves member to answer a posted question.
- **FR-003**: System MUST store each question with all of its answers and keep multiple answers visible.
- **FR-004**: System MUST provide a forum where members can search questions and browse them by topic, including both open and answered questions.
- **FR-005**: System MUST show existing questions that closely match a question a member is about to post, and MUST still allow the member to post.
- **FR-006**: System MUST provide a simulated chatbot that gives short written answers based on stored content and links to its source questions.
- **FR-007**: The simulated chatbot MUST say when it has no answer, treat a weak match as no answer, and link the closest questions if any exist.
- **FR-008**: The simulated chatbot MUST show a visible notice with every answer that it cannot be entirely trusted and should be checked against its sources.
- **FR-009**: The simulated chatbot SHOULD offer to help post a question it cannot answer.
- **FR-010**: The simulated chatbot MUST NOT use flagged content unless a Varodd administrator has cleared it.
- **FR-011**: System MUST show the name of the business that posted each question and answer.
- **FR-012**: System MUST allow any member to flag a question or answer with a reason, including outdated, incorrect, spam, or off-topic content.
- **FR-013**: System MUST keep flagged content visible with a warning until a Varodd administrator clears or removes it.
- **FR-014**: System MUST return a question to open while its only answer is flagged, and to answered if that answer is cleared.
- **FR-015**: System MUST make the knowledge base available only to E-Waves members.
- **FR-016**: System MUST publish questions and answers immediately, without review before publication.
- **FR-017**: System MUST notify the asker when their question receives an answer.
- **FR-018**: System MUST allow authors to edit or delete their own questions and answers.
- **FR-019**: System MUST provide a button for switching between simulated E-Waves members, non-members, and Varodd administrators, instead of login.
- **FR-020**: System MUST present its user interface in Norwegian.
- **FR-021**: System MUST use only fictional seed data.

### Key Entities

- **Member Business**: A small online-selling business that is a member of E-Waves.
- **Question**: A problem posted by a member, including its description, topic, business name, and status (open/answered).
- **Answer**: A response to a Question, attributed to a member business, with a status (current or flagged).
- **Topic**: A forum category, such as webstore, technical task, or AI adoption.
- **Flag**: A member's report on a question or answer, including its reason and review outcome.
- **Varodd Administrator**: Varodd staff who review flagged content.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A person trying the prototype can find an existing relevant answer, through search or the simulated chatbot, in under 2 minutes.
- **SC-002**: Every prepared chatbot question with stored content gets an answer with a source link and trust notice, and every prepared question without stored content gets a no-answer response.
- **SC-003**: At least 70% of the prepared near-duplicate questions show the existing question before posting.

## Assumptions

- Membership of E-Waves is the only eligibility rule for the knowledge base. Being a Varodd customer does not grant access.
- An answer may come from any member, not just Varodd staff or designated experts.
- There is no reward for answering in the prototype.
- The prepared test questions define what counts as relevant or closely matching.
- Simulated businesses are shared with feature `001-job-matching-marketplace`.
