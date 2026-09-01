import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createKitchenStore } from "../stores/kitchen-store";
import {
  agentActivityStore,
  clearAgentActivity,
} from "../stores/agent-activity-store";
import { createPantryTools } from "./tools";

const TODAY = new Date(2026, 7, 28, 9);

function makeHarness(
  decision: "confirmed" | "declined" | "cancelled" = "confirmed",
) {
  const store = createKitchenStore({ now: () => TODAY });
  const confirm = vi.fn().mockResolvedValue(decision);
  const tools = createPantryTools({
    getKitchenState: store.getState,
    now: () => TODAY,
    requestConfirmation: confirm,
  });
  const execute = async (name: string, input: Record<string, unknown> = {}) => {
    const tool = tools.find((candidate) => candidate.name === name);
    if (!tool) throw new Error(`Missing tool ${name}`);
    return await tool.execute(input, {
      signal: new AbortController().signal,
    });
  };
  return { confirm, execute, store, tools };
}

function expectEveryPropertyDescribed(schema: unknown) {
  if (Array.isArray(schema)) {
    schema.forEach(expectEveryPropertyDescribed);
    return;
  }
  if (!schema || typeof schema !== "object") return;
  const node = schema as Record<string, unknown>;
  if (node.properties && typeof node.properties === "object") {
    for (const property of Object.values(
      node.properties as Record<string, unknown>,
    )) {
      expect(property).toMatchObject({ description: expect.any(String) });
      expectEveryPropertyDescribed(property);
    }
  }
  for (const keyword of ["anyOf", "oneOf", "allOf", "$defs", "items"]) {
    expectEveryPropertyDescribed(node[keyword]);
  }
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  localStorage.clear();
  clearAgentActivity();
});

