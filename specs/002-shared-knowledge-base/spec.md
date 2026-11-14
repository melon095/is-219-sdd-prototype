# Feature Specification: Shared Knowledge Base

**Feature Branch**: `002-shared-knowledge-base`

**Created**: 2026-11-09

**Status**: Draft

**Input**: User description: "In Agder there exists a lot of very small businesses that sell products online, often with only 1-4 people working there. Every person is good at something, but not everyone knows everything — for example, improving a webstore, doing something technical, or learning to make proper use of AI like Claude. They may not have enough time or knowledge to even start. Varodd wants a knowledge database where businesses can help each other by asking questions, with other businesses answering, and that information stored and accessible between the businesses — so a business that has had success integrating AI can help others with the same problem. The knowledge database may also use AI itself, or a chatbot, to alleviate the problem of searching for the exact answer (e.g., RAG)."

## Prototype Scope

This feature is a high-fidelity, clickable prototype. All businesses, questions, answers, and chatbot responses are fictional seed data, and the chatbot is a visible simulation. There is no login; a button switches between simulated users. The user interface is in Norwegian Bokmål. The knowledge base is a membership benefit for E-Waves, a network of online stores.

This feature is shown inside the shared frame defined in `001-job-matching-marketplace`: its home page, header, user switcher, activity feed, demo reset, seed data, and design language.

## Clarifications

### Session 2026-11-10

- Q: Is the member business in this feature the same as the business in `001-job-matching-marketplace`? → A: Yes. There is one list of businesses, and E-Waves membership is a yes/no on each business.
- Q: Where are the user switcher and other shared parts specified? → A: In `001-job-matching-marketplace`. This feature uses its home page, header, user switcher, activity feed, demo reset, and seed data.
- Q: Can authors delete their own questions and answers? → A: Not needed in the prototype. It is an open question for later.
- Q: If a question's only answer is removed, does the question return to open? → A: Yes.
- Q: Who maintains the list of topics? → A: Undecided. Assumed to be fixed in the seed data, with no editing in the prototype.
- Q: What does the simulated chatbot say to a question that is not one of its prepared questions? → A: It must never make up an answer. Any question without a prepared response gets the no-answer response.
- Q: Which written form of Norwegian is used? → A: Norwegian Bokmål.
- Q: Where do the prepared chatbot questions and near-duplicate test questions come from? → A: They are fictional and created by the same seed data step as the rest of the demo data.
- Q: How many prepared near-duplicate questions must show the existing question, instead of the earlier 70% target? → A: Every one, because they are written to match on purpose.
- Q: What visual design should the knowledge base use? → A: The shared design language of the Varodd website, defined in the Design Language section of `001-job-matching-marketplace`. This feature adds no colours, fonts, or styles of its own.
- Q: Who in a member business can use the knowledge base? → A: Everyone working at an E-Waves member business, not only the owner. The business data, including who works there, is shared with `001-job-matching-marketplace`, where only the owner can act for the business.
- Q: How does a member ask the simulated chatbot a question? → A: The real service would accept any text. In the prototype, the member picks from a fixed list of prepared questions. Predefined rules decide each response: a question with stored content gets a real answer with a link to the forum thread, and a question without stored content gets a response that makes clear the answer does not exist in the forum.
- Q: What happens to a prepared chatbot answer when content it is based on is flagged or removed? → A: If any of its source questions or answers is flagged and not cleared, or removed, the chatbot gives the no-answer response instead. When the flag is cleared, the answer comes back. Questions and answers posted during a demo are never used by the chatbot.
- Q: Can a Varodd administrator use the knowledge base? → A: They can view all of it and review flagged content. They do not post, answer, or flag.
- Q: Can people working at a member business who are not its owner post, answer, and flag? → A: Yes. They can read and write, the same as any other member.
- Q: When is a question answered if it has several answers and some of them are flagged? → A: A question is answered while at least one of its answers is not flagged or removed, and open while it has none. This applies whether one or all of its answers are flagged.
- Q: What happens when a question is removed? → A: The entire thread is removed, including all of its answers.
- Q: Who can answer a question? → A: Any member, including colleagues at the asker's business and the asker themselves.
- Q: Does editing flagged content remove its warning? → A: No. The warning stays until a Varodd administrator reviews it.
- Q: Are people told the outcome of a review? → A: Yes. The author and the member who flagged the content are notified in the activity feed.
- Q: Does a worker placed at an E-Waves member business through `001-job-matching-marketplace` get access? → A: Yes. See the clarifications in `001-job-matching-marketplace`.
- Q: How are Varodd and E-Waves related? → A: Varodd owns the product, including the knowledge base. E-Waves members get it as a membership benefit, and Varodd administrators moderate it.

