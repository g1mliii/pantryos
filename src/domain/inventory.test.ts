import { describe, expect, it } from "vitest";
import {
  addInventoryItem,
  consumeInventoryItem,
  countInventoryByLocation,
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

  it("refuses an edit that would rewrite how an item is stored", () => {
    const added = addInventoryItem(
      [],
      { name: "Milk", quantity: 1, unit: "l", location: "fridge" },
      NOW,
    );

    // The quantity travelling with the unit must not smuggle the change past
    // the compatibility check, or millilitres silently become a count.
    expect(() =>
      editInventoryItem(
        added.items,
        added.item.id,
        { quantity: 2, unit: "count" },
        NOW,
      ),
    ).toThrowError(InventoryDomainError);

    const rescaled = editInventoryItem(
      added.items,
      added.item.id,
      { quantity: 250, unit: "ml" },
      NOW,
    );
    expect(rescaled.item.canonicalUnit).toBe("ml");
    expect(rescaled.item.quantity).toBe(250);
  });

  it("counts every location, including the empty ones", () => {
    const first = addInventoryItem(
      [],
      { name: "Eggs", quantity: 8, unit: "count", location: "fridge" },
      NOW,
    );
    const second = addInventoryItem(
      first.items,
      { name: "Pasta", quantity: 500, unit: "g", location: "pantry" },
      NOW,
    );

    expect(countInventoryByLocation(second.items)).toEqual({
      fridge: 1,
      freezer: 0,
      pantry: 1,
    });
    expect(countInventoryByLocation([])).toEqual({
      fridge: 0,
      freezer: 0,
      pantry: 0,
    });
  });

  it("does not read inherited object keys as ingredient aliases", () => {
    const added = addInventoryItem(
      [],
      { name: "Constructor", quantity: 1, unit: "count", location: "pantry" },
      NOW,
    );

    expect(added.item.normalizedName).toBe("constructor");
    expect(added.item.id).toBe("constructor");
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
