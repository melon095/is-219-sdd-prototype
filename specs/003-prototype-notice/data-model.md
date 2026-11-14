# Data Model: Prototype Notice on First Visit

**Feature**: `003-prototype-notice` | **Plan**: [plan.md](./plan.md)

## Notice confirmation

A flag kept only in the visitor's browser. It is not part of `DemoState` and is never sent anywhere.

| Field | Value |
|---|---|
| Storage | `localStorage` |
| Key | `varodd-prototype:notice` (exported as `NOTICE_KEY` from `src/frame/store/persistence.ts`) |
| Value | The JSON text `true` once the notice has been confirmed |

### Reading

`loadNoticeConfirmed(storage: StorageLike): boolean`

- `true` only when the stored text parses to exactly `true`.
- `false` when the key is missing, the text is not valid JSON, the value is anything else, or reading throws.

### Writing

`saveNoticeConfirmed(storage: StorageLike): { storageAvailable: boolean }`

- Writes `true` under `NOTICE_KEY`.
- Returns `storageAvailable: false` instead of throwing when the browser refuses to store it.

### What does not change it

- "Tilbakestill demo" (`store.reset()`) writes only the state entry.
- A new bundled seed replaces only the state entry.
- Switching simulated user writes only the user entry.

### States of the notice in the page

```text
not confirmed ──(page loads)──> waiting (5 s, button disabled, countdown shown)
waiting ──(5 s passed)──> ready (button enabled, "Nå kan du gå videre." announced once)
ready ──("Jeg forstår")──> closed (flag saved if possible; stays closed for this page's life)
confirmed in storage ──(page loads)──> closed (never rendered)
```
