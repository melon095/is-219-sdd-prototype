# Contract: Seed Data File and Browser Storage

**Feature**: `001-job-matching-marketplace` | **Data model**: [../data-model.md](../data-model.md) | **Decisions**: [research.md §7, §9, §10](../research.md#9-seed-data-step)

## Seed data step

| | |
|---|---|
| **Command** | `pnpm seed` |
| **Entry point** | `scripts/seed/generate.ts`, run with `tsx` |
| **Output** | `src/seed/seed-data.json`, committed to git |
| **Determinism** | Fixed random seed; no clock, network, or environment input. Running it twice gives byte-identical files (FR-032). |
| **Formatting** | `JSON.stringify(data, null, 2)` with a trailing newline. Object keys in a fixed order (the order the generator writes them). |
| **Check** | `pnpm test` includes a test that generates the seed in memory and compares it with the committed file. If someone changes the generator without running `pnpm seed`, the test fails. |

### File format

```jsonc
{
  "format": 1,
  "seedId": "<sha-256 hex of the file content with seedId set to an empty string>",
  "anchorDate": "2026-11-16",
  "frame": {
    "people": [ /* Person */ ],
    "businesses": [ /* Business */ ],
    "skills": [ /* Skill */ ],
    "activity": [ /* ActivityEntry */ ]
  },
  "marketplace": {
    "workerProfiles": [ /* WorkerProfile */ ],
    "requests": [ /* TaskRequest, including shortlists and logs */ ],
    "conversations": [ /* Conversation */ ],
    "crawlCatalog": [ /* CrawlCatalogEntry */ ],
    "crawlRuns": [ /* CrawlRun */ ]
  }
}
```

Feature 002 adds a top-level `"knowledgeBase"` object (see [shared-frame.md](./shared-frame.md#seed-data)). Field shapes are those in the data model. One Zod schema (`src/frame/store/schema.ts` for the frame part, and one per feature) is used both to check the generated file in tests and to check stored data when the app loads.

### Dates in the seed file

All `IsoDate` and `IsoDateTime` values in the file are written as if today were `anchorDate`. When the seed is loaded, every one of them is moved forward by `daysBetween(anchorDate, today)` whole days, where `today` is the browser's local date. Times of day and gaps between dates do not change. The function that does this, `shiftSeedDates(seed, days)`, lists every date field explicitly and has a test that fails if a date field in the schema is missing from it.

## Browser storage

| Key | Content | Written when |
|---|---|---|
| `varodd-prototype:state` | `{ "format": 1, "seedId": "...", "state": DemoState }` | After every successful command, and after a reset |
| `varodd-prototype:user` | The selected person's `Id` as a JSON string | When the user switcher changes |

### Loading

1. Read `varodd-prototype:state`.
2. If it is missing, cannot be parsed, fails the Zod schema, has another `format`, or has a `seedId` different from the bundled seed file, load the seed file with moved dates instead and save it.
3. Run `expireOverdueOffers` with the current time and save if anything changed.
4. Read `varodd-prototype:user`. If it is missing or not a person in the state, select the first business owner in the seed, so a first visit opens on the main business-owner view.

### Reset

`resetDemo` loads the seed file with moved dates, replaces `varodd-prototype:state`, and keeps `varodd-prototype:user` (FR-031, US1-5, SC-006). Only this browser is affected; nothing is shared between browsers or computers (US1-6).

### Other tabs

The store listens to the `storage` event. When `varodd-prototype:state` or `varodd-prototype:user` changes in another tab, the store reloads from storage.

### When storage is not available

If `localStorage` throws (for example, in some private browsing modes), the prototype runs from the seed in memory and shows a notice in the footer: "Endringer lagres ikke i denne nettleseren".
