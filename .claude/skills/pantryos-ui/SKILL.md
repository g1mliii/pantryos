---
name: pantryos-ui
description: PantryOS design system — warm paper and copper tokens, the components/ui primitives, motion rules, and the design/ artboards that are the visual source of truth. Use whenever building, restyling, or reviewing any PantryOS UI, adding a component, choosing a colour, spacing, radius, or writing any dropdown, dialog, or animation.
---

# PantryOS UI

The visual source of truth is `design/*.dc.html` — seven artboards covering
every screen plus the component sheet. **Open the relevant artboard before
building a screen.** They carry real seed data, so a number in an artboard is
the number the app should produce.

| Artboard                       | Covers                                                   |
| ------------------------------ | -------------------------------------------------------- |
| `design/Main.dc.html`          | Dashboard — Use First, counts, ranked recipes, shopping  |
| `design/Kitchen.dc.html`       | Inventory ledger by location, row actions                |
| `design/Recipes.dc.html`       | Recipe index, filter line, leading result                |
| `design/RecipeDetail.dc.html`  | Cookbook spread — ingredients against method             |
| `design/Groceries.dc.html`     | Checklist, sources, dedupe note                          |
| `design/Components.dc.html`    | Every reusable part, with a live select                  |
| `design/AgentSurfaces.dc.html` | Connection states, confirmation, activity, tool registry |

`design/canvas.json` lays them out. `design/pantryos-ui.html` is generated —
never edit it, and it is gitignored.

## Use the primitives

`src/components/ui/` already exists. Import from it; do not rewrite these.

| Component            | Use for                                              |
| -------------------- | ---------------------------------------------------- |
| `Button`             | `primary` \| `secondary` \| `destructive` \| `quiet` |
| `ConfirmationDialog` | Shared human and agent destructive approvals         |
| `Select`             | **every** dropdown — location, unit, filters         |
| `TextField`          | Labelled text, number, and date inputs               |
| `SectionHeading`     | every section label; this replaces card borders      |
| `FreshnessMarker`    | every expiry indicator                               |
| `CoverageBar`        | recipe have/total                                    |
| `TickBox`            | grocery checkboxes                                   |
| `PageIntro`          | page eyebrow + title + description                   |

If a screen needs something not on this list, add it to `components/ui/` and to
`design/Components.dc.html` — never inline a one-off in a route.

## Tokens only

Every colour, font and easing lives in `src/styles.css` under `@theme`. Use the
Tailwind utilities they generate (`bg-paper`, `text-ink-muted`, `border-rule`,
`bg-copper`). **Never write a hex value in a component.** If you need a shade
that does not exist, add it to `@theme` first.

- Surfaces: `paper` → `paper-raised` → `paper-sunk` → `paper-deep`
- Ink: `ink` → `ink-soft` → `ink-muted` → `ink-faint` → `ink-ghost`
- Rules: `rule` between sections, `rule-soft` between rows, `rule-faint`, `rule-warm`
- Accent: `copper`, `copper-deep` (text), `copper-mid` (rules), `copper-pale` (hover)
- Freshness: `urgent-deep` → `urgent` → `soon` → `later`

## The rules that make it look designed

1. **Square.** No `rounded-*` anywhere. The only exception is a 4px status dot.
2. **No card-per-element.** Separation is hairline rules and whitespace. One
   filled block (`bg-paper-sunk`) per page, marking the single thing that matters.
3. **Copper is material, not just ink.** It appears as the 5px masthead band,
   section markers, split rules, filled tags, filled primary buttons, tick
   boxes, coverage bars. But still only one filled emphasis per page — if
   everything is copper the accent stops meaning anything.
4. **Serif for what you would read in a cookbook** — recipe titles, ingredient
   names, quantities of note, the agent's suggested phrasings (italic). Sans for
   labels, meta and controls. Mono only for tool names.
5. **Colour is never the only signal.** Freshness markers always carry words.
6. **Uppercase labels** are `text-xs font-semibold tracking-[0.18em] uppercase`.

## Motion

**Animate only `opacity` and `transform`.** Both composite on the GPU and never
trigger layout. Transitioning `height`, `top`, `width` or `box-shadow` forces a
reflow every frame and is what makes a menu feel cheap.

```
--ease-enter: cubic-bezier(0.16, 1, 0.3, 1)   /* 140ms */
--ease-exit:  cubic-bezier(0.4, 0, 1, 1)      /*  90ms */
```

- Exit is always faster than enter. Slow dismissals read as broken.
- `transform-origin` follows the anchor, so a menu grows out of its trigger.
- Keep the panel mounted and toggle visibility, or the exit never plays.
- Never animate on first paint — only in response to a real interaction.
- `prefers-reduced-motion` is handled globally in `styles.css`; do not re-handle it.

## Dropdown behaviour

`Select` is the one menu primitive. Its contract, which any new menu must match:

- Click or `ArrowDown`/`ArrowUp` on the trigger opens it.
- `↑ ↓` move, `Home`/`End` jump, typing a letter jumps to the first match.
- `Enter` or `Space` commits; `Esc` or `Tab` closes and returns focus to the trigger.
- Pointer press outside dismisses.
- `role="listbox"`, `aria-activedescendant`, `aria-expanded` on the trigger.

Known upgrade path, not yet taken: the native popover API plus CSS anchor
positioning would give light-dismiss, top-layer stacking and focus return for
free. It is Chrome-only and unsupported in jsdom, so `Select` uses React state
instead. Revisit only if a menu needs to escape an overflow container.

## Layout

- Page container `max-w-[1240px] px-10`.
- Plan §12 puts the agent activity rail in the persistent shell: a 274px column,
  `border-l border-rule pl-[34px]`, present on every screen. It lands in phase 3
  with `AgentActivityPanel`; the artboards already show it.
- Routes stay thin. Layout and logic belong in components and `domain/`.

## Regenerating the canvas

Working files in `design/` are the input. After editing an artboard, re-seed and
republish per the `design` skill — do not hand-edit `design/pantryos-ui.html`.
