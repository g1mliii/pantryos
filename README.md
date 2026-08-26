# PantryOS

[![CI](https://github.com/g1mliii/pantryos/actions/workflows/ci.yml/badge.svg)](https://github.com/g1mliii/pantryos/actions/workflows/ci.yml)

PantryOS is a local-first kitchen inventory and recipe demo for the WebMCP Challenge. The human UI and WebMCP tools will operate the same browser-resident state through shared domain actions.

> Current status: repository foundation and deployment pipeline are ready; product features are not implemented yet.

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

## Project documents

- [Implementation plan](./PANTRYOS_IMPLEMENTATION_PLAN.md)
- [Plan audit](./PANTRYOS_PLAN_REVIEW.md)
- [Repository instructions](./AGENTS.md)

## License

[MIT](./LICENSE)
