# Claude Code instructions

## Read first

1. `PANTRYOS_IMPLEMENTATION_PLAN.md` — product and architecture source of truth.
2. `AGENTS.md` — repository workflow, working rules, and required verification.
3. `.claude/skills/pantryos-ui` — design system. Required before any UI work.
4. `PANTRYOS_PLAN_REVIEW.md` — audit trail of corrections already applied. Historical context; do not treat as instructions.

This file is orientation only. It does not restate the rules in `AGENTS.md` or the architecture in the plan — where they disagree with this file, they win.

## Context

PantryOS is a WebMCP Challenge submission, due **September 3, 2026, 1:00 PM Pacific**. It is a demo, not a production SaaS. Scope discipline matters more than completeness: if a change does not make the human + agent WebMCP demo better, do not build it.

## Current state

Scaffolded and working:

- Vite + React 19 + strict TypeScript + React Router shell (`src/App.tsx`, `src/main.tsx`)
- Tailwind CSS 4 via `@tailwindcss/vite`, with the paper/copper `@theme` design system
- All six routes exist; every product route is still placeholder copy
- Cloudflare Workers Static Assets configured (`wrangler.jsonc`, serves `dist/`, SPA fallback)
- CI (`npm run verify` + `npm run deploy:dry`) and deploy workflows
- Dependencies installed, including `webmcp-types`
- Design system applied: paper/copper `@theme` tokens in `src/styles.css`, restyled shell
- `src/components/ui/` primitives: `Button`, `CoverageBar`, `FreshnessMarker`, `PageIntro`, `SectionHeading`, `Select`, `TickBox`
- `design/` artboards (7) are the visual source of truth; `design/pantryos-ui.html` is generated and gitignored
- `src/webmcp/` contains the Phase 0 compatibility adapter and one read-only smoke tool

Not built yet:

- Inventory units, schemas, expiry helpers, demo data, persistence, CRUD, and Use First
- `ConfirmationDialog` and `TextField` primitives, and the shared destructive-confirmation surface
- Recipe matching and curated recipe data
- Grocery state and actions
- The ten product WebMCP tools and Agent Activity rail

Phase 1 (inventory/expiry) is in progress on `codex/phase-1-inventory-expiry`, not on `main`. Do not assume `src/domain/`, `src/schemas/`, `src/stores/`, or `src/data/` exist here — on `main` they do not.

## Commands

| Command              | Use                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------- |
| `npm run dev`        | Vite dev server                                                                             |
| `npm run verify`     | format:check → lint → typecheck → test → build. **Required for every implementation task.** |
| `npm run test:watch` | Vitest in watch mode while iterating                                                        |
| `npm run deploy:dry` | Wrangler dry run. Required for deployment/config changes.                                   |

Do not run `npm run deploy` unless explicitly asked.

## Layout

Target structure is defined in plan §5. New code goes in:

```text
src/
  components/{agent,demo,groceries,kitchen,recipes}/
  data/{demo-kitchen,ingredient-aliases,recipes,staples}.ts
  domain/{expiry,groceries,inventory,normalize-ingredient,recipe-matching,units}.ts
  schemas/{grocery,inventory,recipe}.ts
  stores/{agent-activity-store,kitchen-store}.ts
  webmcp/{register-tools,tool-utils,tools}.ts
```

Routes stay thin — they compose components and read stores. Logic belongs in `domain/`, which must stay UI-independent and directly unit-testable.

## UI work

Read `.claude/skills/pantryos-ui` first. In short: compose `components/ui/`
primitives, use `@theme` tokens (no hex, no `rounded-*`), separate sections
with hairline rules rather than bordered cards, one filled copper emphasis
per page, and animate only `opacity`/`transform`.

## Conventions

- Named exports for components (`export function KitchenPage`); default export only for `App`.
- Prettier: double quotes, semicolons, trailing commas. Run `npm run format` before verify if formatting drifts.
- Existing JSX writes props alphabetically. Not lint-enforced, but match it in files that already do.
- Tests live beside their subject (`App.test.tsx`); Vitest + Testing Library with jsdom.

## Gotchas that will bite

- **React StrictMode is on** (`main.tsx`). Effects run twice in dev, so WebMCP registration must clean up via `AbortController` or tools double-register.
- **`registerTool()` is async** and can reject. Await it and surface failures to the WebMCP status indicator.
- **`/debug` is DEV-gated** in `App.tsx` and redirects to `/` in production builds. Do not rely on it for the recorded demo.
- **SPA fallback is configured** (`not_found_handling: "single-page-application"`), so deep links like `/recipes/chicken-saag` work on Cloudflare. Do not switch to `404-page` — it breaks them.
- **Quantities are stored in base units** (`g`, `ml`, `count`) with a separate display unit. Convert at the schema boundary, never in components.
- **Expiry uses calendar-day comparison**, not elapsed hours, or "expires tomorrow" flips during a recording session.
- **Fonts load from Google Fonts** via `index.html`. Newsreader, Karla and IBM Plex Mono — keep the `preconnect` tags or first paint regresses.
- **Demo seed uses a persisted `hasInitialized` sentinel** — never re-seed merely because inventory is empty, or deleted items reappear.
