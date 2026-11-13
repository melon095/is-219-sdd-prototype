# Contract: Shared Frame

**Feature**: `001-job-matching-marketplace` | **Used by**: `002-shared-knowledge-base` and later features

Feature 001 builds the frame that every feature runs in (spec Prototype Scope, constitution principles I and IV). This contract is what a later feature may rely on and must use. A later feature adds to the frame only through the extension points below, and adds any missing design token or shared component to the frame itself instead of defining its own.

## Feature registration

Each feature exports one definition, and `src/app/features.ts` lists them in header order:

```ts
type SystemStep = (state: DemoState, now: IsoDateTime) => DemoState;

type FeatureDefinition = {
  id: string;
  label: string;
  basePath: string;
  homeCard: (person: Person, state: DemoState) => { title: string; text: string; actionLabel: string; route: string } | null;
  routes: RouteObject[];
  audienceGroups: Record<string, (person: Person, state: DemoState) => boolean>;
  commandHandlers: Record<string, CommandHandler>;
  stateSchema: ZodType;
  systemSteps: SystemStep[];
};
```

`homeCard` returns the card for the given person, or `null` when the feature has no card for them. A system step is a rule that depends on time passing. The frame runs every feature's system steps when the state is loaded, before every command, and once a minute.

| Field | Feature 001 value |
|---|---|
| `id` | `"marketplace"` |
| `label` | `"Oppdrag"` |
| `basePath` | `"/oppdrag"` |
| `homeCard` | Owners: "Få hjelp med små oppdrag" / "Beskriv hva du trenger hjelp til, så finner vi folk som kan hjelpe deg." / "Gå til oppdrag". Workers: "Oppdrag som passer deg" / "Vi matcher deg automatisk med oppdrag som passer ferdighetene dine." / "Se oppdrag". Admins: "Følg alle oppdrag" / "Se alle oppdrag og det som venter på vurdering." / "Gå til oppdrag". All link to `/oppdrag`. Everyone else: `null`. |
| `audienceGroups` | `"marketplace.workers"` |
| `commandHandlers` | The commands in [commands.md](./commands.md) |
| `systemSteps` | `expireOverdueOffers` |

The frame builds the router, the header buttons, the home page cards, `applyCommand`, the feed's audience check, and the stored state schema from this list. Adding a feature means adding one entry; no frame file other than `features.ts` changes.

## Header

- Left: "Varodd" in Bree Serif, linking to `/`.
- Navy bar (`--color-navy`) with: one button per feature plus Hjem (FR-029), the user switcher, and "Tilbakestill demo". The current feature's button has `aria-current="page"`.
- Desktop: everything visible in the bar.
- Mobile: the bar shows "Varodd" and a "Meny" button. "Meny" is a React Aria `DialogTrigger` with a popover or full-width panel that contains the feature buttons, the user switcher, and the demo controls. Focus is trapped while it is open, Escape closes it, and focus returns to the "Meny" button.

## User switcher

- A React Aria `Select` labelled "Bytt bruker", showing the current person's name and description.
- Options grouped in sections: Bedriftseiere, Ansatte, Arbeidssøkere, Varodd. A person with several roles is listed once, in the first matching section in that order.
- Changing user saves the selection, keeps the current page, re-checks access on it, and announces "Du ser nå prototypen som *name*" (FR-025, US1-1).

## Activity feed

