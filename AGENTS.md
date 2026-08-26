# Repository instructions

## Source of truth

Read `PANTRYOS_IMPLEMENTATION_PLAN.md` before implementation. Keep it concise and update it only when a real architecture or acceptance decision changes.

## Working rules

- Use npm and Node 24.
- Keep the app client-only unless the user explicitly changes scope.
- UI and WebMCP tools must call the same domain actions.
- Read Zustand state with `getState()` inside tool callbacks.
- Treat `document.modelContext` as current; isolate any navigator fallback.
- Validate every tool input with Zod and publish a matching JSON Schema.
- Do not depend on `requestUserInteraction()`.
- Never commit secrets, origin-trial tokens, kitchen data, `.dev.vars`, or `.env` files.
- Do not claim agent processing stays on-device.
- Preserve unrelated user changes. Do not commit, push, deploy, or submit unless the user explicitly asks.

## Required verification

Run `npm run verify` for every implementation task. For deployment/config changes, also run `npm run deploy:dry`. Add focused tests for changed domain behavior and tool contracts.