### Session 2026-11-13

- Q: How does the prototype decide which existing questions closely match a question a member is about to post? → A: The member types freely. A simple word-overlap check against existing question titles and descriptions shows up to 3 of the best matches. The prepared near-duplicate questions are written so they always match.
- Q: Does a question have a short title in addition to its description? → A: Yes. Each question has a required title of 1–120 characters and a description. The title is shown in lists, search results, matches, and activity feed entries.
- Q: What text does forum search look through? → A: Question titles, descriptions, and the text of answers that are not removed, using simple word matching. Questions matching more words are listed first. Open and answered questions are both included; removed content is never shown.
- Q: What are the rules when content is flagged more than once? → A: A member can flag any question or answer except their own, once each. Content already waiting for review can still be flagged by other members; their flags join the same review, and everyone who flagged it is notified of the outcome. Cleared content can be flagged again, which starts a new review.
- Q: How much forum content does the seed data contain? → A: 4–6 topics; 12–20 questions, including open and answered ones, at least one with several answers, and at least one flagged item waiting for review; 6–8 prepared chatbot questions, at least 3 with stored content and at least 2 without; and 3 prepared near-duplicate questions.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ask a question and get an answer from another member (Priority: P1)

An E-Waves member who is stuck on a problem — improving their webstore, a technical task, or figuring out how to use AI tools like Claude — posts a question in a forum. Another member that has solved the same problem answers it, and that answer stays available for others later.

**Why this priority**: This is the core value exchange: businesses that already know something helping businesses that don't, without Varodd staff being the bottleneck. Without this loop, there is no knowledge base.

**Independent Test**: Can be fully tested by having one simulated member post a question and a second simulated member answer it, and confirming the question shows as answered with that answer attached.

**Acceptance Scenarios**:

1. **Given** the prototype is open, **When** the user switches between an E-Waves member, a non-member, and a Varodd administrator with the shared user switcher, **Then** the prototype shows that user's view in Norwegian, using only fictional seed data.
2. **Given** a simulated non-member, **When** they open the knowledge base, **Then** no questions or answers are shown and they are told it is an E-Waves membership benefit.
3. **Given** a person working at an E-Waves member business who is not its owner, **When** they open the knowledge base, **Then** they have the same access as any other member.
4. **Given** a Varodd administrator, **When** they open the knowledge base, **Then** they can view every question and answer, but cannot post, answer, or flag.
5. **Given** a simulated member, **When** they post a question with a title, a description, and a topic, **Then** it is published immediately with status open, shows the business name, and is visible to other members.
6. **Given** a published question, **When** any member, including a colleague of the asker or the asker themselves, submits an answer, **Then** the answer is published immediately, attributed to the answering business, the question is marked answered, and the asker is notified in the activity feed.
7. **Given** a question that already has an answer, **When** a member submits another answer, **Then** both answers remain visible.
8. **Given** a member's own question or answer, **When** they edit it, **Then** the change is applied; there are no comments on questions or answers.

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
2. **Given** flagged content, **When** a Varodd administrator clears it, **Then** the warning is removed; **When** the administrator removes it, **Then** it is no longer shown; **When** the removed content is a question, **Then** the entire thread, including all of its answers, is removed.
3. **Given** a question with exactly one answer that is not flagged or removed, **When** that answer is flagged, **Then** the question returns to open; **When** one of its answers is cleared, **Then** the question returns to answered; **When** the flagged answers are removed, **Then** the question stays open.
4. **Given** a question with several answers, **When** some but not all of them are flagged, **Then** the question stays answered.
5. **Given** flagged content, **When** its author edits it, **Then** the warning stays until a Varodd administrator reviews it.
6. **Given** flagged content, **When** a Varodd administrator clears or removes it, **Then** the author and every member who flagged it are notified in the activity feed.

