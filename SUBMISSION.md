# PantryOS submission notes

Copy for the Devpost entry, plus the demo script and recording checklist.

## Links

- Live app: <https://pantryos.pressplay-subai.workers.dev>
- Repository: <https://github.com/g1mliii/pantryos>
- YouTube demo: **add after upload and signed-out check**

## Project name

PantryOS

## Tagline

A local-first kitchen where people and browser agents turn expiring food into meals through shared WebMCP actions.

## Short summary

PantryOS lets you and a browser agent work on the same local kitchen state: tracking expiry, saving and matching recipes, updating quantities, planning only the missing groceries, and asking for your approval before anything gets thrown out.

## Devpost description

### The problem

You usually know there's food in the fridge. What you don't know is what's about to go off, or what it adds up to for dinner. Inventory, recipes, and the shopping list normally live in three different places, so not wasting food means remembering dates, comparing ingredients, and copying things across by hand.

PantryOS puts the kitchen state that's already in the browser somewhere both you and your agent can work on it. It tracks food across the fridge, freezer, and pantry, shows what's about to expire, ranks recipes by what you have and what needs using, saves recipes from either the UI or an agent, and keeps a grocery list that doesn't duplicate itself.

### Why WebMCP

Kitchen state is personal, changes constantly, and is already in the page. Doing it the usual way would mean accounts, cloud storage, and a server API in front of them. WebMCP lets PantryOS expose explicit operations over the state that's already in the browser, so the agent can act without clicking through the UI or keeping its own copy of the kitchen.

It's not just a chat box bolted onto an app. An agent can take a recipe from the conversation, save it as real application state, match it against expiring inventory, read the method, scale the missing ingredients to a serving count, and add only what isn't already there. All of it shows up straight away in the interface you're looking at.

### What it's like to use

You can ask for the outcome instead of walking through four screens. "Find dinner under 30 minutes that uses what expires first and needs at most two new ingredients" pulls together live inventory, calendar-day expiry, ingredient aliases, staples, optional ingredients, and the recipe score. The follow-up adds exactly what's missing, without duplicating something already on the list.

Saved recipes carry prep and cook times, ingredient and method sections, step notes, serving scaling, US-to-metric conversion, and optional photos that stay in the browser. The recipe form and the `add_recipe`, `update_recipe`, and `remove_recipe` tools call the same store actions, so either side can manage a saved recipe while built-in recipes remain read-only.

### Sharing control with the agent

The agent reads inventory, expiry, recipes, and groceries, and can add or consume inventory, manage saved recipes, and plan shopping. You keep the visible app and the last word on anything destructive. Binning food or deleting a saved recipe opens the same confirmation dialog the normal UI uses; declining, cancelling, navigating away, or having the target change all leave state alone.

The activity rail shows what's running and what just ran. Both sides go through the same domain actions, so the UI, storage, and tool responses can't drift apart.

### How it's built

Client-only React and TypeScript SPA on Cloudflare Workers Static Assets. Zustand persists inventory, saved recipes, and groceries to `localStorage`. Thirteen imperative WebMCP tools register after hydration through `document.modelContext`, with one isolated adapter for the deprecated navigator surface.

Every input is validated with Zod and published with a matching closed JSON Schema. Callbacks read current Zustand state when they run, return structured results for success and failure, mark user-authored output as untrusted, clean up on abort, and call the same domain actions the UI does. Registration, persistence recovery, payload caps, ambiguous identifiers, bad dates and units, hostile-looking text, deduplication, confirmation races, and every tool's success and error paths are covered by automated regressions. The final release checklist repeats the native WebMCP browser pass against the exact deployed 13-tool build.

PantryOS doesn't upload kitchen data itself. Once you invoke a tool, its inputs and results go through whatever agent or AI provider you're using. Recipe images are a browser upload and never appear in a tool result.

## Common Devpost fields

### Inspiration

Kitchen apps store lists well enough, but you're still the one joining up expiry dates, recipes, quantities, and shopping. The question behind PantryOS was: what changes if the agent can work on the live kitchen model directly, while you keep a clear interface and the final say on anything irreversible?

### What it does

Tracks local inventory and expiry, suggests meals that use food in time, manages rich saved recipes, scales quantities, converts units, and adds only the missing groceries. Thirteen WebMCP tools give an agent the same reads and writes you have, with visible activity and a human confirmation before anything is removed.

### How we built it

React, TypeScript, Vite, React Router, Zustand persistence, Zod, date-fns, Tailwind CSS, Vitest, Testing Library, and Cloudflare Workers Static Assets. The UI and the WebMCP layer meet at shared domain actions instead of each implementing the same rules.

### Challenges we ran into

Most of the difficulty sat between a fast agent workflow and predictable application state: keeping Zod constraints and the published JSON Schema in step, handling input-shape differences between browsers, resolving names without guessing, surviving cancellation and StrictMode remounts, and pausing destructive removal for an on-page decision without leaning on a non-standard interaction API.

### Accomplishments we're proud of

- Thirteen non-trivial tools working against live persisted browser state.
- UI and tools stay in sync because they share domain actions.
- Destructive removal fails closed and needs visible approval.
- Recipes saved from either side take part in matching, scaling, conversion, and grocery planning.
- 149 automated tests pass. The historical native-WebMCP browser pass covers malformed input, cancellation, persistence, confirmation races, payload caps, and adversarial text; the two new saved-recipe lifecycle tools still need their fresh deployed browser pass.

