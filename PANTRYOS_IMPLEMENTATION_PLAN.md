# PantryOS implementation plan

> Execution source of truth. Keep this file concise and update it when an implementation decision changes.

## 1. Goal

Build a polished WebMCP Challenge demo where a person and a browser-aware agent operate the same local kitchen state:

```text
inventory → expiry awareness → recipe matching → missing items → groceries
```

PantryOS has no account, backend, or cloud database. State is stored in `localStorage`. When a user invokes an agent tool, that tool's inputs and results may be processed by the browser agent or its AI provider; do not claim agent processing stays on-device.

## 2. Scope

Build:

- Dashboard with Use First, inventory summary, top recipe matches, groceries, WebMCP status, and compact “Try asking…” examples.
- Kitchen CRUD grouped by fridge, freezer, and pantry.
- Expiry states: expired, today, soon (1–3 days), safe (4+), none.
- 12–15 local recipes with deterministic ingredient matching.
- Grocery checklist and add-missing-items action.
- Ten WebMCP tools and visible Agent Activity.
- Human confirmation before destructive removal.
- First-run demo data and explicit Reset Demo.

Do not build authentication, backend APIs, cloud sync, databases, AI generation, receipt scanning, nutrition, store integrations, scheduled reminders, or a built-in chatbot.

## 3. Stack

- Vite, React, strict TypeScript, React Router.
- Tailwind CSS.
- Zustand `persist` + `localStorage`.
- Zod v4; convert transform-free input schemas to JSON Schema for WebMCP.
- date-fns.
- Vitest + Testing Library.
- Cloudflare Workers Static Assets; no Worker script.
- npm and Node 24.

## 4. Architecture and invariants

```text
Human UI ─┐
          ├─> domain actions ─> Zustand ─> localStorage
WebMCP ───┘
```

- UI and tools call the same domain actions.
- Tool callbacks call `useKitchenStore.getState()` at execution time; never close over state snapshots.
- Register tools only after store hydration and first-run initialization.
- `document.modelContext` is the current API and sole implementation target. If Chrome 149 still requires `navigator.modelContext`, keep it behind one feature-detected compatibility adapter; it is deprecated in Chrome 150, and no feature or tool may call it directly.
- Await `registerTool()` calls and expose unavailable/registering/ready/error status.
- One effect-owned `AbortController` handles registration teardown. Pass execution `{ signal }` to cancellable work.
- The app works normally without WebMCP.
- Tool-domain errors return structured results; unexpected exceptions are caught by the wrapper.
- No secrets or user kitchen data are logged or persisted outside the browser.

## 5. Project layout

```text
src/
  components/{agent,demo,groceries,kitchen,recipes}/
  components/ui/{Button,ConfirmationDialog,CoverageBar,FreshnessMarker,PageIntro,SectionHeading,Select,TextField,TickBox}.tsx
  data/{demo-kitchen,ingredient-aliases,recipes,staples}.ts
  domain/{expiry,groceries,inventory,normalize-ingredient,recipe-matching,units}.ts
  routes/{DashboardPage,DebugPage,GroceriesPage,KitchenPage,RecipeDetailPage,RecipesPage}.tsx
  schemas/{grocery,inventory,recipe}.ts
  stores/{agent-activity-store,confirmation-store,kitchen-store}.ts
  webmcp/{register-tools,tool-utils,tools}.ts
  App.tsx
  main.tsx
  styles.css              # @theme design tokens
design/                   # artboards — visual source of truth
.claude/skills/pantryos-ui/  # design system rules for Claude
```

## 6. Design system

Visual source of truth is `design/*.dc.html` (seven artboards; `design/canvas.json`
lays them out). `.claude/skills/pantryos-ui` carries the full rules — read it
before writing any UI.

- Warm paper ground, copper as the only accent, near-square edges.
- Tokens live in `src/styles.css` under `@theme`. Never write a hex in a component.
- Separation is hairline rules and whitespace, not a bordered card per element.
  One filled block per page, marking the single thing that matters.
