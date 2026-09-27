<h1 align="center">PantryOS</h1>

<p align="center">
  <b>The kitchen you and your AI agent share.</b><br />
  Inventory, recipes and groceries in one local-first app, driven by hand or by any agent through WebMCP.
</p>

<p align="center">
  <a href="https://pantryos.pressplay-subai.workers.dev"><img src="https://img.shields.io/badge/Open_PantryOS-live_app-2F5D50?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Open PantryOS" /></a>
  <a href="https://vimeo.com/1223495411"><img src="https://img.shields.io/badge/Watch_the_demo-2:55-1AB7EA?style=for-the-badge&logo=vimeo&logoColor=white" alt="Watch the 2:55 demo" /></a>
</p>

<p align="center">
  <a href="https://github.com/g1mliii/pantryos/actions/workflows/ci.yml"><img src="https://github.com/g1mliii/pantryos/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <img src="https://img.shields.io/badge/WebMCP-14_tools-2F5D50?style=flat-square" alt="14 WebMCP tools" />
  <img src="https://img.shields.io/badge/local--first-no_account-2F5D50?style=flat-square" alt="Local-first, no account" />
  <a href="LICENSE"><img src="https://img.shields.io/github/license/g1mliii/pantryos?style=flat-square&color=2F5D50" alt="Licence" /></a>
</p>

---

PantryOS is a local-first kitchen manager where people and browser agents share the same inventory, recipes, and grocery list through WebMCP.

## What it does

- Tracks fridge, freezer, and pantry inventory with expiry dates.
- Ranks recipes by available food, expiry urgency, time, and missing ingredients.
- Saves and scales recipes, converts units, and adds only missing groceries.
- Lets an agent work through 14 validated WebMCP tools while every change stays visible in the interface.

Inventory, saved recipes, and groceries remain in browser `localStorage`. PantryOS has no account, backend, or cloud database. Tool inputs and results still pass through the agent provider when a tool is invoked.

## Try it

Open the live app in ChatGPT's in-app browser and select **Start demo over**. Then ask:

1. “Find dinner under 30 minutes that uses what expires first and needs at most two new ingredients.”
2. “Show me what I need for the chicken saag and add whatever is missing to groceries.”
3. “I used 400 grams of chicken.”
4. “The spinach went bad. Throw it out.”

PantryOS should rank Chicken Saag first, add ginger and fresh tomato once, reduce the chicken from 600 g to 200 g, and require on-screen approval before removing the spinach. Recent tool activity appears in **Recent AI help**.

You can also paste a complete recipe into the conversation and ask the agent to save it. Saved recipes participate in matching, scaling, conversion, editing, and grocery planning like built-in recipes.

## Why WebMCP

The interface and the tools call the same domain actions, so the person and agent never maintain separate copies of the kitchen. Tools read current state when called, publish closed JSON Schemas matching their Zod validation, return structured results, and clean up on cancellation. Destructive inventory and recipe removals always pause for human confirmation.

| Capability        | WebMCP tools                                                                 |
| ----------------- | ---------------------------------------------------------------------------- |
| Read inventory    | `get_inventory`, `get_expiring_items`                                        |
| Change inventory  | `add_inventory_item`, `consume_inventory_item`, `remove_inventory_item`      |
| Work with recipes | `find_recipes`, `get_recipe`, `add_recipe`, `update_recipe`, `remove_recipe` |
| Plan groceries    | `get_grocery_list`, `add_grocery_item`, `add_recipe_to_grocery_list`         |
| Navigate          | `navigate_pantryos`                                                          |

## Development

Requires Node 24 and npm.

```bash
npm install
npm run dev -- --host 127.0.0.1
```

```bash
npm run verify
npm run deploy:dry
```

`verify` runs formatting, linting, type checking, 153 tests, and a production build. The app is a client-only React and TypeScript SPA deployed with Cloudflare Workers Static Assets.

## License

[MIT](./LICENSE)
