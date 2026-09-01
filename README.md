# PantryOS

[![CI](https://github.com/g1mliii/pantryos/actions/workflows/ci.yml/badge.svg)](https://github.com/g1mliii/pantryos/actions/workflows/ci.yml)

A local-first kitchen app where you and a browser agent work on the same data. Inventory, expiry dates, recipes, and the grocery list are all in `localStorage`, and WebMCP exposes them to an agent as real tools instead of something to click through.

**[Open PantryOS](https://pantryos.pressplay-subai.workers.dev)**

You usually know there's food in the fridge. What you don't know is what's about to go off, or what you can cook with it tonight without another shop. PantryOS keeps track of that, ranks recipes by what you already have and what needs using first, and puts only the genuinely missing items on the list.

## Try it in 60 seconds

Open the live app in ChatGPT's in-app browser (it speaks WebMCP) and hit **Start demo over** for a clean sample kitchen. Then ask:

1. "Find dinner under 30 minutes that uses what expires first and needs at most two new ingredients."
2. "Show me what I need for the chicken saag."
3. "Add whatever I'm missing to groceries."
4. "I used 400 grams of the chicken."
5. "The spinach went bad, throw it out."

You should get Chicken Saag, then ginger and fresh tomato added once, then chicken dropping from 600 g to 200 g. The last one won't go through until you approve it on screen. Every call shows up in **Recent AI help**, and the Kitchen and Groceries screens update as it happens.

There's also a creation flow: paste or attach a recipe in the conversation and ask the agent to save it. It calls `add_recipe`, and from then on that recipe behaves like any other — it shows up in search, gets matched against your inventory, scales, converts units, and feeds grocery planning. Photos are a browser upload only; they never go back through a tool result.

### Try a deeper multi-step request

For a less scripted test, paste or attach any complete recipe, replace the bracketed details below, and ask:

> Save this recipe for **[dish]** for **[number] servings**. Before planning my shopping, check what is already in my kitchen and how soon those ingredients expire. Reuse anything that is still usable, tell me when freshness cannot be determined because an item has no expiry date, and add only the missing required ingredients to my grocery list. Do not add optional ingredients or duplicate anything already listed.

This tests whether the agent can carry context across a real workflow rather than handle one isolated command. In **Recent AI help**, you should see it check the kitchen with `get_inventory`, save the structured recipe with `add_recipe`, and plan only its missing groceries with `add_recipe_to_grocery_list`. Exact ingredients will vary with the recipe and current kitchen state; the important outcome is that usable food is reused, expired food is excluded, optional ingredients stay optional, and the grocery list is deduplicated.

Continue in the same conversation to test saved-recipe management: ask it to change a serving count, ingredient, or direction, then ask it to delete the saved recipe when you are finished. The edit should use `update_recipe` without changing the recipe ID. The deletion should use `remove_recipe`, pause for your on-screen approval, and leave any groceries you already planned intact. The same **Edit recipe** and **Delete recipe** controls appear on saved recipe pages; PantryOS's built-in recipes stay read-only so Reset Demo remains deterministic.

## Why WebMCP

The kitchen state is personal, changes constantly, and already lives in the page. Doing this the usual way would mean accounts, a database, and an API to put in front of it. WebMCP skips all that: the agent calls validated operations against the state that's already in the browser, so there's no scraping and no second copy of the data to keep in sync.

```text
Human interface ─┐
                 ├─> shared domain actions ─> Zustand ─> localStorage
WebMCP tools ────┘
```

There's no account, backend, or cloud database. PantryOS doesn't upload anything itself, but once you invoke a tool, its inputs and results go through whatever agent or AI provider you're using.

## How the two sides share state

- You can add, edit, consume, or bin inventory; save recipes with photos; scale servings; switch units; manage groceries.
- The agent can read inventory and expiry, find, save, edit, and delete saved recipes, consume or add inventory, and plan groceries.
- Both go through the same domain actions, so neither keeps its own copy of the kitchen.
- Throwing something out or deleting a saved recipe always opens the normal confirmation dialog. Declining it, cancelling, navigating away, or having the target change underneath all leave state alone.
- The activity rail shows recent tool runs without storing prompt text or secrets.

## Tools

| Capability                  | Tools                                                                        |
| --------------------------- | ---------------------------------------------------------------------------- |
| Read the kitchen            | `get_inventory`, `get_expiring_items`                                        |
| Change inventory            | `add_inventory_item`, `consume_inventory_item`, `remove_inventory_item`      |
| Discover and manage recipes | `find_recipes`, `get_recipe`, `add_recipe`, `update_recipe`, `remove_recipe` |
| Plan shopping               | `get_grocery_list`, `add_grocery_item`, `add_recipe_to_grocery_list`         |

All thirteen of them:

- register only after persisted state has hydrated;
- prefer `document.modelContext`, with one isolated adapter for the deprecated navigator surface;
- validate input with Zod and publish a matching closed JSON Schema;
- read current Zustand state when they run, not when they were registered;
- return structured results for both success and failure;
- clean up on abort and fail closed around destructive confirmation;
- flag anything that could contain user-authored text as untrusted.

## What's in it

- Inventory across fridge, freezer, and pantry, with expiry compared by calendar day so "expires tomorrow" doesn't flip mid-session.
- Recipe ranking from coverage, expiry urgency, cooking time, and how much is missing. Same inputs, same order, every time.
- Saved recipes stored alongside the built-in ones, with timings, ingredient and method sections, step notes, and optional compressed photos.
- Serving scaling, plus US-to-metric mass and volume conversion.
- Grocery suggestions that tell you which expiring ingredients a meal uses, and add only the missing non-staples without duplicating what's already on the list.
- A fixed first-run dataset and an explicit reset, so a demo can be run twice and behave the same.
- Normal browsing and kitchen management still work when WebMCP isn't available.

## Stack

Vite, React, TypeScript (strict), React Router, Tailwind CSS, Zustand + `localStorage`, Zod, date-fns, WebMCP, Vitest, Testing Library, Cloudflare Workers Static Assets.

## Running it

Needs Node 24 and npm.

```bash
npm install
npm run dev -- --host 127.0.0.1
```

Open the URL Vite prints. It's client-only — no account, database, env file, or API key.

## Inspecting the tools

ChatGPT's in-app browser supports WebMCP directly. On a recent Chrome:

1. Open `chrome://flags/#enable-webmcp-testing`, turn it on, relaunch.
2. Start the dev server and open the localhost URL.
3. Go to `/debug`, pick a tool, run it. That page uses `document.modelContext.getTools()` and `executeTool()` against the same registered tools as everything else.
4. Do the final pass against the deployed HTTPS origin, not localhost.

The old `navigator.modelContextTesting` helper isn't used. `/debug` is dev-only and redirects to `/` in production builds.

## Tests

```bash
npm run verify
npm run deploy:dry
```

`verify` runs Prettier, ESLint, `tsc`, the test suite (31 files, 149 tests), and a production build. `deploy:dry` checks the Cloudflare asset bundle without publishing.

## Deploying

Cloudflare Workers Static Assets, at <https://pantryos.pressplay-subai.workers.dev>.

```bash
npm run verify
npm run deploy:dry
npm run deploy
```

Pushes to `main` run CI. The deploy workflow can publish from GitHub too, if `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are set as repository secrets.

## Also here

- [Submission copy and demo script](./SUBMISSION.md)
- [Repository conventions](./AGENTS.md)

## License

[MIT](./LICENSE)