---

### User Story 4 - Ask the simulated chatbot instead of searching (Priority: P3)

A member asks a question in their own words to a chatbot, which gives a short answer based on knowledge already in the forum, instead of the member having to guess the right search terms. In the prototype, the chatbot is simulated: the member picks from a fixed list of prepared questions, and predefined rules decide each response. The real service would accept any text.

**Why this priority**: This improves the experience of finding existing knowledge, but the knowledge base works without it through forum search.

**Independent Test**: Can be fully tested by asking the prepared test questions and confirming that the simulated chatbot responds correctly for questions with and without stored answers.

**Acceptance Scenarios**:

1. **Given** a member opens the chatbot, **When** it is shown, **Then** the member picks a question from a fixed list of prepared questions instead of typing their own.
2. **Given** a prepared question with stored content in the forum, **When** a member picks it, **Then** the chatbot gives a short written answer with links to the forum threads it is based on.
3. **Given** any chatbot answer, **When** it is shown, **Then** a visible notice tells the member that the answer cannot be entirely trusted and should be checked against its sources.
4. **Given** a prepared question without stored content in the forum, **When** a member picks it, **Then** the chatbot makes clear that the answer does not exist in the forum, links the closest questions if any exist, and offers to help post the question.
5. **Given** a prepared answer where any of its source questions or answers is flagged and not cleared, or removed, **When** a member picks that question, **Then** the chatbot gives the no-answer response instead; **When** the flag is cleared, **Then** the answer is given again.

---

### Edge Cases

- A question that receives no answer stays open and visible.
- A member can still post a question after being shown a similar existing one.
- A flagged answer stays visible with a warning until a Varodd administrator reviews it.
- Spam and off-topic posts are handled through the same flagging process.
- A member cannot flag their own question or answer, or flag the same content twice while it waits for review. Several members can flag the same content, and their flags are reviewed together.
- Content that was cleared can be flagged again later, which starts a new review.
- The chatbot only offers prepared questions, and it never makes up an answer.
- Questions and answers posted during a demo are never used by the chatbot; its responses are based only on seeded forum content.
- Knowledge base activity is not shown in the activity feed to users who cannot access the knowledge base.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow an E-Waves member to post a question with a title of 1–120 characters, a description, and a topic. The title is shown wherever the question is listed or linked.
- **FR-002**: System MUST allow any E-Waves member, including the asker and colleagues at the asker's business, to answer a posted question.
- **FR-003**: System MUST store each question with all of its answers and keep multiple answers visible.
- **FR-004**: System MUST provide a forum where members can search questions and browse them by topic, including both open and answered questions. Search MUST use simple word matching against question titles, descriptions, and the text of answers that are not removed, list questions matching more words first, and never show removed content.
- **FR-005**: System MUST show up to 3 existing questions that closely match a question a member is about to post, found by a simple word-overlap check of the typed text against existing question titles and descriptions, and MUST still allow the member to post.
- **FR-006**: System MUST provide a simulated chatbot where the member picks from a fixed list of prepared questions, and which gives short written answers based on seeded forum content with links to the forum threads they are based on.
- **FR-007**: The simulated chatbot MUST make clear when the answer does not exist in the forum and link the closest questions if any exist. It MUST NOT make up an answer.
- **FR-008**: The simulated chatbot MUST show a visible notice with every answer that it cannot be entirely trusted and should be checked against its sources.
- **FR-009**: The simulated chatbot SHOULD offer to help post a question it cannot answer.
- **FR-010**: The simulated chatbot MUST give the no-answer response for a prepared question when any of its source questions or answers is flagged and not cleared, or removed.
- **FR-011**: System MUST show the name of the business that posted each question and answer.
- **FR-012**: System MUST allow any member to flag a question or answer with a reason, including outdated, incorrect, spam, or off-topic content. A member MUST NOT flag their own content, and MUST NOT flag the same content twice while it waits for review. Flags from several members on the same content join one review. Cleared content MAY be flagged again, which starts a new review.
- **FR-013**: System MUST keep flagged content visible with a warning until a Varodd administrator clears or removes it, even if its author edits it. Removing a question MUST remove the entire thread, including all of its answers.
- **FR-014**: System MUST show a question as answered while at least one of its answers is not flagged or removed, and as open while it has none.
- **FR-015**: System MUST make the knowledge base available only to E-Waves members, meaning everyone working at an E-Waves member business. Varodd administrators MUST be able to view all of it and review flagged content, but MUST NOT post, answer, or flag.
- **FR-016**: System MUST publish questions and answers immediately, without review before publication.
- **FR-017**: System MUST notify the asker in the activity feed when their question receives an answer, and MUST notify the author and every member who flagged content when a Varodd administrator clears or removes it.
- **FR-018**: System MUST allow authors to edit their own questions and answers.
- **FR-019**: System MUST use the shared user switcher from `001-job-matching-marketplace`, instead of login, for switching between simulated E-Waves members, non-members, and Varodd administrators.
- **FR-020**: System MUST present its user interface in Norwegian Bokmål.
- **FR-021**: System MUST use only fictional seed data.
- **FR-022**: System MUST add knowledge base activity, such as questions posted, answered, flagged, and reviewed, to the shared activity feed, shown only to users who can access the knowledge base.
- **FR-023**: System MUST use the shared design language from `001-job-matching-marketplace`, including for the forum, the simulated chatbot, flag warnings, and the trust notice, without adding its own colours, fonts, or styles.

