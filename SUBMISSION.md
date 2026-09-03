# PantryOS submission notes

Copy for the Devpost entry, plus the demo script and recording checklist.

## Links

- Live app: <https://pantryos.pressplay-subai.workers.dev>
- Repository: <https://github.com/g1mliii/pantryos>
- Vimeo demo: <https://vimeo.com/1223495411>

## Final submission status

- [x] Deployed HTTPS app is live.
- [x] Public repository and visible MIT license are live.
- [x] The deployed page exposes all fourteen WebMCP tools from the final commit.
- [x] Public Vimeo video plays while signed out.
- [ ] Vimeo video is embedded on Devpost and plays in the submission preview.
- [ ] Devpost entry shows the terminal **Submitted** state.

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

Client-only React and TypeScript SPA on Cloudflare Workers Static Assets. Zustand persists inventory, saved recipes, and groceries to `localStorage`. Fourteen imperative WebMCP tools register after hydration through `document.modelContext`, with one isolated adapter for the deprecated navigator surface.

Every input is validated with Zod and published with a matching closed JSON Schema. Callbacks read current Zustand state when they run, return structured results for success and failure, mark user-authored output as untrusted, clean up on abort, and call the same domain actions the UI does. Registration, persistence recovery, payload caps, ambiguous identifiers, bad dates and units, hostile-looking text, deduplication, confirmation races, and every tool's success and error paths are covered by automated regressions.

PantryOS doesn't upload kitchen data itself. Once you invoke a tool, its inputs and results go through whatever agent or AI provider you're using. Recipe images are a browser upload and never appear in a tool result.

## Common Devpost fields

### Inspiration

Kitchen apps store lists well enough, but you're still the one joining up expiry dates, recipes, quantities, and shopping. The question behind PantryOS was: what changes if the agent can work on the live kitchen model directly, while you keep a clear interface and the final say on anything irreversible?

### What it does

Tracks local inventory and expiry, suggests meals that use food in time, manages rich saved recipes, scales quantities, converts units, and adds only the missing groceries. Fourteen WebMCP tools give an agent the same reads and writes you have, with visible activity, tightly scoped navigation, and a human confirmation before anything is removed.

### How we built it

React, TypeScript, Vite, React Router, Zustand persistence, Zod, date-fns, Tailwind CSS, Vitest, Testing Library, and Cloudflare Workers Static Assets. The UI and the WebMCP layer meet at shared domain actions instead of each implementing the same rules.

### Challenges we ran into

Most of the difficulty sat between a fast agent workflow and predictable application state: keeping Zod constraints and the published JSON Schema in step, handling input-shape differences between browsers, resolving names without guessing, surviving cancellation and StrictMode remounts, and pausing destructive removal for an on-page decision without leaning on a non-standard interaction API.

### Accomplishments we're proud of

- Fourteen tools working against live persisted browser state, including tightly scoped navigation to PantryOS views and exact recipes.
- UI and tools stay in sync because they share domain actions.
- Destructive removal fails closed and needs visible approval.
- Recipes saved from either side take part in matching, scaling, conversion, and grocery planning.
- 153 automated tests cover the fourteen-tool build. The broader native-browser checklist covers malformed input, cancellation, persistence, confirmation races, payload caps, and adversarial text.

### What we learned

Tools work best when they're neither a hidden API nor a second app. Clear contracts, reading current state, visible activity, and deliberate handoffs let the agent move quickly while you can still see and control what changed.

### What's next

This build stays local-first and client-only on purpose. Opt-in household sharing or import integrations would be the obvious next thing, but the submitted version has no accounts, backend, cloud storage, receipt scanning, or store integrations, which keeps the WebMCP side focused and the demo reproducible.

## Built with

WebMCP, React, TypeScript, Vite, React Router, Zustand, Zod, date-fns, Tailwind CSS, Vitest, Testing Library, Cloudflare Workers Static Assets.

## Judge walkthrough

1. Open the live URL in an AI agent desktop application with a WebMCP-capable built-in browser. Judges can use ChatGPT's in-app browser, or Chrome 149+ with WebMCP testing enabled.
2. Hit **Start demo over** for a clean sample kitchen.
3. Ask: "Find dinner under 30 minutes that uses what expires first and needs at most two new ingredients." Chicken Saag should come first, at 27 minutes with five of seven required ingredients.
4. Ask: "Show me what I need for the chicken saag," then "Add whatever I'm missing to groceries." Ginger and fresh tomato get added once.
5. Ask: "I used 400 grams of the chicken." Chicken goes from 600 g to 200 g in the Kitchen UI.
6. Ask: "The spinach went bad, throw it out." It waits for approval before removing anything.
7. For the creation flow, paste recipe text or attach a recipe card and ask the agent to save it. It should appear on Recipes and be available to `find_recipes`, `get_recipe`, and grocery planning.

## Video plan

Aim for a 2:40–2:45 final cut so there is comfortable room below the three-minute limit. Record the deployed HTTPS app as six short clips, then trim and join them. Narrate the finished video clearly; do not add music.

Use the self-authored text fixture below as the reliable main take. Paste it into the AI conversation or turn it into a plain recipe-card image you own. If using an image, attach it before rolling so the file picker and upload time are not recorded.

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

### OBS setup

