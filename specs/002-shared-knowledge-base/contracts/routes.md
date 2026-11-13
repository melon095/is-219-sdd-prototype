# Contract: Knowledge Base Pages and Routes

**Feature**: `002-shared-knowledge-base` | **Commands**: [commands.md](./commands.md) | **Frame**: [001 routes.md](../../001-job-matching-marketplace/contracts/routes.md), [001 shared-frame.md](../../001-job-matching-marketplace/contracts/shared-frame.md)

Every page follows the frame rules in [001 routes.md](../../001-job-matching-marketplace/contracts/routes.md): shown inside the shared frame, one `<h1>` that receives focus after navigation, a title "*Page name* – Varodd", landmarks and the skip link, and separate desktop and mobile layouts at `48rem`. URLs are hash-based and written without Norwegian letters.

The header button for this feature is labelled **Kunnskapsbank** and comes after Oppdrag. Every page under `/kunnskapsbank` shows the shared secondary row of links (`SubNav`): "Forum" and "Spør chatboten" for members and administrators, and also "Til vurdering" with the number of open reviews for administrators.

## Access

| Person | Every page below |
|---|---|
| Member | As described per page |
| Varodd administrator | Sees everything, never the posting, answering, editing, or flagging controls (FR-015) |
| Anyone else | The page "Kunnskapsbanken er for E-Waves-medlemmer" with the text "Kunnskapsbanken er et medlemsgode for bedrifter i E-Waves, et nettverk av nettbutikker. Her hjelper bedriftene hverandre med spørsmål og svar." and a link to `/`. No questions, answers, or counts are shown (US1-2). |

Changing user re-checks access on the current page, as in 001.

## Home card

| Person | Card |
|---|---|
| Member | "Spør andre bedrifter" / "Still et spørsmål, eller finn svar fra bedrifter som har løst det samme før deg." / "Gå til kunnskapsbanken" |
| Administrator | "Kunnskapsbanken" / "Se hva medlemmene spør om, og vurder innhold som er flagget." / "Gå til kunnskapsbanken" |
| Anyone else | `null` |

All link to `/kunnskapsbank`.

## `/kunnskapsbank` — Forum

| | |
|---|---|
| **Content** | A `SearchField` "Søk i forumet". Without a search: the topics, each with its name, description, and number of questions, linking to the topic page, and the 10 newest questions. With a search: "*N* treff for «*query*»" (announced through `LiveAnnouncer`) and the matching questions, or the empty state "Vi fant ingen spørsmål som passer. Prøv andre ord, eller still spørsmålet selv." The search is kept in the URL (`?sok=`). Members see "Still et spørsmål". |
| **Question row** | Title (link), topic, business name, a `StatusBadge` "Åpent" (neutral) or "Besvart" (success), number of answers, date. A flagged question also shows "Flagget". |
| **Desktop** | Two columns: topics on the left (about a third), the search and the question list on the right. |
| **Mobile** | One column: search, then the topics in a `Disclosure` "Tema", then the list. |
| **Spec** | FR-004, FR-011, US2-1, US2-2 |

## `/kunnskapsbank/tema/:topicId` — Topic

The topic's name as `<h1>`, its description, and every visible question in it, newest first, as rows like the forum list. Members see "Still et spørsmål i dette temaet", which opens the form with the topic already chosen. An unknown topic shows the frame's not-found page. **Spec**: FR-004, US2-2.

## `/kunnskapsbank/sporsmal/ny` — Still et spørsmål

| | |
|---|---|
| **Who** | Members only. An administrator sees "Som Varodd-ansatt kan du lese, men ikke skrive i kunnskapsbanken." |
| **Content** | `Select` "Tema", `TextField` "Tittel" (up to 120 characters, with a character count), `TextArea` "Beskriv spørsmålet". Optional `?tema=<topicId>` chooses the topic, and `?fra=<chatbotQuestionId>` fills in the title from a prepared chatbot question. |
| **Similar questions** | 300 ms after typing stops, up to 3 similar questions are shown in a panel "Har noen spurt om dette før?", each with its title, status, business, and the start of its first visible answer, and a link. Below them: "Du kan fortsatt publisere spørsmålet ditt." The change is announced through `LiveAnnouncer` ("Vi fant 2 lignende spørsmål"). It never blocks publishing (FR-005). |
| **After submit** | Goes to the new question page and announces "Spørsmålet er publisert". |
| **Desktop** | Form at reading width, with the similar-questions panel beside it. |
| **Mobile** | One column; the similar-questions panel comes between the title and the description. |
| **Spec** | FR-001, FR-005, FR-016, US1-5, US2-3, SC-003 |