- Serif (Newsreader) for cookbook content, sans (Karla) for labels and controls,
  mono (IBM Plex Mono) for tool names only.
- Colour is never the only signal; freshness markers always carry words.

Shared primitives in `src/components/ui/` — `Button`, `ConfirmationDialog`,
`Select`, `TextField`, `SectionHeading`, `FreshnessMarker`, `CoverageBar`,
`TickBox`, `PageIntro`. Screens compose these.
Anything new goes into `components/ui/` and into `design/Components.dc.html`;
never inline a one-off in a route.

The dashboard includes a small editorial “Try asking your agent” section composed
from existing primitives, with no new state or card treatment. Add it to
`design/Main.dc.html` before implementation and show these examples:

- “What's expiring soon?”
- “Find dinner under 30 minutes using what expires first.”
- “Add what I'm missing to groceries.”

Motion: animate only `opacity` and `transform`, 140ms in on `--ease-enter`,
90ms out on `--ease-exit`. Never transition height, top, width or box-shadow.
`Select` defines the keyboard and dismissal contract every menu must match.

## 7. Domain model

```ts
type CanonicalUnit = "g" | "ml" | "count" | "package" | "serving";
type DisplayUnit = CanonicalUnit | "kg" | "l";
type Location = "fridge" | "freezer" | "pantry";

interface InventoryItem {
  id: string;
  name: string;
  normalizedName: string;
  quantity: number;
  canonicalUnit: CanonicalUnit;
  displayUnit: DisplayUnit;
  location: Location;
  expiryDate: string | null; // valid local YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

interface RecipeIngredient {
  name: string;
  normalizedName: string;
  quantity?: number;
  displayUnit?: DisplayUnit;
  optional?: boolean;
}

interface Recipe {
  id: string;
  title: string;
  description: string;
  servings: number;
  totalMinutes: number;
  ingredients: RecipeIngredient[];
  steps: string[];
}

interface GroceryItem {
  id: string;
  name: string;
  normalizedName: string;
  quantity?: number;
  displayUnit?: DisplayUnit;
  checked: boolean;
  sourceRecipeId?: string;
  createdAt: string;
}
```

Rules:

- Convert kg→g and l→ml. Never treat count, package, and serving as interchangeable.
- Generate collision-safe readable ids: `eggs`, `eggs-2`, `eggs-3`.
- Normalize by lowercase, trim, whitespace collapse, simple punctuation removal, then aliases.
- Include `"chicken" → "chicken breast"`. Canned tomato does not satisfy fresh tomato.
- Staples are excluded from missing and coverage: salt, pepper, water, cooking oil, sugar, cumin, turmeric, garam masala, chili powder, coriander.
- Recipe availability is name-based, not quantity-based. Inventory consumption remains quantity-aware.
- Optional ingredients are excluded from missing and coverage and returned separately.
- Expired inventory is visible but never usable for matching.
- Use `differenceInCalendarDays` with locally parsed calendar dates.

## 8. Recipe ranking

For each recipe calculate `have`, `missing`, `optionalMissing`, `expiringUsed`, coverage, and score.

```ts
const rawUrgency = expiringUsed.reduce(
  (sum, item) => sum + 1 / (1 + daysUntilExpiry(item)),
  0,
);
const urgency = maxRawUrgency > 0 ? rawUrgency / maxRawUrgency : 0;
const coverage = denominator > 0 ? haveCount / denominator : 1;
const timeFit = clamp(1 - totalMinutes / 60, 0, 1);

const weights = prioritizeExpiring
  ? { coverage: 0.25, urgency: 0.6, time: 0.15 }
  : { coverage: 0.4, urgency: 0.45, time: 0.15 };
```

Filters: query, max minutes, max missing non-optional/non-staple ingredients, and prioritize expiring. Return at most five results.

