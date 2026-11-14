# Feature Specification: Prototype Notice on First Visit

**Feature Branch**: `003-prototype-notice`

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "Prototype notice on first visit. The prototype is published on a public website (https://varodd.jflottorp.no) and uses the name and visual design of the real company Varodd. The first time a person opens the website, a modal notice must be shown before they can use the app. It must tell them, in Norwegian Bokmål: that this product is not made by or affiliated with Varodd; that it is a prototype made as a student project; that all information in it (people, businesses, job requests, questions, answers) is made up and does not represent any real person or company; and that any changes they make are stored only locally in their own browser and are not sent anywhere. The modal is forced: it cannot be closed or dismissed (no close button, Escape, or clicking outside) until about 5 seconds have passed, after which a button lets the person confirm and continue. Once confirmed, it is not shown again in that browser. It belongs to the shared frame from feature 001, uses the shared design language and components, and must meet WCAG 2.1 AA."

## Context

The prototype is open to anyone at https://varodd.jflottorp.no. It uses the name, colours, fonts, and tone of the real company Varodd (constitution principle IV), and it is filled with made-up people and businesses that look real (constitution principle II). A visitor who arrives without context could believe they are using a real Varodd service, that the people and businesses in it exist, or that what they type is sent to Varodd. This feature makes sure every visitor is told the truth before they can use the prototype.

The notice is part of the shared frame defined in `001-job-matching-marketplace`, so it covers every feature, including `002-shared-knowledge-base` and any later ones. It does not change the design language: it uses the same shared components and tone as the rest of the prototype.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A first-time visitor learns what the website is before using it (Priority: P1)

A person opens the website for the first time. Before they can see or use anything, a notice covers the page. It tells them that the website is a student prototype, not a product from Varodd, that everything in it is made up, and that anything they change stays in their own browser. They cannot close it straight away. After about 5 seconds a button becomes available, and when they press it, the notice closes and they can use the prototype.

**Why this priority**: This is the whole feature. Without it, a public website using a real company's name and design can mislead people.

**Independent Test**: Open the website in a browser that has never visited it, check that the notice is shown with all four statements, that nothing behind it can be used, that it cannot be closed during the first 5 seconds, and that it closes with the button after that.

**Acceptance Scenarios**:

1. **Given** a browser that has never confirmed the notice, **When** the person opens the home page, **Then** the notice is shown above the page, and it states that the website is not made by or affiliated with Varodd, that it is a prototype made as a student project, that all people, businesses, job requests, questions, and answers are made up and do not represent any real person or company, and that changes are stored only in their own browser and are not sent anywhere.
2. **Given** the notice has just been shown, **When** the person presses Escape, clicks or taps outside the notice, or tries to reach the page behind it with the keyboard, **Then** the notice stays open and nothing behind it can be used.
3. **Given** the notice has been shown for less than 5 seconds, **When** the person looks at the confirm button, **Then** it cannot be used, and the notice shows how many seconds are left in text.
4. **Given** the notice has been shown for 5 seconds, **When** the person presses the confirm button, **Then** the notice closes and they can use the page they opened.
5. **Given** the notice has been shown for 5 seconds, **When** the person presses Escape, **Then** the notice still stays open, because only the confirm button closes it.

---

### User Story 2 - A returning visitor is not interrupted again (Priority: P2)

A person who has already confirmed the notice comes back to the website later in the same browser. The prototype opens straight away, with no notice.

**Why this priority**: Showing the notice every time would make the prototype tiresome to demo and to test, but it matters less than showing it the first time.

**Independent Test**: Confirm the notice, reload the page and open the website again in a new tab in the same browser, and check that the notice is not shown.

**Acceptance Scenarios**:

1. **Given** the person has confirmed the notice in this browser, **When** they reload the page or open the website again later, **Then** the notice is not shown.
2. **Given** the person has confirmed the notice, **When** they use "Tilbakestill demo", **Then** the demo data is reset and the notice is not shown again.
3. **Given** the person has confirmed the notice in one browser, **When** they open the website in a different browser or on a different device, **Then** the notice is shown there.

---

### User Story 3 - Visitors who arrive through a direct link are also told (Priority: P2)

Someone shares a direct link to a page inside the prototype, for example a question in the knowledge base. A person who opens that link as their first visit sees the same notice before the page, and after confirming, they are on the page the link pointed to.

**Why this priority**: Links to inner pages are how a public prototype is most likely to be shared, and those visitors need the notice as much as those who start on the home page.

**Independent Test**: In a browser that has never confirmed the notice, open a link to an inner page, check that the notice is shown, confirm it, and check that the linked page is shown.

**Acceptance Scenarios**:

1. **Given** a browser that has never confirmed the notice, **When** the person opens a link to any page in the prototype, **Then** the notice is shown before that page can be used.
2. **Given** the notice was shown on top of an inner page, **When** the person confirms it, **Then** they stay on that inner page.

