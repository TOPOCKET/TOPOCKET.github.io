# Storage Contract

All browser persistence must go through `src/storage/*` and `src/stores/*`.
Direct `localStorage.setItem/getItem` in pages/components is not allowed.

## Namespace

- Prefix: `sopronwitta:`
- Key pattern: `<domain>:v<version>` or `tool:<tool-id>:v<version>`

## Records

### 1) App Preferences

- Key: `sopronwitta:prefs:v1`
- Store: `src/stores/prefsStore.ts`
- Schema: `prefsSchema` (zod)
- Default:
  - `themeMode: "system"`
  - `homeKeyword: ""`
  - `homeCategory: "all"`
  - `recentTools: []`
- Migrate:
  - Try legacy key `sopronwitta:prefs` -> validate with `prefsSchema` -> rewrite to `v1`

### 2) 2048 State

- Key: `sopronwitta:tool:2048:v1`
- Store: `src/stores/game2048Store.ts`
- Schema: `game2048Schema` (zod)
- Default:
  - `board: 4x4 all zero`
  - `score: 0`
  - `best: 0`
  - `won: false`
  - `gameOver: false`
- Write strategy:
  - High frequency updates must use throttled save (`300ms` default)
  - Force save on `beforeUnmount`
- Migrate:
  - Reserved; currently no legacy key

### 3) Links Data

- Key: `sopronwitta:links:v1`
- Store: `src/stores/linksStore.ts`
- Schema: `quickLinkListSchema` (zod)
- Default:
  - `src/data/links.ts` -> `defaultQuickLinks`
- Migrate:
  - Reserved; currently no legacy key

## New Tool Onboarding Checklist

1. Define key in `src/storage/keys.ts`
2. Define zod schema in store (or shared schema module)
3. Implement store with `load/save/reset/migrate`
4. Add migration path from old version keys
5. Use throttled write for high-frequency states
6. Register this record in `storage-contract.md`