Acceptance seed result: Chicken Saag has 5/7 required ingredients, misses only ginger and fresh tomato, uses spinach/chicken/yogurt, takes 27 minutes, and leads the runner-up by at least 0.05. Adjust recipe/seed data rather than formula weights if tuning fails.

## 9. Demo state

On first initialization and Reset Demo, compute expiry dates relative to the current local day:

```text
FRIDGE:  spinach 200 g +1d; chicken breast 600 g +2d;
         Greek yogurt 400 g +3d; milk 1000 ml +5d; eggs 8 count +9d
PANTRY:  basmati rice 1500 g; onion 3 count; garlic 1 count;
         canned tomatoes 2 count; chickpeas 2 count; pasta 500 g;
         olive oil 500 ml
FREEZER: frozen peas 500 g
```

Persist `schemaVersion` and `hasInitialized`. Seed only when `hasInitialized` is false. An intentionally emptied kitchen must remain empty after reload. Reset clears groceries/activity, reloads inventory, and recomputes dates.

## 10. WebMCP tools

| Tool                         | Input                                                            | Notes                                                    |
| ---------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------- |
| `get_inventory`              | location?, includeExpired?                                       | Group/cap results; expose expired bucket when requested. |
| `get_expiring_items`         | withinDays?=3                                                    | Non-expired items within range.                          |
| `add_inventory_item`         | name, quantity, unit, location, expiryDate?                      | Validate date/unit/ranges.                               |
| `consume_inventory_item`     | item? or itemId?, quantity+unit?                                 | Exactly one locator; omitted quantity means all.         |
| `remove_inventory_item`      | item? or itemId?                                                 | Exactly one locator; requires confirmation.              |
| `find_recipes`               | query?, maxMinutes?, maxMissingIngredients?, prioritizeExpiring? | Entry point; at most five, returns recipeId.             |
| `get_recipe`                 | recipeId                                                         | Curated recipe details.                                  |
| `add_grocery_item`           | name, quantity+unit?                                             | Adds one normalized item; existing matches are skipped.  |
| `add_recipe_to_grocery_list` | recipeId                                                         | Adds missing non-staples without duplicates.             |
| `get_grocery_list`           | none                                                             | Compact checklist.                                       |

All tool schemas:

- have concise `title` and descriptions stating when to use and when not to;
- describe every property, reject unknown properties, and bound strings/numbers;
- use enum values for locations and units;
- are validated with Zod even if the browser also validates JSON Schema.

Result contract:

```ts
type ToolResult<T> =
  | { ok: true; summary: string; data: T }
  | { ok: false; summary: string; error: string; details?: unknown };
```

Use current WebMCP annotations only:

- `readOnlyHint`: true for the five read tools, false for writes.
- `untrustedContentHint`: true when output can contain user-authored inventory/grocery strings; false for curated-only output.

Name resolution: exact itemId, exact normalized/aliased name, then unique safe match; multiple matches return candidates, no match recommends `get_inventory`. Quantity and unit must appear together, compatible units are converted, over-consumption reports available quantity, and zero remaining removes the item.

Grocery dedupe key is `normalizedName`. Existing checked or unchecked items remain unchanged and are returned in `skipped` with a reason.
For `add_grocery_item`, quantity and unit are either both present or both omitted; adding multiple named items uses one call per item.

## 11. Destructive confirmation

`remove_inventory_item` opens an accessible page dialog and awaits the human. Only confirmation calls the shared remove action. Decline or execution abort closes the dialog and returns a cancelled/declined result without mutation. The normal UI delete flow reuses the same confirmation component and domain action.

Do not implement or depend on `requestUserInteraction()`; it is not in the current draft baseline.

## 12. Agent Activity

Keep a non-persisted module-level store with tool name, bounded/redacted input, summary, running/success/error status, duration, and timestamp. Mount the panel in the persistent app shell. Never log secrets or full arbitrary user text.

## 13. Canonical demo prompts

