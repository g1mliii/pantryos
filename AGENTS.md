# Repository instructions

## Source of truth

Read `PANTRYOS_IMPLEMENTATION_PLAN.md` before implementation. It and the other working notes are kept locally rather than committed, so a fresh clone will not have them. Keep it concise and update it only when a real architecture or acceptance decision changes.

## Working rules

- Read `.claude/skills/pantryos-ui` before writing any UI; `design/*.dc.html` is the visual source of truth.
- Compose `src/components/ui/` primitives. Add new ones there, never inline in a route.
- Use `@theme` tokens from `src/styles.css`. No hex values and no `rounded-*` in components.
- Animate only `opacity` and `transform`. Never transition height, top, width or box-shadow.
- Use npm and Node 24.
- Keep the app client-only unless the user explicitly changes scope.
- UI and WebMCP tools must call the same domain actions.
- Read Zustand state with `getState()` inside tool callbacks.
- Treat `document.modelContext` as current; isolate any navigator fallback.
- Validate every tool input with Zod and publish a matching JSON Schema.
- Do not depend on `requestUserInteraction()`.
- Do not send `Permissions-Policy: tools=()` or add framing restrictions without testing the exact ChatGPT/Chrome judging surface.
- Never commit secrets, origin-trial tokens, kitchen data, `.dev.vars`, or `.env` files.
- Do not claim agent processing stays on-device.
- Preserve unrelated user changes. Do not commit, push, deploy, or submit unless the user explicitly asks.

## Required verification

Run `npm run verify` for every implementation task. For deployment/config changes, also run `npm run deploy:dry`. Add focused tests for changed domain behavior and tool contracts.
