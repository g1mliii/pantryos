import { describe, expect, it, vi } from "vitest";
import {
  createJSONStorage,
  type PersistStorage,
  type StateStorage,
} from "zustand/middleware";
import { toLocalCalendarDate } from "../domain/expiry";
import {
  createKitchenStore,
  KITCHEN_SCHEMA_VERSION,
  KITCHEN_STORAGE_KEY,
  type PersistedKitchenState,
} from "./kitchen-store";

const AT_NINE = new Date(2026, 7, 26, 9);

const STORED_ITEM = {
  id: "leftover-soup",
  name: "Leftover soup",
  normalizedName: "leftover soup",
  quantity: 500,
  canonicalUnit: "ml",
  displayUnit: "ml",
  location: "fridge",
  expiryDate: "2026-08-30",
  createdAt: "2026-08-26T09:00:00.000Z",
  updatedAt: "2026-08-26T09:00:00.000Z",
};

function memoryStorage(values = new Map<string, string>()) {
  const storage: StateStorage = {
    getItem: (name) => values.get(name) ?? null,
    setItem: (name, value) => values.set(name, value),
    removeItem: (name) => values.delete(name),
  };
  return createJSONStorage<PersistedKitchenState>(() => storage);
}

function seededStorage(state: unknown) {
  return memoryStorage(
    new Map([
      [
        KITCHEN_STORAGE_KEY,
        JSON.stringify({ state, version: KITCHEN_SCHEMA_VERSION }),
      ],
    ]),
  );
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
    firstLoad.getState().addRecipeToGroceries("chicken-saag");
    firstLoad.getState().addCustomRecipe({
      title: "Tomato Toast",
      description: "A quick lunch.",
      servings: 1,
      totalMinutes: 8,
      ingredients: [
        { name: "fresh tomato", quantity: 2, displayUnit: "count" },
      ],
      steps: [{ instruction: "Toast and top." }],
    });

    const reloaded = makeStore();
    expect(
      reloaded.getState().inventory.find((item) => item.id === "milk")?.name,
    ).toBe("Whole milk");
    expect(
      reloaded.getState().inventory.find((item) => item.id === "chicken-breast")
        ?.quantity,
    ).toBe(200);
    expect(
      reloaded.getState().groceries.map((item) => item.normalizedName),
    ).toEqual(["ginger", "fresh tomato"]);
    expect(reloaded.getState().customRecipes[0]?.id).toBe(
      "custom-tomato-toast",
    );

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
    expect(emptyReload.getState().groceries).toEqual([]);
    expect(emptyReload.getState().customRecipes).toEqual([]);
  });
});

describe("kitchen recovery from damaged storage", () => {
  it("migrates old string recipe steps into the rich step shape", () => {
    const store = createKitchenStore({
      now: () => AT_NINE,
      storage: seededStorage({
        hasInitialized: true,
        inventory: [],
        groceries: [],
        customRecipes: [
          {
            id: "custom-old-toast",
            title: "Old Toast",
            description: "Saved before rich recipe steps.",
            servings: 1,
            totalMinutes: 5,
            ingredients: [
              {
                name: "bread",
                normalizedName: "bread",
                quantity: 1,
                displayUnit: "count",
              },
            ],
            steps: ["Toast the bread."],
          },
        ],
      }),
    });

    expect(store.getState().customRecipes[0]?.steps).toEqual([
      { instruction: "Toast the bread." },
    ]);
  });

  it("rejects recipe photos once the browser-wide photo budget is full", () => {
    const store = createKitchenStore({ now: () => AT_NINE });
    const photo = {
      dataUrl: `data:image/webp;base64,${"A".repeat(399_970)}`,
      alt: "Audit recipe",
    };

    for (let index = 1; index <= 5; index += 1) {
      store.getState().addCustomRecipe({
        title: `Photo recipe ${index}`,
        description: "A browser photo budget fixture.",
        servings: 1,
        totalMinutes: 5,
        photo,
        ingredients: [{ name: "bread" }],
        steps: [{ instruction: "Serve." }],
      });
    }

    expect(() =>
      store.getState().addCustomRecipe({
        title: "Photo recipe 6",
        description: "This one exceeds the browser photo budget.",
        servings: 1,
        totalMinutes: 5,
        photo,
        ingredients: [{ name: "bread" }],
        steps: [{ instruction: "Serve." }],
      }),
    ).toThrow("2 MB storage limit");
    expect(store.getState().customRecipes).toHaveLength(5);
  });

  it("keeps the readable rows when one stored item is unusable", () => {
    const store = createKitchenStore({
      now: () => AT_NINE,
      storage: seededStorage({
        schemaVersion: KITCHEN_SCHEMA_VERSION,
        hasInitialized: true,
        inventory: [STORED_ITEM, { id: "mystery", surprise: true }],
      }),
    });

    // Re-seeding here would silently replace the whole kitchen with the demo.
    expect(store.getState().hasHydrated).toBe(true);
    expect(store.getState().hasInitialized).toBe(true);
    expect(store.getState().inventory.map((item) => item.id)).toEqual([
      "leftover-soup",
    ]);
  });

  it("opens a working kitchen when stored state cannot be read at all", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const storage: PersistStorage<PersistedKitchenState> = {
      getItem: () => {
        throw new Error("storage blocked");
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };

    const store = createKitchenStore({ now: () => AT_NINE, storage });

    // App gates every route on hasHydrated, so this is the difference between
    // a degraded kitchen and a permanent loading screen.
    expect(store.getState().hasHydrated).toBe(true);
    expect(store.getState().inventory).toHaveLength(13);
    warn.mockRestore();
  });

  it("clears a corrupt payload rather than failing the load", () => {
    localStorage.setItem(KITCHEN_STORAGE_KEY, "{ not json");

    const store = createKitchenStore({ now: () => AT_NINE });

    expect(store.getState().hasHydrated).toBe(true);
    expect(store.getState().inventory).toHaveLength(13);
    expect(localStorage.getItem(KITCHEN_STORAGE_KEY)).not.toContain("not json");
    localStorage.removeItem(KITCHEN_STORAGE_KEY);
  });
});
