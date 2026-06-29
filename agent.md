# Codex Agent Guide

## 1. Mission
- This repository is a personal toolbox SPA named `Sopronwitta`.
- The site targets static deployment on GitHub Pages.
- The homepage is a tool navigation dashboard, and each tool should stay modular and independently evolvable.
- Content such as tools, prompts, and links must stay configuration-driven instead of being hardcoded into page structure.

## 2. Stack And Runtime
- Frontend: `Vue 3 + TypeScript + Vite`
- Routing: `Vue Router` with `createWebHashHistory()`
- Styling: `Tailwind CSS`
- Validation: `zod`
- Deployment: `GitHub Pages + GitHub Actions`
- WASM artifacts live in `public/wasm/`, with Rust source in `wasm/zhushen-core/`

## 3. Project Structure
```text
src/
  app/                # routes and route meta
  domains/            # business domains, pages, engines, services
  shared/             # shared UI, style, schema, persistence, utils, types
  config/             # runtime config
  data/               # tools, prompts, links and related schemas
  types/              # shared type definitions
docs/                 # canonical documentation entry
public/wasm/          # published wasm assets
wasm/zhushen-core/    # rust source
```

## 4. Non-Negotiable Engineering Rules
- Keep route metadata configurable in `route-meta`-style files and include at least `title`, `icon`, `permission`, and `order`.
- Prefer data changes over page-structure changes when adding or updating tools, prompts, or links.
- Validate runtime data for `tools`, `prompts`, and `links` with `zod`.
- Keep tools loosely coupled. A tool must not depend directly on another tool's private implementation.
- Split each tool into at least a view layer and a logic layer.
- Prefer Composition API primitives first. Introduce `Pinia` only when state complexity justifies it.
- Shared structures belong in `src/types/` or the corresponding shared layer, not inside a single feature.
- Do not commit `.env*`, secrets, tokens, or private keys.
- Preference state should be managed through `useAppPrefs` when applicable.

## 5. Naming Conventions
- Vue components: `PascalCase.vue`
- composables: `useXxx.ts`
- tool directories: `kebab-case`

## 6. UX And Visual Constraints
- Follow a Raycast-like direction: command-center feel, high information density, strong scanability.
- Support both light and dark themes, with system/browser theme following as the default behavior.
- Theme values must come from shared tokens. Do not hardcode component theme colors.
- Reuse `src/shared/style/tokens.css` and `src/shared/style/components.css` as the style baseline.
- Glass treatment means transparent layers, blur, thin borders, and restrained shadows.
- Do not fake glass with solid filled panels, and do not use `color-mix(...)` as the main glass implementation.
- Search must remain a first-screen, high-priority element on the homepage.
- Avoid marketing-style hero layouts and excessive whitespace.
- Preserve full interaction states: `hover`, `focus`, `active`, and `disabled`.
- Maintain clear keyboard accessibility with `focus-visible`.

## 7. Motion And Blob System
- Motion should be continuous, restrained, and readable.
- Keep animated background layers under content layers.
- Reuse the existing blob abstractions:
  - `BlobLayer.vue`
  - `useBlobMotion.ts`
- Do not hand-roll duplicate blob DOM or randomization logic in pages.
- Prefer segmented loop trajectories and staggered timing instead of synchronous linear back-and-forth motion.

## 8. TypeScript Documentation Rules
- Every `*.ts` file must have a module header JSDoc with `@file` and `@description`.
- Every exported function, interface, API wrapper, and composable must have valid JSDoc.
- JSDoc must include `@param` and `@returns`. Use `@returns {void}` when no value is returned.
- If a function can throw, document that with `@throws` or `@exception`.
- JSDoc must stay consistent with implementation changes.

## 9. Documentation Discipline
- Treat `docs/README.md` as the canonical documentation entry point.
- After code changes, update documentation when behavior, architecture, storage, schema, UI semantics, styles, or external interfaces change.
- Prefer updating existing docs in `README.md` or `docs/` first.
- If existing documents do not cover the change, add new documentation under `docs/`.
- Temporary optimization notes belong in `README.md` only for the current round, and completed work should move to `docs/archive/completed-work-archive.md`.

## 10. Delivery Checklist
- Run `npm install` when dependencies are needed.
- Local development: `npm run dev`
- Production build must pass with `npm run build`.
- Before finishing a change, verify:
  - the build succeeds
  - key pages do not white-screen
  - the browser console is clean
  - `vite.config.ts` `base` matches the GitHub Pages repository name

## 11. Current Product Scope
- Homepage tool navigation with search and categories
- Prompt templates with search and copy
- Grouped common links
- `诸神皇冠培养模拟器` with Worker and WASM support

## 12. Source Priority
- Use `README.md` for project facts and entry points.
- Use `docs/README.md` for the documentation map.
- Use this `agent.md` as the Codex execution guide derived from those project sources and the prior vibe-coding rules.