---

### Edge Cases

- **Browser storage blocked or unavailable** (for example some private browsing modes): the notice is shown on every full page load in that browser, and confirming it lets the person continue for as long as the page stays open. The prototype never stops working because the confirmation could not be remembered.
- **Several tabs open at the first visit**: each tab shows the notice until it is confirmed in that tab or the page is reloaded after it was confirmed in another tab.
- **Switching away from the tab during the 5 seconds**: the waiting time still counts from when the notice appeared, so returning after 5 seconds shows the button ready.
- **Keyboard and screen reader users**: when the notice opens, focus moves into it and the title and text are read out. Focus cannot leave the notice while it is open. When the button becomes available, this is announced once, without announcing every second of the countdown. After confirming, focus moves to the main heading of the page behind it.
- **Small screens and zoom**: the whole text and the button can be read and reached at 320 px width and at 200% zoom, by scrolling inside the notice if needed.
- **Reduced motion**: the countdown is shown as text, with no animation needed to understand it.
- **Switching simulated user**: the confirmation belongs to the browser, not to a simulated person, so switching user never shows the notice again.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The website MUST show the prototype notice on top of whatever page is opened first, in any browser where the notice has not been confirmed before.
- **FR-002**: The notice MUST state, in Norwegian Bokmål and in the shared warm "du"/"vi" tone, all four of these points: (a) the website is not made by Varodd and is not connected to Varodd; (b) it is a prototype made as a student project; (c) all people, businesses, job requests, questions, and answers in it are made up and do not represent any real person or company; (d) anything the person changes is stored only in their own browser and is not sent anywhere.
- **FR-003**: While the notice is open, nothing on the page behind it MUST be usable, by pointer, touch, or keyboard.
- **FR-004**: The notice MUST NOT close through Escape, clicking or tapping outside it, a close button, or any other way than its confirm button.
- **FR-005**: The confirm button MUST be unusable for the first 5 seconds after the notice appears, and the notice MUST show in text how many seconds are left until it can be used.
- **FR-006**: After 5 seconds the confirm button MUST become usable, and pressing it MUST close the notice and leave the person on the page they opened.
- **FR-007**: After the notice is confirmed, the website MUST NOT show it again in the same browser, including after reloading, after opening the website again later, after "Tilbakestill demo", and after switching simulated user.
- **FR-008**: If the browser cannot remember the confirmation, the notice MUST still be possible to confirm, and the prototype MUST work normally after confirming for as long as the page stays open.
- **FR-009**: The notice MUST use the shared design language and shared components of the frame, with no colours, fonts, or styles of its own.
- **FR-010**: The notice MUST meet WCAG 2.1 AA, including: it is announced as a dialog with a title, focus moves into it when it opens and stays in it while it is open, the waiting state and the moment the button becomes usable are available to screen reader users, and it reflows at 320 px width and 200% zoom.
- **FR-011**: The confirmation MUST be stored only in the person's own browser, like the rest of the demo data, and MUST NOT be sent anywhere.

### Key Entities

- **Notice confirmation**: a record, kept only in the person's browser, that the prototype notice has been confirmed. It is separate from the demo data, so resetting the demo does not remove it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a browser that has never visited the website, 100% of first page loads, whichever page is opened, show the notice before any part of the prototype can be used.
- **SC-002**: The notice cannot be closed in fewer than 5 seconds by any means, and can be closed with a single press of the confirm button at any time after 5 seconds.
- **SC-003**: After confirming, 0 further notices are shown in that browser across reloads, later visits, demo resets, and user switches.
- **SC-004**: A person who has read the notice can answer correctly, without looking back, that the website is not from Varodd and that the people and businesses in it are made up.
- **SC-005**: The notice passes the same automated accessibility checks as every other page (WCAG 2.1 AA), at desktop and mobile sizes, with zero violations.

## Assumptions

- "The first time a person opens the website" means the first time in a given browser, because the prototype has no accounts or server and can only remember things in the browser itself.
- The notice is shown on whatever page is opened first, not only the home page, because direct links to inner pages are a likely way into a public prototype.
- "About 5 seconds" means exactly 5 seconds, counted from when the notice appears.
- "Tilbakestill demo" resets only the demo data and does not bring the notice back. A person who wants to see it again can clear the website's data in their browser.
- The notice names the course and institution only as "a student project", because the description does not ask for more detail. The exact wording is settled during planning, following the four points in FR-002.
- The existing automated tests for features 001 and 002 can start with the notice already confirmed, so they keep testing those features and are not blocked by the 5-second wait. The notice itself gets its own tests.
- The notice does not change constitution principle IV: the prototype keeps Varodd's design language, and the notice is what makes that safe on a public website.