- Entries are `ActivityEntry` records in `frame.activity` (see [data-model.md](../data-model.md#activityentry)). Features add them only through their command handlers.
- A feature registers audience groups with a function that is checked when the feed is shown. Varodd administrators see every entry.
- Feature 002 registers its own group (for example, `"knowledgeBase.members"`), so knowledge base entries are shown only to people who can use the knowledge base (002 FR-022).
- `Audience` has an optional `requiredGroup`. When set, an entry is shown only to a person for whom that group's check is true, even if the person is listed in `audience.personIds` or matches another group. Varodd administrators still see every entry. Entries without it behave as before.

## Demo controls

- **Tilbakestill demo**: opens an alert dialog "Vil du tilbakestille demoen? Alle endringer i denne nettleseren blir slettet." with "Tilbakestill" and "Avbryt". Confirming runs `resetDemo` and goes to `/` (FR-031).
- **Time debug button** (`<TimeDebugButton label=... onPress=... />`): a shared component for any object with a time-based rule (FR-033). Shown with a dashed border, a clock icon, and the visible prefix "Demo:", so it is clearly not part of the real product. Feature 001 uses it on Offered requests. Later features use the same component.
- **Simulated label** (`<SimulatedLabel />`): the "Simulert" badge for every simulated action and result (NAV referral, crawl, and in 002 the chatbot).
- **Footer**: "Dette er en prototype. Alle personer, bedrifter og data er oppdiktet." (FR-027).

## Seed data

`scripts/seed/generate.ts` calls one generator module per feature, in feature order. Each module receives its own random number generator and the frame data:

```ts
type SeedModule = (rng: Rng, frame: FrameSeed) => { key: string; data: unknown; activity: ActivityEntry[] };
```

The frame module (`scripts/seed/frame.ts`) generates people, businesses, and skills. Feature 001's module (`scripts/seed/marketplace.ts`) generates worker profiles, requests, conversations, the crawl catalog, and crawl runs. Feature 002 adds `scripts/seed/knowledge-base.ts`. A later feature may add people or businesses only by changing `frame.ts`. Adding a module at the end does not change any random numbers used by earlier modules, because each module gets its own random number generator derived from the fixed seed and the module key.

## Design tokens

Defined once in `src/frame/design/tokens.css` on `:root`. Components and feature CSS use only these custom properties (constitution principle IV). Values are from the spec's Design Language section, plus the AA additions from [research.md §4](../research.md#4-design-tokens-and-wcag-21-aa-colours).

### Colours

| Token | Value | Use |
|---|---|---|
| `--color-navy` | `#000082` | Buttons, links, header bar |
| `--color-navy-hover` | `#000070` | Hover |
| `--color-navy-pressed` | `#000090` | Pressed |
| `--color-navy-50` | `#F6F6FF` | Section backgrounds |
| `--color-navy-100` | `#E5E5F8` | Highlights, selected rows (no secondary text on it) |
| `--color-navy-200` | `#D0D0EA` | Highlight borders |
| `--color-navy-300` | `#9999D9` | Decorative only |
| `--color-text` | `#1e1e1e` | Body text |
| `--color-text-secondary` | `#707070` | Secondary text (AA addition, replaces `#8B8B8B` and `#737373` for text) |
| `--color-background` | `#ffffff` | Page background |
| `--color-grey-50` | `#FAFAFA` | Card backgrounds |
| `--color-grey-100` | `#EEEEEE` | Dividers |
| `--color-grey-200` | `#D5D5D5` | Borders |
| `--color-grey-300` | `#BDBDBD` | Form field borders |
| `--color-grey-400` | `#8B8B8B` | Borders only |
| `--color-grey-500` | `#737373` | Borders only |
| `--color-success` | `#77AC94` | Fill behind `--color-text` only |
| `--color-success-text` | `#4A7963` | Success text and icons (AA addition) |
| `--color-warning` | `#FF8C00` | Fill behind `--color-text` only |
| `--color-warning-text` | `#A85C00` | Warning text and icons (AA addition) |
| `--color-error` | `#F04438` | Decorative only |
| `--color-error-text` | `#DA1E10` | Error text, icons, and invalid field borders (AA addition) |
| `--color-info` | `#0000A0` | Information text, icons, and borders (already AA) |
| `--color-focus` | `var(--color-navy)` | Focus ring on light backgrounds |
| `--color-focus-on-navy` | `#ffffff` | Focus ring inside the header bar |

### Typography

| Token | Value |
|---|---|
| `--font-heading` | `"Bree Serif", Georgia, serif` |
| `--font-body` | `"Barlow", system-ui, sans-serif` |
| `--line-height-heading` | `1.2` |
| `--line-height-body` | `1.7` |
| `--font-size-body` | `1.0625rem` (17 px) |
| `--font-size-small` | `1rem` (16 px), the smallest size used |
| `--font-size-h1` | `2.25rem` desktop, `1.875rem` mobile |
| `--font-size-h2` | `1.5rem` |
| `--font-size-h3` | `1.25rem` |
| `--font-size-h4` | `1.125rem` |
| `--font-weight-semibold` | `600` (button text) |

### Shape, spacing, and layout

| Token | Value |
|---|---|
| `--radius` | `8px` (buttons, fields, cards) |
| `--shadow-field` | `0 1px 3px rgb(0 0 0 / 0.08)` |
| `--shadow-card` | `0 2px 8px rgb(0 0 0 / 0.06)` |
| `--focus-ring` | `2px solid var(--color-focus)`, offset `2px` |
| `--space-1` … `--space-8` | `0.25rem`, `0.5rem`, `0.75rem`, `1rem`, `1.5rem`, `2rem`, `3rem`, `4rem` |
| `--width-reading` | `40.625rem` (650 px) |
| `--width-page` | `81.25rem` (1300 px) |
| `--breakpoint-desktop` | `48rem` (768 px), used in media queries as a literal, because custom properties cannot be used inside `@media` |
| `--target-size-min` | `2.75rem` (44 px), the minimum height of buttons and other click targets |

Motion: transitions are short (150 ms) and turned off under `prefers-reduced-motion: reduce`.

## Shared UI components

In `src/frame/ui/`. Each is a React Aria component from the Vanilla CSS starter kit, with its own CSS file using the tokens above. Later features use these and do not style React Aria components themselves.

`Button` (primary, secondary, and quiet), `Link`, `TextField`, `TextArea`, `NumberField`, `Select`, `ComboBox`, `TagPicker` (searchable multi-select with removable tags), `RadioGroup`, `Switch`, `DatePicker` (`nb-NO`), `Dialog`, `AlertDialog` (with an optional required reason field), `Menu`, `Disclosure`, `Tabs`, `Card`, `StatusBadge` (text plus colour, never colour alone), `Notice` (info, success, warning, error), `SimulatedLabel`, `TimeDebugButton`, `EmptyState`, `LiveAnnouncer` (polite live region used after commands), `PageHeading` (the focus target after navigation), and `SearchField` (a search box with a clear button, added by feature 002).

`src/frame/layout/` also holds `SubNav` (the secondary row of links under the header, with an optional badge on each link) and `SubNavLayout` (the `SubNav` above an `<Outlet />`). Feature 001 and feature 002 both use them; they were first built inside 001's marketplace feature and moved to the frame by 002.

Every component has a component test with a `jest-axe` check, and its CSS has visible hover, pressed, focus-visible, disabled, and invalid states where they apply.
