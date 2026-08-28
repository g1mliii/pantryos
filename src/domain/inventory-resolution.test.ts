import { describe, expect, it } from "vitest";
import { createDemoInventory } from "../data/demo-kitchen";
import { addInventoryItem } from "./inventory";
import { resolveInventoryItem } from "./inventory-resolution";

const today = new Date(2026, 7, 28, 9);

describe("inventory item resolution", () => {
  it("prefers exact ids, then normalized aliases", () => {
    const items = createDemoInventory(today);

    expect(
      resolveInventoryItem(items, { itemId: "chicken-breast" }),
    ).toMatchObject({ ok: true, item: { id: "chicken-breast" } });
    expect(resolveInventoryItem(items, { item: "chicken" })).toMatchObject({
      ok: true,
      item: { id: "chicken-breast" },
    });
  });

  it("does not reinterpret a stale item id as an item name", () => {
    const milk = createDemoInventory(today).find((item) => item.id === "milk")!;
    const replacement = { ...milk, id: "milk-2" };

    expect(
      resolveInventoryItem([replacement], { itemId: "milk" }),
    ).toMatchObject({
      ok: false,
      code: "item_not_found",
    });
    expect(resolveInventoryItem([replacement], { item: "milk" })).toMatchObject(
      {
        ok: true,
        item: { id: "milk-2" },
      },
    );
  });

  it("returns candidates instead of guessing between safe partial matches", () => {
    const first = addInventoryItem(
      createDemoInventory(today),
      { name: "red onion", quantity: 1, unit: "count", location: "pantry" },
      today,
    ).items;

    expect(resolveInventoryItem(first, { item: "oni" })).toMatchObject({
      ok: false,
      code: "ambiguous_item",
      candidates: [{ id: "onion" }, { id: "red-onion" }],
    });
  });

  it("never resolves a narrower request onto a different food", () => {
    const items = createDemoInventory(today);

    expect(resolveInventoryItem(items, { item: "almond milk" })).toMatchObject({
      ok: false,
      code: "ambiguous_item",
      candidates: [{ id: "milk" }],
    });
    expect(resolveInventoryItem(items, { item: "pasta sauce" })).toMatchObject({
      ok: false,
      code: "ambiguous_item",
      candidates: [{ id: "pasta" }],
    });
  });

  it("recommends inventory lookup when nothing matches", () => {
    expect(
      resolveInventoryItem(createDemoInventory(today), { item: "banana" }),
    ).toMatchObject({
      ok: false,
      code: "item_not_found",
    });
  });
});