## `/kunnskapsbank/sporsmal/:questionId` — Question page

| | |
|---|---|
| **Content** | Title as `<h1>`, `StatusBadge`, topic link, business name, author name, date and "Endret" time if edited, the description. Then "*N* svar", each answer with its business name, author name, date, and text, oldest first. |
| **Flagged content** | A warning `Notice` on the question or answer: "Dette innlegget er flagget (*reasons*) og blir vurdert av Varodd. Vær forsiktig med å stole på det." Administrators also see who flagged and each note. |
| **Member actions** | "Rediger" on their own question (goes to the edit page) and on their own answers (edits inline with a `TextArea`, "Lagre" and "Avbryt"); "Flagg" on other people's content, which opens a `Dialog` with a `RadioGroup` of reasons and an optional `TextArea` "Fortell kort hva som er galt", required for "Annet". "Flagg" is replaced by "Du har flagget dette" once the member has flagged it. At the bottom, "Skriv et svar" with a `TextArea` and "Publiser svar". |
| **Administrator actions** | On flagged content, "Behold" and "Fjern", as on the review page. |
| **Removed** | A removed question shows the `<h1>` "Spørsmålet er fjernet", the text "Varodd har fjernet dette spørsmålet fordi det ikke passet i forumet.", and a link to `/kunnskapsbank`. Removed answers are not shown. |
| **Desktop** | The question and answers at reading width, with a side panel: topic, status, number of answers, and links to other questions in the same topic. |
| **Mobile** | One column; the side panel's content comes after the answers. |
| **Spec** | FR-002, FR-003, FR-011–FR-014, FR-018, US1-6–US1-8, US3-1–US3-5 |

## `/kunnskapsbank/sporsmal/:questionId/rediger` — Rediger spørsmål

The same form as "Still et spørsmål", filled in, without the similar-questions panel. Only the author, while the question is not removed. Others see the frame's no-access page. **Spec**: FR-018.

## `/kunnskapsbank/chatbot` — Spør chatboten

| | |
|---|---|
| **Content** | The `<h1>` "Spør chatboten", a `SimulatedLabel`, and the text "I den ekte tjenesten kan du skrive spørsmålet ditt med egne ord. I denne prototypen velger du blant noen ferdige spørsmål." A list of the prepared questions as buttons. Picking one adds the question and the response to a transcript (a log region announced politely), and moves focus to the response. |
| **Answer** | The prepared text; "Kilder:" with links to the source threads; the `Notice` (info) "Svaret er laget av en chatbot og kan ta feil. Sjekk kildene før du stoler på det." (FR-008) |
| **No answer** | "Vi fant ikke noe svar på dette i forumet."; "Disse spørsmålene ligner kanskje:" with up to 3 links, if any; "Still spørsmålet i forumet" for members, linking to `/kunnskapsbank/sporsmal/ny?fra=<id>` (FR-007, FR-009). |
| **Desktop** | The question list on the left (about a third), the transcript on the right. |
| **Mobile** | The transcript first, the question list below it. |
| **Spec** | FR-006–FR-010, US4-1–US4-5, SC-002 |

## `/kunnskapsbank/vurdering` — Til vurdering

| | |
|---|---|
| **Who** | Varodd administrators only; everyone else gets the frame's no-access page. |
| **Content** | Open reviews, oldest first: whether it is a question or an answer, the question title (link), the content text, the author and business, and every flag with the person, reason, note, and time. "Behold" clears it at once and announces "Innlegget er beholdt". "Fjern" opens an `AlertDialog`; for a question its text says "Hele tråden blir fjernet, med alle svarene." Then "Tidligere vurderinger": the 10 newest closed reviews with their outcome, administrator, and time. Empty state: "Ingenting venter på vurdering." |
| **Spec** | FR-013, FR-015, FR-017, US3-1, US3-2, US3-6 |
