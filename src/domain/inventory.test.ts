import { describe, expect, it } from "vitest";
import {
  addInventoryItem,
  consumeInventoryItem,
  createReadableInventoryId,
  editInventoryItem,
  groupInventoryByLocation,
  InventoryDomainError,
  removeInventoryItem,
} from "./inventory";

const NOW = new Date(2026, 7, 26, 12);

describe("inventory domain actions", () => {
  it("creates readable collision-safe ids", () => {
    expect(createReadableInventoryId("Eggs", [])).toBe("eggs");
    expect(createReadableInventoryId("Eggs", ["eggs", "eggs-2"])).toBe(
      "eggs-3",
    );
  });

  it("adds, edits, groups, consumes, and removes inventory", () => {
    const added = addInventoryItem(
      [],
      {
        name: "Chicken",
        quantity: 0.6,
        unit: "kg",
        location: "fridge",
        expiryDate: "2026-08-28",
      },
      NOW,
    );
    expect(added.item.normalizedName).toBe("chicken breast");
    expect(added.item.quantity).toBe(600);

    const edited = editInventoryItem(
      added.items,
      added.item.id,
      { name: "Chicken breast", location: "freezer" },
      NOW,
    );
    expect(groupInventoryByLocation(edited.items, NOW).freezer).toHaveLength(1);

    const consumed = consumeInventoryItem(
      edited.items,
      added.item.id,
      { quantity: 400, unit: "g" },
      NOW,
    );
    expect(consumed.item.quantity).toBe(200);
    expect(removeInventoryItem(consumed.items, added.item.id).items).toEqual(
      [],
    );
  });

  it("rejects incompatible and excessive consumption", () => {
    const added = addInventoryItem(
      [],
      { name: "Eggs", quantity: 8, unit: "count", location: "fridge" },
      NOW,
    );
    expect(() =>
      consumeInventoryItem(added.items, added.item.id, {
        quantity: 1,
        unit: "package",
      }),
    ).toThrowError(InventoryDomainError);
    expect(() =>
      consumeInventoryItem(added.items, added.item.id, {
        quantity: 9,
        unit: "count",
      }),
    ).toThrow(/available/i);
  });
});
