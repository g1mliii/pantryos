import { describe, expect, it } from "vitest";
import { createJSONStorage, type StateStorage } from "zustand/middleware";
import { toLocalCalendarDate } from "../domain/expiry";
import {
  createKitchenStore,
  type PersistedKitchenState,
} from "./kitchen-store";

function memoryStorage() {
  const values = new Map<string, string>();
  const storage: StateStorage = {
    getItem: (name) => values.get(name) ?? null,
    setItem: (name, value) => values.set(name, value),
    removeItem: (name) => values.delete(name),
  };
  return createJSONStorage<PersistedKitchenState>(() => storage);
}

describe("kitchen persistence and initialization", () => {
  it("runs the complete Phase 1 persistence, empty, and reset flow", () => {
    let today = new Date(2026, 7, 26, 9);
    const storage = memoryStorage();
    const makeStore = () =>
      createKitchenStore({ storage, now: () => new Date(today) });

    const firstLoad = makeStore();
    expect(firstLoad.getState().hasHydrated).toBe(true);
    expect(firstLoad.getState().inventory).toHaveLength(13);
    expect(firstLoad.getState().inventory.map((item) => item.id)).toEqual([
      "spinach",
      "chicken-breast",
      "greek-yogurt",
      "milk",
      "eggs",
      "basmati-rice",
      "onion",
      "garlic",
      "canned-tomatoes",
      "chickpeas",
      "pasta",
      "olive-oil",
      "frozen-peas",
    ]);

    firstLoad.getState().editInventory("milk", { name: "Whole milk" });
    firstLoad
      .getState()
      .consumeInventory("chicken-breast", { quantity: 400, unit: "g" });

    const reloaded = makeStore();
    expect(
      reloaded.getState().inventory.find((item) => item.id === "milk")?.name,
    ).toBe("Whole milk");
    expect(
      reloaded.getState().inventory.find((item) => item.id === "chicken-breast")
        ?.quantity,
    ).toBe(200);

    for (const item of reloaded.getState().inventory) {
      reloaded.getState().removeInventory(item.id);
    }
    expect(makeStore().getState().inventory).toEqual([]);

    today = new Date(2026, 8, 3, 18);
    const emptyReload = makeStore();
    emptyReload.getState().resetDemo();
    const resetInventory = emptyReload.getState().inventory;
    expect(resetInventory).toHaveLength(13);
    expect(
      resetInventory.find((item) => item.id === "spinach")?.expiryDate,
    ).toBe(toLocalCalendarDate(new Date(2026, 8, 4)));
    expect(
      resetInventory.find((item) => item.id === "chicken-breast")?.quantity,
    ).toBe(600);
  });
});