- Set both canvas and output to 1920×1080 at 30 FPS.
- Capture the whole display if the AI conversation and built-in browser share one desktop window. This is the safest way to keep tool results and PantryOS confirmation dialogs in frame.
- Record the microphone and confirm its meter moves without clipping. Make a ten-second test recording and listen to it before the real take.
- Record to MKV so a crash does not ruin the take, then use **File → Remux Recordings** to create the MP4 for editing or upload.
- Hide notifications, bookmarks, account details, private tabs, local paths, and unrelated desktop icons. Use a clean browser window at a readable zoom.
- Record each section below as a separate clip with three seconds of stillness at the beginning and end. Re-record only the clip that goes wrong.

### Before the first clip

1. In the ChatGPT desktop application, open a fresh chat but do not send anything yet.
2. In the built-in browser, open PantryOS once and select **Start demo over**. Confirm the fixture has 600 g chicken, 200 g spinach, 400 g Greek yogurt, no groceries, and no saved Green Yogurt Flatbreads recipe.
3. Return to the empty ChatGPT chat. Keep the PantryOS browser tab available throughout the recording.
4. Copy the connection prompt and recipe fixture somewhere private so you can paste them quickly without showing notes on screen.
5. Rehearse the exact flow once, reset PantryOS again, and then record the clean clips.

### Clip 1 · 0:00–0:22 — Connect ChatGPT to PantryOS

**Show ChatGPT:** Start on the fresh desktop chat. Paste and send:

> "Open https://pantryos.pressplay-subai.workers.dev in the built-in browser and use its site tools."

Show the built-in browser opening PantryOS. Pause briefly on the dashboard with expiring food visible and the AI panel reporting that the assistant is ready.

**Narrate:**

> "This is PantryOS, a local-first kitchen where ChatGPT and I work on the same live inventory. Its structured WebMCP tools call the same actions as the visible app."

### Clip 2 · 0:22–1:00 — Save and open a recipe

**Show ChatGPT:** Paste the Green Yogurt Flatbreads fixture from above and send:

> "Save this recipe to PantryOS, then show me what you saved."

Show `add_recipe` completing, then show the built-in browser automatically opening the newly saved Green Yogurt Flatbreads recipe.

**Narrate:**

> "ChatGPT turns the recipe from our conversation into structured PantryOS data. The same tool saves it to persistent browser state and takes me directly to the new recipe."

### Clip 3 · 1:00–1:27 — Use the human interface

**Show PantryOS:** On the saved recipe page, change two servings to four, then switch the units to metric. Pause on the changed amounts: spinach becomes about 397 grams and yogurt becomes 480 millilitres.

**Narrate:**

> "I can keep working in the normal interface. PantryOS scales the recipe from two servings to four and converts the original US measurements to metric."

### Clip 4 · 1:27–1:57 — Let the agent plan the groceries

**Show ChatGPT:** Return to the same conversation and send:

> "Add what I'm missing for four servings of that recipe."

Show ChatGPT completing `add_recipe_to_grocery_list`.

**Then show PantryOS:** Open Groceries and show that four flatbreads were added. Spinach and yogurt were skipped because they are already in the kitchen, cumin was skipped as a staple, and lemon was skipped because it is optional.

**Narrate:**

> "The agent carries the recipe context forward, checks the live kitchen, and adds only what is missing. It leaves out food I already have, staples, optional ingredients, and anything already on the list."

### Clip 5 · 1:57–2:27 — Hand control back to the person

**Show ChatGPT:** Send:

> "The spinach went bad. Throw it out."

Show the removal tool waiting for approval, then switch to the PantryOS confirmation dialog.

**Show PantryOS:** Personally select the confirmation button once. Show the successful result and the updated Kitchen screen.

**Narrate:**

> "ChatGPT can prepare the change, but it cannot silently remove food. PantryOS hands the decision back to me and changes the kitchen only after I approve it on the page."

### Clip 6 · 2:27–2:47 — Show the shared history and close

**Show PantryOS:** Display Recent AI help with the saved recipe, grocery planning, and removal actions. Finish with the live URL and repository visible long enough to read.

**Narrate:**

> "The conversation, the interface, and the activity history all reflect the same browser state because they use the same PantryOS actions. That's what WebMCP adds: a real product that a person and an agent can use together."

## Backup flow

If image extraction is unreliable, paste the exact text fixture instead; this still demonstrates the `add_recipe` workflow. If a tool call is slow, record the prompt and completed result as adjacent clips while keeping the true result visible—do not recreate or fake output. The fixed-seed Chicken Saag flow in the judge walkthrough is the final fallback, but keep the scaling or missing-only grocery section so a Phase 5/6 differentiator remains visible.

## Recording and submission checklist

- Deploy the exact commit before recording.
- Record the deployed HTTPS app, not localhost.
- Fresh demo reset; close private tabs and notifications.
- Keep the final cut below 3:00, with clear English narration and no unlicensed music or third-party recipe-card artwork. The published cut is 2:55.
- Trim waiting time, but leave enough of each tool call visible to show it's real.
- No browser profiles, credentials, local paths, or private attachments on screen.
- End on the live URL and repo URL.
- Upload to Vimeo as **Public**, allow embedding, and check it while signed out.
- Add the Vimeo URL here, to the README, and to Devpost.
- Check the live app, repo, license, and video links while signed out.
- Confirm the Devpost entry actually reaches **Submitted** before September 3, 2026 at 1:00 PM PDT / 4:00 PM Toronto time. A saved draft is not submitted.
- Once submissions close, don't touch Devpost, the repo, or the live site until winners are announced. Fork it if you want to keep working.
