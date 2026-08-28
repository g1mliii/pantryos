import { ZodError } from "zod";
import { normalizeIngredientName } from "./normalize-ingredient";
import {
  groceryDraftSchema,
  type GroceryDraft,
  type GroceryItem,
} from "../schemas/grocery";
import type { RecipeMatch } from "./recipe-matching";

export interface GroceryAddResult {
  items: GroceryItem[];
  added: GroceryItem[];
  skipped: Array<{ item: GroceryItem; reason: string }>;
}

export function describeGroceryError(caught: unknown) {
  if (caught instanceof ZodError) {
    return caught.issues[0]?.message ?? "That grocery item was not valid.";
  }
  return "That grocery item was not valid.";
}

function readableGroceryId(name: string, items: readonly GroceryItem[]) {
  const base =
    normalizeIngredientName(name)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "item";
  const used = new Set(items.map((item) => item.id));
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
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
): GroceryAddResult {
  let next = [...items];
  const added: GroceryItem[] = [];
  const skipped: GroceryAddResult["skipped"] = [];
  for (const ingredient of match.missing) {
    const result = addGroceryItem(
      next,
      {
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.displayUnit,
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
