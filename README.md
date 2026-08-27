# PantryOS

[![CI](https://github.com/g1mliii/pantryos/actions/workflows/ci.yml/badge.svg)](https://github.com/g1mliii/pantryos/actions/workflows/ci.yml)

PantryOS is a local-first kitchen inventory and recipe demo for the WebMCP Challenge. The human UI and WebMCP tools will operate the same browser-resident state through shared domain actions.

> Current status: Phase 0 is implemented — the design system, the shared UI primitives, and a read-only WebMCP smoke tool. The product routes are still placeholders. Inventory/expiry, recipe matching, groceries, and the ten product WebMCP tools remain to be built.

## Why WebMCP fits

PantryOS has no account, backend, or cloud database for a server-side integration to query. WebMCP gives a browser-aware agent a structured interface to the local application state instead of relying on brittle UI actuation.

Kitchen data is stored in `localStorage`. PantryOS itself does not upload it, but tool inputs and results may be processed by the browser agent or its AI provider when the user invokes a tool.

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

Open the URL printed by Vite. Product WebMCP tools will be added during Phase 3 of the [implementation plan](./PANTRYOS_IMPLEMENTATION_PLAN.md).

## WebMCP smoke check

Phase 0 registers exactly one read-only tool, `pantryos_foundation_smoke`. It accepts no arguments and does not read or change kitchen data. Registration uses `document.modelContext`; the legacy `navigator.modelContext` path exists only inside one compatibility adapter. Browsers without WebMCP continue to render and navigate normally.

For a compatible Chrome build:

1. Open `chrome://flags/#enable-webmcp-testing`, enable WebMCP testing, and relaunch Chrome.
2. Run `npm run dev -- --host 127.0.0.1`, then open the printed localhost URL.
3. Open `/debug` and select **Inspect and run smoke tool**. The page calls `document.modelContext.getTools()` and `executeTool()`; one adapter contains the current Chrome JSON-string and in-app-browser object input difference.
4. Repeat the check on the exact, locked HTTPS deployment hostname after Cloudflare credentials and that hostname are configured.

The former `navigator.modelContextTesting` helper is not used; current Chromium exposes inspection and execution through the standard `document.modelContext` API.

## Verification

```bash
npm run verify
npm run deploy:dry
```

`verify` checks formatting, lint, TypeScript, tests, and the production build. The dry deployment command validates the Cloudflare asset bundle without publishing it.

## Deployment

The production workflow builds and deploys the `dist/` SPA through Cloudflare Workers Static Assets. Add these GitHub repository secrets before expecting automatic deployment:

- `CLOUDFLARE_API_TOKEN` — a narrowly scoped Workers edit token.
- `CLOUDFLARE_ACCOUNT_ID` — the target Cloudflare account.

Pushes to `main` run CI. The deployment workflow also runs on `main`, but its publish step safely skips while either Cloudflare secret is absent. It can also be started manually.

Once a permanent hostname is chosen, record it in the repository/environment configuration and test that exact HTTPS origin. A temporary Wrangler preview URL does not satisfy the locked-hostname gate.

## Project documents

- [Implementation plan](./PANTRYOS_IMPLEMENTATION_PLAN.md)
- [Plan audit](./PANTRYOS_PLAN_REVIEW.md)
- [Repository instructions](./AGENTS.md)

## License

[MIT](./LICENSE)
