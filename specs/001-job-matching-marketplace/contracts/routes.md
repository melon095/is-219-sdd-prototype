# Contract: Pages and Routes

**Feature**: `001-job-matching-marketplace` | **Commands**: [commands.md](./commands.md) | **Frame**: [shared-frame.md](./shared-frame.md)

URLs are hash-based (`/#/oppdrag`), see [research.md §6](../research.md#6-routing). Paths are Norwegian. Every page:

- Is shown inside the shared frame: header, main content, footer with the "Simulert prototype" notice.
- Has exactly one `<h1>`. After navigation, focus moves to the `<h1>` and the page title (`<title>`) changes to "*Page name* – Varodd".
- Uses landmarks (`header`, `nav`, `main`, `footer`) and starts with a "Hopp til hovedinnhold" skip link.
- Shows a friendly "Du har ikke tilgang til denne siden" page, not an error, when the current person may not see it. Changing the user on the switcher re-checks access on the current page.
- Has a desktop and a mobile layout (breakpoint `48rem`, see [research.md §12](../research.md#12-desktop-and-mobile-layouts)).

## Frame pages

### `/` — Hjem (home page)

| | |
|---|---|
| **Who** | Everyone. |
| **Content** | Greeting for the current person ("Hei, Kari!"), one card per feature with a short text and one action (registered by each feature), and the activity feed. |
| **Activity feed** | Newest first. Each entry shows its text, a relative time ("for 5 minutter siden", with the exact time in a `<time>` element), and the feature name. Each entry is a link to `entry.target.route` (FR-030, US1-4). Only entries the current person may see (FR-030, spec edge case). Shows the 20 newest, with a "Vis flere" button. |
| **Desktop** | Two columns: feature cards on the left (about 60%), activity feed on the right. |
| **Mobile** | One column: feature cards, then the activity feed. |
| **Spec** | FR-028, FR-030, US1-3, US1-4 |

### `*` — Siden finnes ikke (not found)

A friendly page with a link back to Hjem.

## Feature 001 pages

The header button for this feature is labelled **Oppdrag**.

### `/oppdrag` — Oppdrag (request list)

| | |
|---|---|
| **Who** | Owners: their own business's requests, all statuses. Workers: every Open request, plus requests where they have a non-removed entry or are the agreed worker, under the heading "Dine oppdrag". Admins: every request. Others, including non-owner employees: a short explanation that only business owners and people seeking work use this feature, with no requests listed (FR-037, spec edge cases). |
| **Content** | Each request: title, business name, status badge, desired start, duration, skill tags. Owners see a "Nytt oppdrag" button. Admins can filter by status and see "Til vurdering" requests first. Workers see the notice "Du kan ikke søke direkte; vi matcher deg automatisk" (US3-7). |
| **Desktop** | Table-like list with columns, filter controls above. |
| **Mobile** | Stacked cards, filter in a disclosure. |
| **Spec** | FR-037, US3-7 |

### `/oppdrag/ny` — Nytt oppdrag (new request)

| | |
|---|---|
| **Who** | Business owners only. |
| **Content** | Form with: title, description, required skills (searchable multi-select combo box from the skill list, with selected skills as removable tags), additional requirements, desired start date (date picker, `nb-NO`), estimated duration (number + weeks/months), hours per week, remote or on-site (radio group). If the business has crawl suggestions, they are pre-filled as selected skills and marked "Forslag" with the note "Vi har lagt inn noen ferdigheter vi tror du trenger, ut fra det vi fant på nettsiden til bedriften din. De er merket «Forslag». Fjern dem som ikke passer, og legg til andre om du vil." followed by a "Simulert" label (FR-023, US5-3). The duration notice is shown inline as soon as the duration is outside the typical range, and again after publishing (FR-014). |
| **After submit** | Navigates to the new request page and announces "Oppdraget er publisert". |
| **Desktop** | Form at reading width (about 650 px) with a side panel explaining how matching works. |
| **Mobile** | One column; the explanation is a disclosure above the form. |
| **Spec** | FR-001, FR-014, FR-023, FR-024, US2-1, US2-9, US5-3, US5-5, SC-001 |

### `/oppdrag/:requestId` — the request page

| | |
|---|---|
| **Who** | The owner, admins, and workers who may see this request (see `/oppdrag`). A worker viewing an Open request where they have no entry sees only the details. A person with a non-draft worker profile who may not see the request, for example after following an older activity feed entry, sees only the request title as the page heading, the text "Dette oppdraget er ikke lenger åpent for deg. Vi gir deg beskjed når vi finner nye oppdrag som passer deg.", and a link to `/oppdrag`. Anyone else who may not see it gets the general no-access page. |
| **Content** | **Details**: all request fields, status badge, duration notice if relevant. **Shortlist** (owner and admin): each worker's name, rank, matched and missing skills, experience level, availability, NAV badge "Henvist fra NAV" (FR-019, US2-3), interview invitation state; actions Inviter til intervju, Gi tilbud, and Avvis hele kortlisten (needs a reason in a dialog). **Your status** (worker): offer with Godta / Avslå, or agreed with Trekk deg. **Conversations**: owner sees one tab per worker; a worker sees only their own; admins see all, read-only (FR-011). **Log**: list of log events, filtered as in the data model, newest last, with time and actor ("System" for automatic events). **Actions by status**: Rediger (owner, Open), Registrer oppstart (owner, Agreed), Marker som fullført with outcome (owner, In progress), Avlys (owner or admin, needs a reason), Gjør åpen igjen and Avlys (admin, Under review). **Debug**: on Offered requests, a clearly marked demo control "Simuler at 7 dager har gått" (FR-016, FR-033). |
| **Desktop** | Two columns: details and log on the left, shortlist and conversation on the right. |
| **Mobile** | Details at the top, then tabs: Kortliste, Meldinger, Logg. |
| **Spec** | FR-004–FR-013, FR-016, FR-019, FR-033, US2-2–US2-8, US3-4–US3-6, US4-1–US4-7 |

### `/oppdrag/:requestId/rediger` — Rediger oppdrag

Same form as `/oppdrag/ny`, filled in. Only for the owner while the status is Open. For other statuses it shows "Oppdraget kan bare endres mens det er åpent" with a link back (FR-015, US2-8).

### `/profil` — Min profil (worker profile)

| | |
|---|---|
| **Who** | People with `seeksWork`. Others see an explanation. |
| **Content** | No profile: a registration form (skills, experience level, available from, optional wishes). NAV draft: a notice "Du er henvist fra NAV (simulert). Fyll ut profilen din for å bli med i matchingen" and the same form (US3-3). Complete profile: the profile with Rediger, and a list of the person's shortlists and offers with links. |
| **Spec** | FR-002, FR-018, US3-1, US3-3 |

### `/bedrift` — Min bedrift (business settings)

| | |
|---|---|
| **Who** | Business owners. Employees see the business's name and members, read-only. |
| **Content** | Business name, description, people working there, E-Waves membership (shown, not editable), crawl opt-in switch with a plain explanation (FR-021, US5-7), current crawl suggestions with the "Simulert" label and the time of the last crawl. |
| **Spec** | FR-021, US5-1, US5-7 |

### `/admin` — Varodd-verktøy (admin tools)

| | |
|---|---|
| **Who** | Varodd administrators. |
| **Content** | **Til vurdering**: requests Under review with the owner's reason and links. **Simulert NAV-henvisning**: a list of people who seek work and have no profile, each with "Henvis fra NAV (simulert)" (FR-018, US3-2). **Simulert gjennomgang av nettsider**: one "Kjør simulert gjennomgang" button, the last runs with crawled and skipped businesses (FR-022, US5-1, US5-2). Every simulated action is labelled "Simulert". |
| **Spec** | FR-009, FR-018, FR-022, US2-7, US3-2, US5-1, US5-2 |

## Header (all pages)

Defined in [shared-frame.md](./shared-frame.md#header). In short: the Varodd name links to `/`; a navy bar holds one button per feature (Hjem, Oppdrag, and later Kunnskapsbank), the user switcher, and the demo controls ("Tilbakestill demo"). The Oppdrag sub-pages are reached from links inside the feature: "Min profil" for people seeking work, "Min bedrift" for owners, and "Varodd-verktøy" for admins, shown as a secondary row of links under the header on feature 001 pages.