### Key Entities

- **Business**: The shared business defined in `001-job-matching-marketplace`. A business that is an E-Waves member can use the knowledge base (formerly referred to as "Member Business").
- **Question**: A problem posted by a member, including its title (1–120 characters), description, topic, business name, status (open or answered), and review state (current, flagged, cleared, or removed). Removing a question removes its entire thread.
- **Answer**: A response to a Question, attributed to a business, with a review state (current, flagged, cleared, or removed).
- **Topic**: A forum category, such as webstore, technical task, or AI adoption.
- **Flag**: A member's report on a question or answer, including its reason and review outcome.
- **Varodd Administrator**: Varodd staff who can view the knowledge base and review flagged content. The same role as in `001-job-matching-marketplace`.
- **Prepared Chatbot Question**: A question from the fixed list the chatbot offers, with its prepared response and the forum threads that response is based on, or a no-answer response if none exist.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A person trying the prototype can find an existing relevant answer, through search or the simulated chatbot, in under 2 minutes.
- **SC-002**: Every prepared chatbot question with stored content gets an answer with a link to its forum thread and a trust notice, every prepared question without stored content gets a no-answer response, and flagging a source thread turns its answer into a no-answer response.
- **SC-003**: Every one of the 3 prepared near-duplicate questions shows the existing question before posting.
- **SC-004**: The seed data includes 4–6 topics, 12–20 questions with open and answered ones, at least one question with several answers, at least one flagged item waiting for review, and 6–8 prepared chatbot questions with at least 3 that have stored content and at least 2 that do not, so every forum, review, and chatbot outcome can be shown in a demo.

## Assumptions

- Membership of E-Waves is the only eligibility rule for the knowledge base. Being a Varodd customer does not grant access.
- An answer may come from any member, not just Varodd staff or designated experts.
- There is no reward for answering in the prototype.
- The prepared test questions define what counts as relevant. The prepared near-duplicate questions are written so that the word-overlap check in FR-005 always matches them to an existing question.
- The seed data step from `001-job-matching-marketplace` also creates the fictional forum content: 4–6 topics; 12–20 questions, including open and answered ones, at least one with several answers, and at least one flagged item waiting for review; 6–8 prepared chatbot questions, at least 3 with stored content and at least 2 without; and 3 prepared near-duplicate questions.
- Businesses and simulated users are shared with feature `001-job-matching-marketplace`. A member is any simulated user who works at a business that is an E-Waves member, whether or not they are its owner, including a worker placed there through `001-job-matching-marketplace` as described in that spec; anyone else is a non-member, except Varodd administrators, who can view the knowledge base.
- The list of topics is fixed in the seed data and cannot be edited in the prototype. Who maintains it is an open question for later.
- Whether authors can delete their own questions and answers is an open question for later.