describe("PantryOS WebMCP tool contracts", () => {
  it("publishes exactly eleven annotated, closed object schemas", () => {
    const { tools } = makeHarness();

    expect(tools.map((tool) => tool.name)).toEqual([
      "get_inventory",
      "get_expiring_items",
      "add_inventory_item",
      "consume_inventory_item",
      "remove_inventory_item",
      "find_recipes",
      "get_recipe",
      "add_recipe",
      "add_grocery_item",
      "add_recipe_to_grocery_list",
      "get_grocery_list",
    ]);
    for (const tool of tools) {
      expect(tool.title).toBeTruthy();
      expect(tool.description.length).toBeGreaterThan(30);
      expect(tool.inputSchema).toMatchObject({
        type: "object",
        additionalProperties: false,
      });
      expect(tool.annotations).toEqual({
        readOnlyHint: expect.any(Boolean),
        untrustedContentHint: expect.any(Boolean),
      });
    }
    expect(
      tools.find((tool) => tool.name === "consume_inventory_item")?.inputSchema,
    ).toHaveProperty("allOf");
    expect(
      tools.find((tool) => tool.name === "remove_inventory_item")?.inputSchema,
    ).toHaveProperty("oneOf");
    expect(
      tools.find((tool) => tool.name === "add_inventory_item")?.inputSchema,
    ).toMatchObject({
      properties: {
        name: { pattern: "\\S" },
        expiryDate: {
          anyOf: expect.arrayContaining([
            expect.objectContaining({ format: "date" }),
          ]),
        },
      },
    });
    expectEveryPropertyDescribed(
      tools.find((tool) => tool.name === "add_recipe")?.inputSchema,
    );
  });

  it("rejects unknown or incomplete input before mutation", async () => {
    const { execute, store } = makeHarness();
    const before = store.getState().inventory;

    await expect(
      execute("add_inventory_item", {
        name: "bananas",
        quantity: 4,
        unit: "count",
        location: "pantry",
        surprise: true,
      }),
    ).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    await expect(
      execute("consume_inventory_item", {
        item: "chicken",
        quantity: 400,
      }),
    ).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    await expect(
      execute("add_inventory_item", {
        name: "   ",
        quantity: 1,
        unit: "count",
        location: "pantry",
      }),
    ).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    await expect(
      execute("add_inventory_item", {
        name: "bananas",
        quantity: 1,
        unit: "count",
        location: "pantry",
        expiryDate: "2026-02-31",
      }),
    ).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(store.getState().inventory).toEqual(before);
  });

  it("completes the recipe-to-groceries and consumption demo through shared actions", async () => {
    const { execute, store } = makeHarness();

    const recipeResult = (await execute("find_recipes", {
      maxMinutes: 30,
      maxMissingIngredients: 2,
      prioritizeExpiring: true,
    })) as {
      ok: boolean;
      data: { results: Array<Record<string, unknown>> };
    };
    expect(recipeResult.ok).toBe(true);
    expect(recipeResult.data.results[0]).toMatchObject({
      recipeId: "chicken-saag",
      have: 5,
      required: 7,
      missing: ["ginger", "fresh tomato"],
    });

    await expect(
      execute("add_recipe_to_grocery_list", { recipeId: "chicken-saag" }),
    ).resolves.toMatchObject({
      ok: true,
      data: { added: ["ginger", "fresh tomato"] },
    });
    await expect(
      execute("add_recipe_to_grocery_list", { recipeId: "chicken-saag" }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        added: [],
        skipped: [
          { name: "ginger", reason: "Already on the list" },
          { name: "fresh tomato", reason: "Already on the list" },
        ],
        skippedCount: 2,
      },
    });
    expect(
      store.getState().groceries.map((item) => item.normalizedName),
    ).toEqual(["ginger", "fresh tomato"]);

    await expect(
      execute("consume_inventory_item", {
        item: "chicken",
        quantity: 400,
        unit: "g",
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: { item: { id: "chicken-breast", quantity: "200 g" } },
    });
    expect(
      store.getState().inventory.find((item) => item.id === "chicken-breast")
        ?.quantity,
    ).toBe(200);
  });

  it("adds leftovers to inventory and two separate grocery items", async () => {
    const { execute, store } = makeHarness();

    await execute("add_inventory_item", {
      name: "Chicken Saag leftovers",
      quantity: 2,
      unit: "serving",
      location: "fridge",
      expiryDate: "2026-09-03",
    });
    await execute("add_grocery_item", { name: "milk" });
    await execute("add_grocery_item", { name: "bananas" });

    expect(store.getState().inventory.at(-1)).toMatchObject({
      name: "Chicken Saag leftovers",
      quantity: 2,
      canonicalUnit: "serving",
      location: "fridge",
    });
    expect(
      store.getState().groceries.map((item) => item.normalizedName),
    ).toEqual(["milk", "bananas"]);
  });

  it("returns actionable ambiguity and over-consumption without changing inventory", async () => {
    const { execute, store } = makeHarness();
    store.getState().addInventory({
      name: "red onion",
      quantity: 1,
      unit: "count",
      location: "pantry",
    });

    await expect(
      execute("consume_inventory_item", { item: "oni" }),
    ).resolves.toMatchObject({
      ok: false,
      error: "ambiguous_item",
      details: [{ id: "onion" }, { id: "red-onion" }],
    });
    await expect(
      execute("consume_inventory_item", {
        itemId: "chicken-breast",
        quantity: 700,
        unit: "g",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: "over_consumption",
    });
    expect(
      store.getState().inventory.find((item) => item.id === "chicken-breast")
        ?.quantity,
    ).toBe(600);
  });

  it.each(["declined", "cancelled"] as const)(
    "does not remove inventory when confirmation is %s",
    async (decision) => {
      const { confirm, execute, store } = makeHarness(decision);

      await expect(
        execute("remove_inventory_item", { item: "spinach" }),
      ).resolves.toMatchObject({ ok: false, error: decision });
      expect(confirm).toHaveBeenCalledOnce();
      expect(
        store.getState().inventory.some((item) => item.id === "spinach"),
      ).toBe(true);
    },
  );

  it("removes only after confirmation", async () => {
    const { confirm, execute, store } = makeHarness("confirmed");

    await expect(
      execute("remove_inventory_item", { item: "spinach" }),
    ).resolves.toMatchObject({ ok: true, data: { removed: true } });
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Throw out Spinach?",
        confirmLabel: "Throw it out",
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(
      store.getState().inventory.some((item) => item.id === "spinach"),
    ).toBe(false);
  });

  it("only calls a removal the last of something when it is", async () => {
    const { confirm, execute, store } = makeHarness("declined");

    await execute("add_inventory_item", {
      name: "Milk",
      quantity: 1,
      unit: "l",
      location: "fridge",
    });
    const added = store
      .getState()
      .inventory.find(
        (item) => item.normalizedName === "milk" && item.id !== "milk",
      )!;

    await execute("remove_inventory_item", { itemId: added.id });
    expect(confirm).toHaveBeenLastCalledWith(
      expect.objectContaining({
        description: expect.stringContaining("1 more Milk stays"),
      }),
      expect.anything(),
    );

    await execute("remove_inventory_item", { itemId: "spinach" });
    expect(confirm).toHaveBeenLastCalledWith(
      expect.objectContaining({
        description: expect.stringContaining("That is the last"),
      }),
      expect.anything(),
    );
  });

  it("returns compact inventory, expiry, recipe, and grocery reads", async () => {
    const { execute } = makeHarness();

    await expect(execute("get_inventory")).resolves.toMatchObject({
      ok: true,
      data: { byLocation: { fridge: expect.any(Array) }, totalStored: 13 },
    });
    await expect(execute("get_expiring_items")).resolves.toMatchObject({
      ok: true,
      data: { withinDays: 3, items: expect.any(Array) },
    });
    await expect(
      execute("get_recipe", { recipeId: "chicken-saag" }),
    ).resolves.toMatchObject({
      ok: true,
      data: { title: "Chicken Saag", steps: expect.any(Array) },
    });
    await expect(execute("get_grocery_list")).resolves.toMatchObject({
      ok: true,
      data: { items: [] },
    });
  });

  it("caps large tool payloads and reports every truncated result", async () => {
    const { execute, store } = makeHarness();

    for (let index = 0; index < 55; index += 1) {
      store.getState().addInventory({
        name: `Today bulk ${index}`,
        quantity: 1,
        unit: "count",
        location: "pantry",
        expiryDate: "2026-08-28",
      });
      store.getState().addInventory({
        name: `Expired bulk ${index}`,
        quantity: 1,
        unit: "count",
        location: "fridge",
        expiryDate: "2026-08-27",
      });
    }
    for (let index = 0; index < 105; index += 1) {
      store.getState().addGrocery({ name: `Grocery bulk ${index}` });
    }

    await expect(
      execute("get_inventory", { location: "pantry" }),
    ).resolves.toMatchObject({
      ok: true,
      data: { returned: 50, totalStored: 62, truncated: true },
    });
    const allInventory = (await execute("get_inventory", {
      includeExpired: true,
    })) as { data: { expired: unknown[] } };
    expect(allInventory).toMatchObject({
      ok: true,
      data: {
        totalStored: 123,
        truncated: true,
      },
    });
    expect(allInventory.data.expired).toHaveLength(50);

    const expiring = (await execute("get_expiring_items", {
      withinDays: 0,
    })) as { data: { items: unknown[] } };
    expect(expiring).toMatchObject({
      ok: true,
      data: {
        totalMatches: 55,
        truncated: true,
      },
    });
    expect(expiring.data.items).toHaveLength(50);

    const groceries = (await execute("get_grocery_list")) as {
      data: { items: unknown[] };
    };
    expect(groceries).toMatchObject({
      ok: true,
      data: { truncated: true },
    });
    expect(groceries.data.items).toHaveLength(100);
  });

  it("fails closed when inventory changes while confirmation is open", async () => {
    const store = createKitchenStore({ now: () => TODAY });
    const tools = createPantryTools({
      getKitchenState: store.getState,
      now: () => TODAY,
      requestConfirmation: async () => {
        store.getState().removeInventory("spinach");
        return "confirmed";
      },
    });
    const remove = tools.find(
      (candidate) => candidate.name === "remove_inventory_item",
    )!;

    await expect(
      remove.execute(
        { itemId: "spinach" },
        { signal: new AbortController().signal },
      ),
    ).resolves.toMatchObject({ ok: false, error: "item_not_found" });
  });

  it("fails closed when the confirmed inventory row changes in place", async () => {
    const store = createKitchenStore({ now: () => TODAY });
    const tools = createPantryTools({
      getKitchenState: store.getState,
      now: () => TODAY,
      requestConfirmation: async () => {
        store
          .getState()
          .consumeInventory("spinach", { quantity: 100, unit: "g" });
        return "confirmed";
      },
    });
    const remove = tools.find(
      (candidate) => candidate.name === "remove_inventory_item",
    )!;

    await expect(
      remove.execute(
        { itemId: "spinach" },
        { signal: new AbortController().signal },
      ),
    ).resolves.toMatchObject({ ok: false, error: "inventory_changed" });
    expect(
      store.getState().inventory.find((item) => item.id === "spinach")
        ?.quantity,
    ).toBe(100);
  });

  it("clears visible agent activity when Reset Demo restores the kitchen", async () => {
    const { execute, store } = makeHarness();
    await execute("get_inventory");
    expect(agentActivityStore.getState().entries).not.toHaveLength(0);

    store.getState().resetDemo();

    expect(agentActivityStore.getState().entries).toEqual([]);
  });

  it("rehearses all eight canonical prompts across three clean demo cycles", async () => {
    const { execute, store } = makeHarness();

    for (let cycle = 0; cycle < 3; cycle += 1) {
      store.getState().resetDemo();
      const results = await Promise.all([
        execute("get_expiring_items", { withinDays: 3 }),
        execute("find_recipes", {
          maxMinutes: 30,
          maxMissingIngredients: 2,
          prioritizeExpiring: true,
        }),
        execute("get_recipe", { recipeId: "chicken-saag" }),
      ]);
      expect(results.every((result) => (result as { ok: boolean }).ok)).toBe(
        true,
      );
      await expect(
        execute("add_recipe_to_grocery_list", { recipeId: "chicken-saag" }),
      ).resolves.toMatchObject({ ok: true });
      await expect(
        execute("consume_inventory_item", {
          item: "chicken",
          quantity: 400,
          unit: "g",
        }),
      ).resolves.toMatchObject({ ok: true });
      await expect(
        execute("add_inventory_item", {
          name: "Chicken Saag leftovers",
          quantity: 2,
          unit: "serving",
          location: "fridge",
          expiryDate: "2026-09-03",
        }),
      ).resolves.toMatchObject({ ok: true });
      await expect(
        execute("remove_inventory_item", { item: "spinach" }),
      ).resolves.toMatchObject({ ok: true });
      await expect(
        execute("add_grocery_item", { name: "milk" }),
      ).resolves.toMatchObject({ ok: true });
      await expect(
        execute("add_grocery_item", { name: "bananas" }),
      ).resolves.toMatchObject({ ok: true });

      expect(
        store.getState().inventory.find((item) => item.id === "chicken-breast")
          ?.quantity,
      ).toBe(200);
      expect(
        store.getState().inventory.some((item) => item.id === "spinach"),
      ).toBe(false);
      expect(
        store.getState().groceries.map((item) => item.normalizedName),
      ).toEqual(["ginger", "fresh tomato", "milk", "bananas"]);
    }
  });
});
