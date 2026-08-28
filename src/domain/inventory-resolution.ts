import type { InventoryItem } from "../schemas/inventory";
import { normalizeIngredientName } from "./normalize-ingredient";

export type InventoryResolution =
  | { ok: true; item: InventoryItem }
  | {
      ok: false;
      code: "ambiguous_item" | "item_not_found";
      candidates?: Array<{ id: string; name: string }>;
      message: string;
    };

/** Resolves the conservative locator contract shared by consume and remove. */
export function resolveInventoryItem(
  items: readonly InventoryItem[],
  locator: { item?: string; itemId?: string },
): InventoryResolution {
  if (locator.itemId !== undefined) {
    const rawId = locator.itemId.trim();
    const exactId = items.find((item) => item.id === rawId);
    if (exactId) return { ok: true, item: exactId };

    return {
      ok: false,
      code: "item_not_found",
      message: `No inventory item has id "${rawId}". Call get_inventory to see current item ids and names.`,
    };
  }

  const raw = locator.item ?? "";

  const needle = normalizeIngredientName(raw);
  const exactNames = items.filter(
    (item) => normalizeIngredientName(item.name) === needle,
  );
  if (exactNames.length === 1) return { ok: true, item: exactNames[0]! };
  if (exactNames.length > 1) return ambiguous(exactNames, raw);

  const safeMatches = items.filter((item) =>
    normalizeIngredientName(item.name).includes(needle),
  );
  if (safeMatches.length === 1) return { ok: true, item: safeMatches[0]! };
  if (safeMatches.length > 1) return ambiguous(safeMatches, raw);

  // The request can also be more specific than what is stored ("almond milk"
  // against a kitchen holding Milk). That is usually a different food, so it
  // never resolves on its own — hand the near matches back and make the caller
  // choose an id.
  const narrower = items.filter((item) =>
    needle.includes(normalizeIngredientName(item.name)),
  );
  if (narrower.length > 0) {
    return {
      ok: false,
      code: "ambiguous_item",
      candidates: toCandidates(narrower),
      message: `Nothing is stored as "${raw}". Retry with one of the returned item ids only if you mean that exact food.`,
    };
  }

  return {
    ok: false,
    code: "item_not_found",
    message: `No inventory item matches "${raw}". Call get_inventory to see current item ids and names.`,
  };
}

function ambiguous(
  items: readonly InventoryItem[],
  raw: string,
): InventoryResolution {
  return {
    ok: false,
    code: "ambiguous_item",
    candidates: toCandidates(items),
    message: `"${raw}" matches more than one inventory item. Retry with one of the returned item ids.`,
  };
}

function toCandidates(items: readonly InventoryItem[]) {
  return items.slice(0, 8).map(({ id, name }) => ({ id, name }));
}
