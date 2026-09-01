import { ZodError } from "zod";
import { normalizeIngredientName } from "./normalize-ingredient";
import {
  groceryDraftSchema,
  type GroceryDraft,
  type GroceryItem,
} from "../schemas/grocery";
import type { RecipeMatch } from "./recipe-matching";
import type { RecipeIngredient } from "../schemas/recipe";
import { recipeIngredientToGroceryDraft } from "./recipe-units";
import { slugify, uniqueId } from "./slug";
import { compactMetricAmount, toCanonicalAmount } from "./units";

export interface GroceryAddResult {
  items: GroceryItem[];
  added: GroceryItem[];
  skipped: Array<{ item: GroceryItem; reason: string }>;
}

function baseMetricDraft(draft: GroceryDraft) {
  if (draft.quantity === undefined || draft.unit === undefined) return draft;
  const base = toCanonicalAmount(draft.quantity, draft.unit);
  return { ...draft, quantity: base.quantity, unit: base.canonicalUnit };
}

function compactMetricDraft(draft: GroceryDraft): GroceryDraft {
  if (draft.quantity === undefined || draft.unit === undefined) return draft;
  const compact = compactMetricAmount(draft.quantity, draft.unit);
  const rounded = Number(compact.quantity.toFixed(2));
  // A tiny scaled amount can round away entirely, and a zero quantity fails
  // groceryDraftSchema. Keep the row and drop the amount rather than throw.
  if (rounded <= 0) return { name: draft.name };
  return { ...draft, quantity: rounded, unit: compact.unit };
}

/**
 * The rows addMissingRecipeIngredients will actually create: it merges by
 * normalized name, so a recipe listing one ingredient under two sections adds
 * a single item. Counting match.missing directly overstates that.
 */
export function distinctMissingIngredients(
  missing: readonly RecipeIngredient[],
) {
  const byName = new Map<string, RecipeIngredient>();
  for (const ingredient of missing) {
    if (!byName.has(ingredient.normalizedName)) {
      byName.set(ingredient.normalizedName, ingredient);
    }
  }
  return [...byName.values()];
}

function mergeRecipeGroceryDrafts(
  existing: GroceryDraft,
  incoming: GroceryDraft,
): GroceryDraft {
  const left = baseMetricDraft(existing);
  const right = baseMetricDraft(incoming);
  if (
    left.quantity === undefined ||
    left.unit === undefined ||
    right.quantity === undefined ||
    right.unit === undefined ||
    left.unit !== right.unit
  ) {
    // A single deduplicated row cannot express partial or incompatible totals
    // safely, so keep the item but do not understate its required amount.
    return { name: existing.name };
  }
  return compactMetricDraft({
    name: existing.name,
    quantity: left.quantity + right.quantity,
    unit: left.unit,
  });
}

export function describeGroceryError(caught: unknown) {
  if (caught instanceof ZodError) {
    return caught.issues[0]?.message ?? "That grocery item was not valid.";
  }
  return "That grocery item was not valid.";
}

function readableGroceryId(name: string, items: readonly GroceryItem[]) {
  return uniqueId(
    slugify(normalizeIngredientName(name), "item"),
    new Set(items.map((item) => item.id)),
  );
}

/** Underlying action for both the Phase 2 UI and Phase 3 add_grocery_item. */
export function addGroceryItem(
  items: readonly GroceryItem[],
  input: GroceryDraft,
  now = new Date(),
): GroceryAddResult {
  const draft = groceryDraftSchema.parse(input);
  const normalizedName = normalizeIngredientName(draft.name);
  const existing = items.find((item) => item.normalizedName === normalizedName);
  if (existing) {
    return {
      items: [...items],
      added: [],
      skipped: [
        {
          item: existing,
          reason: existing.checked
            ? "Already on the list and checked"
            : "Already on the list",
        },
      ],
    };
  }
  const item: GroceryItem = {
    id: readableGroceryId(draft.name, items),
    name: draft.name.trim(),
    normalizedName,
    ...(draft.quantity === undefined ? {} : { quantity: draft.quantity }),
    ...(draft.unit === undefined ? {} : { displayUnit: draft.unit }),
    checked: false,
    ...(draft.sourceRecipeId === undefined
      ? {}
      : { sourceRecipeId: draft.sourceRecipeId }),
    createdAt: now.toISOString(),
  };
  return { items: [...items, item], added: [item], skipped: [] };
}

export function addMissingRecipeIngredients(
  items: readonly GroceryItem[],
  match: RecipeMatch,
  now = new Date(),
  servingScale = 1,
): GroceryAddResult {
  let next = [...items];
  const added: GroceryItem[] = [];
  const skipped: GroceryAddResult["skipped"] = [];
  const recipeDrafts = new Map<string, GroceryDraft>();
  for (const ingredient of match.missing) {
    const draft = recipeIngredientToGroceryDraft(ingredient, servingScale);
    const existing = recipeDrafts.get(ingredient.normalizedName);
    recipeDrafts.set(
      ingredient.normalizedName,
      existing ? mergeRecipeGroceryDrafts(existing, draft) : draft,
    );
  }
  for (const draft of recipeDrafts.values()) {
    const result = addGroceryItem(
      next,
      {
        ...draft,
        sourceRecipeId: match.recipe.id,
      },
      now,
    );
    next = result.items;
    added.push(...result.added);
    skipped.push(...result.skipped);
  }
  return { items: next, added, skipped };
}

export function setGroceryChecked(
  items: readonly GroceryItem[],
  itemId: string,
  checked: boolean,
) {
  return items.map((item) =>
    item.id === itemId ? { ...item, checked } : item,
  );
}

export function removeGroceryItem(
  items: readonly GroceryItem[],
  itemId: string,
) {
  return items.filter((item) => item.id !== itemId);
}

export function clearCheckedGroceries(items: readonly GroceryItem[]) {
  return items.filter((item) => !item.checked);
}