1. “I'm leaving Friday. What food should I use before then?”
2. “Find dinner under 30 minutes that uses what expires first and needs at most two new ingredients.” → Chicken Saag.
3. “Show me what I need for the chicken saag.”
4. “Add whatever I'm missing to groceries.” → ginger + fresh tomato.
5. “I used 400 grams of the chicken.” → 600 g to 200 g.
6. “We have two servings of chicken saag left. Add it to the fridge, expires Thursday.”
7. “The spinach went bad, throw it out.” → visible human confirmation.
8. “Add milk and bananas to my grocery list.” → two `add_grocery_item` calls.

## 14. Execution order

### Phase 0 — foundation

- Scaffold and verify Vite/React routes, styling, tests, lint, build, CI, Cloudflare config, README, and license.
- Apply design tokens in `src/styles.css` and build `components/ui/` primitives before any screen work.
- Run a one-tool WebMCP smoke page on a real localhost origin and the locked deployment hostname.
- Test ChatGPT's in-app browser and Chrome `chrome://flags/#enable-webmcp-testing`.
- Inspect and invoke with the standard `document.modelContext.getTools()` / `executeTool()` API. Chromium removed the older `navigator.modelContextTesting` helper.

### Phase 1 — inventory and expiry

- Units, schemas, versioned persisted store, initialization gate, seed/reset.
- CRUD, expiry helpers/badges, Use First, tests. Compose `components/ui/`; match `design/Kitchen.dc.html`.
- Gate: cold load seeds; edits persist; empty stays empty; reset restores current relative dates.

### Phase 2 — recipes and groceries

- Aliases/staples, recipes, matching/ranking/filtering, recipe UI against `design/Recipes.dc.html` and `design/RecipeDetail.dc.html`.
- Grocery CRUD, direct add, add-missing, dedupe, tests.
- Gate: Chicken Saag result matches §8 and repeated grocery add creates no duplicates.

### Phase 3 — WebMCP and polish

- Registration wrapper, ten tools, JSON Schemas, Zod validation, annotations, abort cleanup, status UI.
- Confirmation, Agent Activity rail in the persistent shell, dev-only debug route, direct callback tests and browser tests. Match `design/AgentSurfaces.dc.html`.
- Rehearse tool selection with all eight prompts and refine descriptions.
- Gate: reset and complete the deployed demo three times without cleanup or console errors.

### Phase 4 — submission

- Deploy Cloudflare Workers Static Assets over HTTPS and hard-refresh every route.
- Public repo, detectable MIT license, README, live URL.
- Public YouTube demo under three minutes with audio.
- Devpost description: why WebMCP fits, better UX, human-agent collaboration, implementation.
- Submit before September 3, 2026 at 1:00 PM Pacific / 4:00 PM Eastern.
- Do not modify the submitted repo/site during judging; fork for later work.

## 15. Required checks

`npm run verify` must run formatting check, lint, typecheck, unit/component tests, and production build. CI also runs a Wrangler dry deployment validation.

Definition of done:

- Human UI and tools share domain actions and visibly synchronized state.
- First-run/reset/persistence behavior passes.
- Expiry, matching, ranking, unit, ambiguity, over-consume, and grocery dedupe tests pass.
- All ten tools register after hydration and clean up on abort/remount.
- Tool errors are actionable and no mutation occurs on declined/cancelled removal.
- App works without WebMCP.
- UI uses `components/ui/` primitives and `@theme` tokens; no hex values or `rounded-*` in components.
- All eight prompts pass repeatedly on the deployed URL.
- README privacy language is precise; video claims match the live implementation.

## 16. References

- `design/` artboards and `.claude/skills/pantryos-ui` — visual source of truth
- [Current WebMCP draft](https://webmachinelearning.github.io/webmcp/)
- [Chrome WebMCP imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
- [OpenAI WebMCP Challenge](https://openai.com/webmcp-challenge/)
- [Challenge rules](https://webmcp.devpost.com/rules)
- [Cloudflare SPA assets](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)
