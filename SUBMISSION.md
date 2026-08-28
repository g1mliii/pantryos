# PantryOS submission

## Links

- Live app: <https://pantryos.pressplay-subai.workers.dev>
- Public repository: <https://github.com/g1mliii/pantryos>
- Demo video: add the public YouTube URL after upload

## Tagline

A local-first kitchen where people and browser agents share the same inventory, recipe, expiry, and grocery actions through WebMCP.

## Devpost description

PantryOS turns the kitchen state already in your browser into a shared workspace for you and your agent. It tracks food across the fridge, freezer, and pantry, makes expiry visible, ranks recipes by what you have and what should be used first, and maintains a deduplicated grocery checklist.

### Why WebMCP fits

Kitchen state is personal, frequently changing, and already present in the web app. A conventional server integration would require accounts, cloud storage, and a separate API. WebMCP lets PantryOS expose a structured tool surface directly from the page, so an agent can work with the same browser-resident state the person sees without brittle clicking or screen scraping.

### A better user experience

People can ask for an outcome instead of manually crossing several screens. For example, the agent can find a dinner under 30 minutes that prioritizes expiring food, explain what is missing, and add only those missing ingredients to groceries. The UI updates immediately because the agent tools and human controls call the same domain actions.

### Human-agent collaboration

The agent can read inventory, expiry, recipes, and groceries; add or consume inventory; and build the grocery list. The person stays in control of destructive actions: removing inventory opens the same accessible confirmation dialog used by the normal UI, and declining or cancelling leaves state unchanged. A persistent Agent Activity rail makes tool execution visible.

### Implementation

PantryOS is a client-only React and TypeScript SPA deployed with Cloudflare Workers Static Assets. Zustand persists kitchen state in `localStorage`. Ten imperative WebMCP tools register after hydration through `document.modelContext`, with one isolated compatibility adapter for the deprecated navigator surface. Every input is validated with Zod and published with a matching JSON Schema. Tool callbacks read current Zustand state at execution time, return structured results, respect abort cleanup, and share the same tested domain actions as the UI.

PantryOS itself does not upload kitchen data. When a WebMCP tool is invoked, its inputs and results may be processed by the browser agent or its AI provider.

## Suggested technologies

WebMCP, React, TypeScript, Vite, Zustand, Zod, Tailwind CSS, Vitest, Cloudflare Workers Static Assets.

## Judge walkthrough

1. Open the live URL in ChatGPT's in-app browser or Chrome 149+ with WebMCP testing enabled.
2. Choose **Reset Demo** to restore the deterministic sample kitchen.
3. Ask: “Find dinner under 30 minutes that uses what expires first and needs at most two new ingredients.” Chicken Saag should lead.
4. Ask: “Show me what I need for the chicken saag,” then “Add whatever I'm missing to groceries.” Ginger and fresh tomato should be added once.
5. Ask: “I used 400 grams of the chicken.” Chicken should change from 600 g to 200 g.
6. Ask: “The spinach went bad, throw it out.” Confirm that PantryOS waits for visible human approval before removal.

## Under-three-minute demo script

Target length: 2:40–2:50, with spoken audio throughout.

### 0:00–0:18 — Problem and promise

“This is PantryOS, a local-first kitchen where you and your browser agent work with the same inventory. Instead of asking an agent to guess from the screen, PantryOS exposes ten structured WebMCP tools backed by the exact actions used by the UI.”

Show the dashboard, Use First list, WebMCP ready state, and Agent Activity rail.

### 0:18–0:52 — Expiry-aware planning

Ask: “I'm leaving Friday. What food should I use before then?”

“The agent reads live browser-resident inventory and returns expiring food. There is no account or kitchen database on a server.”

Ask: “Find dinner under 30 minutes that uses what expires first and needs at most two new ingredients.” Open Chicken Saag from the result.

### 0:52–1:28 — Recipes to groceries

“Recipe ranking combines ingredient coverage, expiry urgency, and time. Chicken Saag uses five of seven required ingredients and needs only ginger and fresh tomato.”

Ask: “Add whatever I'm missing to groceries.” Open Groceries and show the two additions. Repeat the request or action once to show that duplicates are skipped.

### 1:28–1:58 — Shared state

Ask: “I used 400 grams of the chicken.” Navigate to Kitchen and show chicken changing from 600 grams to 200 grams.

“The conversation and visible interface stay synchronized because both call the same quantity-aware domain action.”

### 1:58–2:25 — Human control

Ask: “The spinach went bad, throw it out.”

“Destructive removal cannot happen silently. The tool opens the same accessible confirmation dialog used by the UI.”

Decline once to show no mutation, repeat, then confirm.

### 2:25–2:48 — Implementation and close

Show Agent Activity and briefly scroll the debug registry in a development build if needed.

“Each tool has bounded JSON Schema plus Zod validation, structured errors, current-state reads, and abort cleanup. PantryOS shows how WebMCP can make an ordinary local-first web app meaningfully better when a person and agent collaborate.”

End on the live URL and repository URL.

## Recording and submission checklist

- Record the exact deployed HTTPS app, not localhost.
- Keep the final cut below 3:00 and include clear spoken audio.
- Do not show browser profiles, credentials, notifications, or private tabs.
- Upload to YouTube with **Public** visibility and verify it while signed out.
- Put the live URL, repository URL, and YouTube URL into Devpost.
- Verify the submitted entry has a terminal submitted state before the deadline.
- After submission closes, do not modify Devpost, the repository, or the live site until judging ends.