### What we learned

Tools work best when they're neither a hidden API nor a second app. Clear contracts, reading current state, visible activity, and deliberate handoffs let the agent move quickly while you can still see and control what changed.

### What's next

This build stays local-first and client-only on purpose. Opt-in household sharing or import integrations would be the obvious next thing, but the submitted version has no accounts, backend, cloud storage, receipt scanning, or store integrations, which keeps the WebMCP side focused and the demo reproducible.

## Built with

WebMCP, React, TypeScript, Vite, React Router, Zustand, Zod, date-fns, Tailwind CSS, Vitest, Testing Library, Cloudflare Workers Static Assets.

## Judge walkthrough

1. Open the live URL in ChatGPT's in-app browser, or Chrome 149+ with WebMCP testing enabled.
2. Hit **Start demo over** for a clean sample kitchen.
3. Ask: "Find dinner under 30 minutes that uses what expires first and needs at most two new ingredients." Chicken Saag should come first, at 27 minutes with five of seven required ingredients.
4. Ask: "Show me what I need for the chicken saag," then "Add whatever I'm missing to groceries." Ginger and fresh tomato get added once.
5. Ask: "I used 400 grams of the chicken." Chicken goes from 600 g to 200 g in the Kitchen UI.
6. Ask: "The spinach went bad, throw it out." It waits for approval before removing anything.
7. For the creation flow, paste recipe text or attach a recipe card and ask the agent to save it. It should appear on Recipes and be available to `find_recipes`, `get_recipe`, and grocery planning.

## Video plan

Aim for a 2:40–2:50 cut with audio throughout. Record the deployed HTTPS app. Attach the recipe card before recording so upload time and the file picker don't end up in the take.

### Recording fixture

Small enough to read on screen, and the serving conversion is obvious:

```text
Green Yogurt Flatbreads
Serves 2 · Prep 5 minutes · Cook 10 minutes

Ingredients
7 oz spinach
1 cup Greek yogurt
2 flatbreads
1 tsp cumin
1 lemon (optional)

Method
Wilt and chop the spinach.
Stir the spinach, yogurt, and cumin together.
Warm the flatbreads and fill them with the yogurt mixture.
Serve with lemon if using.
```

### 0:00–0:20 — Set it up

Show the dashboard, food expiring in the next few days, the AI panel ready, activity empty.

> "This is PantryOS, a local-first kitchen where you and your browser agent work on the same live inventory. Rather than guessing from the screen, the agent gets thirteen structured WebMCP tools backed by the same actions the interface uses."

### 0:20–0:58 — Conversation into state

With the card already attached:

> "Save this recipe to PantryOS, then show me what you saved."

Show `add_recipe` completing, open Recipes, select Green Yogurt Flatbreads.

> "The agent reads the recipe out of our conversation and saves structured timings, ingredients, and directions into PantryOS. That's persistent application state now, not text stuck in a chat."

### 0:58–1:30 — Scale and convert

On the recipe page, go from two servings to four and switch to metric. Spinach moves from 7 oz to about 397 g, yogurt from 1 cup to 480 ml.

> "The same recipe scales and converts in the human interface. PantryOS knows which ingredients are already here, which are optional, and which are still missing."

### 1:30–1:58 — Only what's missing

> "Add what I'm missing for four servings of that recipe."

Open Groceries: four flatbreads added; spinach and yogurt skipped because they're in the kitchen, cumin skipped as a staple, lemon skipped as optional.

> "It scales the recipe, checks what's in the kitchen, leaves out staples and optional items, and won't duplicate what's already on the list."

### 1:58–2:27 — Keep the human in control

> "The spinach went bad, throw it out."

Show the confirmation and approve it once.

> "The agent can set the action up, but it can't remove food silently. PantryOS stops for the same confirmation the human interface uses."

### 2:27–2:50 — Close

Show Recent AI help, then the live URL and repo.

> "Every tool has a bounded JSON Schema plus Zod validation, reads current state, returns structured errors, and cleans up on abort. PantryOS is a look at how WebMCP can turn an ordinary local-first app into something you and an agent can share."

## Backup flow

If image extraction or agent latency makes the creation sequence flaky while recording, fall back to the first six steps of the judge walkthrough. That path has a fixed seed and has been rehearsed. Don't splice a failed take into the final cut.

## Recording and submission checklist

- Deploy the exact commit before recording.
- Record the deployed HTTPS app, not localhost.
- Fresh demo reset; close private tabs and notifications.
- Keep the cut under 3:00 with clear audio.
- Trim waiting time, but leave enough of each tool call visible to show it's real.
- No browser profiles, credentials, local paths, or private attachments on screen.
- End on the live URL and repo URL.
- Upload to YouTube as **Public** and check it while signed out.
- Add the YouTube URL here, to the README, and to Devpost.
- Check the live app, repo, license, and video links while signed out.
- Confirm the Devpost entry actually reaches **Submitted** before the deadline.
- Once submissions close, don't touch Devpost, the repo, or the live site until winners are announced. Fork it if you want to keep working.
