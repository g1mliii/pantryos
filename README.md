# PantryOS

[![CI](https://github.com/g1mliii/pantryos/actions/workflows/ci.yml/badge.svg)](https://github.com/g1mliii/pantryos/actions/workflows/ci.yml)

PantryOS is a local-first kitchen inventory and recipe demo for the WebMCP Challenge. The human UI and WebMCP tools will operate the same browser-resident state through shared domain actions.

**[Open the live app](https://pantryos.pressplay-subai.workers.dev)**

> Current status: Phases 0 through 3 are implemented and deployed — inventory and expiry, recipe matching, groceries, and ten WebMCP tools backed by the same domain actions as the UI.

## Why WebMCP fits

PantryOS has no account, backend, or cloud database for a server-side integration to query. WebMCP gives a browser-aware agent a structured interface to the local application state instead of relying on brittle UI actuation.

Kitchen data is stored in `localStorage`. PantryOS itself does not upload it, but tool inputs and results may be processed by the browser agent or its AI provider when the user invokes a tool.

Together, a person and their agent can inspect expiring food, find recipes that use it, add only missing ingredients to groceries, update quantities, and confirm destructive removal while both remain synchronized with the visible app.

## Stack

- Vite, React, strict TypeScript, React Router
- Tailwind CSS
- Zustand and `localStorage`
- Zod and date-fns
- WebMCP (`document.modelContext` first)
- Vitest and Testing Library
- Cloudflare Workers Static Assets

## Local development

Requirements: Node 24 and npm.

```bash
npm install
npm run dev
```

Open the URL printed by Vite. The tool surface is described in the [implementation plan](./PANTRYOS_IMPLEMENTATION_PLAN.md).

## WebMCP check

PantryOS registers ten tools over `document.modelContext`; the legacy `navigator.modelContext` path exists only inside one compatibility adapter. Browsers without WebMCP continue to render and navigate normally.

For a compatible Chrome build:

1. Open `chrome://flags/#enable-webmcp-testing`, enable WebMCP testing, and relaunch Chrome.
2. Run `npm run dev -- --host 127.0.0.1`, then open the printed localhost URL.
3. Open `/debug`, pick a tool, and run it. The page calls `document.modelContext.getTools()` and `executeTool()`, so a run there exercises the adapter that reconciles the current Chrome JSON-string and in-app-browser object input forms. The result line names the path that ran; browsers with no page API fall back to the registered callback.
4. Repeat the check on the exact, locked HTTPS deployment hostname after Cloudflare credentials and that hostname are configured.

The former `navigator.modelContextTesting` helper is not used; current Chromium exposes inspection and execution through the standard `document.modelContext` API. `/debug` is development-only and redirects to `/` in production builds.

## Verification

```bash
npm run verify
npm run deploy:dry
```

`verify` checks formatting, lint, TypeScript, tests, and the production build. The dry deployment command validates the Cloudflare asset bundle without publishing it.

## Deployment

The production app is deployed through Cloudflare Workers Static Assets at:

- <https://pantryos.pressplay-subai.workers.dev>

Before publishing, run:

```bash
npm run verify
npm run deploy:dry
npm run deploy
```

Pushes to `main` run CI. The deployment workflow can also publish from GitHub when `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are configured as repository secrets.

## Project documents

- [Implementation plan](./PANTRYOS_IMPLEMENTATION_PLAN.md)
- [Plan audit](./PANTRYOS_PLAN_REVIEW.md)
- [Repository instructions](./AGENTS.md)
- [Submission copy and demo script](./SUBMISSION.md)

## License

[MIT](./LICENSE)
