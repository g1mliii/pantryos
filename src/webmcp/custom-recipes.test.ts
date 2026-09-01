import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAgentActivity } from "../stores/agent-activity-store";
import { createKitchenStore } from "../stores/kitchen-store";
import { createPantryTools } from "./tools";

const TODAY = new Date(2026, 7, 29, 9);

beforeEach(() => localStorage.clear());
afterEach(() => {
  localStorage.clear();
  clearAgentActivity();
});

describe("saved recipes in WebMCP", () => {
  it("creates, finds, reads, and scales a rich saved recipe", async () => {
    const store = createKitchenStore({ now: () => TODAY });
    const tools = createPantryTools({
      getKitchenState: store.getState,
      now: () => TODAY,
    });
    const execute = async (name: string, input: Record<string, unknown>) => {
      const tool = tools.find((candidate) => candidate.name === name);
      if (!tool) throw new Error(`Missing tool ${name}`);
      return await tool.execute(input, {
        signal: new AbortController().signal,
      });
    };

    const added = (await execute("add_recipe", {
      title: "Spinach Toast",
      description: "A quick saved lunch.",
      servings: 2,
      timing: { prepMinutes: 3, cookMinutes: 5 },
      ingredients: [
        {
          name: "spinach",
          quantity: 100,
          displayUnit: "g",
          section: "Toast",
        },
        {
          name: "bread",
          quantity: 2,
          displayUnit: "count",
          section: "Toast",
        },
        {
          name: "olive oil",
          quantity: 1,
          displayUnit: "tbsp",
          optional: true,
        },
      ],
      steps: [
        {
          instruction: "Toast the bread.",
          section: "Toast",
          note: "Stop when the edges are crisp.",
        },
        { instruction: "Top with spinach.", section: "Finish" },
      ],
    })) as { data: { recipeId: string } };
    const recipeId = added.data.recipeId;

    await expect(
      execute("find_recipes", { query: "Spinach Toast" }),
    ).resolves.toMatchObject({
      ok: true,
      data: { results: [{ recipeId }] },
    });
    await expect(execute("get_recipe", { recipeId })).resolves.toMatchObject({
      ok: true,
      data: {
        title: "Spinach Toast",
        prepMinutes: 3,
        cookMinutes: 5,
        hasPhoto: false,
        ingredients: expect.arrayContaining([
          expect.objectContaining({ displayUnit: "g", section: "Toast" }),
        ]),
        steps: expect.arrayContaining([
          expect.objectContaining({ note: "Stop when the edges are crisp." }),
        ]),
      },
    });
    await expect(
      execute("add_recipe_to_grocery_list", {
        recipeId,
        targetServings: 4,
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: { added: ["bread"], targetServings: 4 },
    });
    expect(store.getState().groceries[0]).toMatchObject({
      name: "bread",
      quantity: 4,
      displayUnit: "count",
    });
  });

  it("updates and confirms removal of saved recipes only", async () => {
    const store = createKitchenStore({ now: () => TODAY });
    const confirm = vi
      .fn()
      .mockResolvedValueOnce("cancelled")
      .mockResolvedValueOnce("declined")
      .mockResolvedValueOnce("confirmed");
    const tools = createPantryTools({
      getKitchenState: store.getState,
      now: () => TODAY,
      requestConfirmation: confirm,
    });
    const execute = async (name: string, input: Record<string, unknown>) => {
      const tool = tools.find((candidate) => candidate.name === name);
      if (!tool) throw new Error(`Missing tool ${name}`);
      return await tool.execute(input, {
        signal: new AbortController().signal,
      });
    };
    const recipe = {
      title: "Toast",
      description: "A saved snack.",
      servings: 1,
      timing: { totalMinutes: 5 },
      ingredients: [
        { name: "bread", quantity: 1, displayUnit: "count" as const },
      ],
      steps: [{ instruction: "Toast the bread." }],
    };
    const { timing, ...recipeFields } = recipe;
    const saved = store.getState().addCustomRecipe({
      ...recipeFields,
      totalMinutes: timing.totalMinutes,
      photo: {
        dataUrl: "data:image/webp;base64,AAAA",
        alt: "Toast on a plate",
      },
    });
    const recipeId = saved.id;
    await execute("add_recipe_to_grocery_list", { recipeId });

    await expect(
      execute("update_recipe", {
        recipeId,
        ...recipe,
        title: "Herby Toast",
        servings: 2,
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        recipeId,
        title: "Herby Toast",
        servings: 2,
        hasPhoto: true,
      },
    });
    expect(store.getState().customRecipes[0]).toMatchObject({
      id: recipeId,
      photo: {
        dataUrl: "data:image/webp;base64,AAAA",
        alt: "Toast on a plate",
      },
    });
    await expect(
      execute("update_recipe", { recipeId: "custom-missing", ...recipe }),
    ).resolves.toMatchObject({ ok: false, error: "recipe_not_found" });
    await expect(
      execute("update_recipe", { recipeId: "chicken-saag", ...recipe }),
    ).resolves.toMatchObject({ ok: false, error: "recipe_read_only" });
    await expect(
      execute("remove_recipe", { recipeId: "chicken-saag" }),
    ).resolves.toMatchObject({ ok: false, error: "recipe_read_only" });

    await expect(execute("remove_recipe", { recipeId })).resolves.toMatchObject(
      { ok: false, error: "cancelled" },
    );
    expect(store.getState().customRecipes).toHaveLength(1);
    await expect(execute("remove_recipe", { recipeId })).resolves.toMatchObject(
      { ok: false, error: "declined" },
    );
    expect(store.getState().customRecipes).toHaveLength(1);
    await expect(execute("remove_recipe", { recipeId })).resolves.toMatchObject(
      {
        ok: true,
        data: { recipeId, removed: true },
      },
    );
    expect(store.getState().customRecipes).toEqual([]);
    expect(store.getState().groceries).toHaveLength(1);
    expect(store.getState().groceries[0]?.sourceRecipeId).toBeUndefined();
    expect(confirm).toHaveBeenCalledTimes(3);
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Delete Herby Toast?",
        confirmLabel: "Delete recipe",
        cancelLabel: "Keep recipe",
        description: expect.stringContaining("Grocery items"),
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("fails closed when a saved recipe changes while deletion is awaiting approval", async () => {
    const store = createKitchenStore({ now: () => TODAY });
    const saved = store.getState().addCustomRecipe({
      title: "Toast",
      description: "A saved snack.",
      servings: 1,
      totalMinutes: 5,
      ingredients: [{ name: "bread" }],
      steps: [{ instruction: "Toast the bread." }],
    });
    const tools = createPantryTools({
      getKitchenState: store.getState,
      now: () => TODAY,
      requestConfirmation: async () => {
        store.getState().editCustomRecipe(saved.id, {
          title: "Changed Toast",
          description: "It changed while approval was open.",
          servings: 2,
          totalMinutes: 6,
          ingredients: [{ name: "bread" }],
          steps: [{ instruction: "Toast two slices." }],
        });
        return "confirmed";
      },
    });
    const remove = tools.find((tool) => tool.name === "remove_recipe")!;

    await expect(
      remove.execute(
        { recipeId: saved.id },
        { signal: new AbortController().signal },
      ),
    ).resolves.toMatchObject({ ok: false, error: "recipe_changed" });
    expect(store.getState().customRecipes).toMatchObject([
      { id: saved.id, title: "Changed Toast" },
    ]);
  });

  it("reports when a saved recipe disappears while deletion is awaiting approval", async () => {
    const store = createKitchenStore({ now: () => TODAY });
    const saved = store.getState().addCustomRecipe({
      title: "Toast",
      description: "A saved snack.",
      servings: 1,
      totalMinutes: 5,
      ingredients: [{ name: "bread" }],
      steps: [{ instruction: "Toast the bread." }],
    });
    const tools = createPantryTools({
      getKitchenState: store.getState,
      now: () => TODAY,
      requestConfirmation: async () => {
        store.getState().removeCustomRecipe(saved.id);
        return "confirmed";
      },
    });
    const remove = tools.find((tool) => tool.name === "remove_recipe")!;

    await expect(
      remove.execute(
        { recipeId: saved.id },
        { signal: new AbortController().signal },
      ),
    ).resolves.toMatchObject({ ok: false, error: "recipe_not_found" });
    expect(store.getState().customRecipes).toEqual([]);
  });

  it("aborts an open recipe deletion without mutation", async () => {
    const store = createKitchenStore({ now: () => TODAY });
    const saved = store.getState().addCustomRecipe({
      title: "Toast",
      description: "A saved snack.",
      servings: 1,
      totalMinutes: 5,
      ingredients: [{ name: "bread" }],
      steps: [{ instruction: "Toast the bread." }],
    });
    const remove = createPantryTools({
      getKitchenState: store.getState,
      now: () => TODAY,
    }).find((tool) => tool.name === "remove_recipe")!;
    const controller = new AbortController();

    const pending = remove.execute(
      { recipeId: saved.id },
      { signal: controller.signal },
    );
    controller.abort();

    await expect(pending).resolves.toMatchObject({
      ok: false,
      error: "cancelled",
    });
    expect(store.getState().customRecipes).toMatchObject([{ id: saved.id }]);
  });

  it("rejects malformed rich recipes and invalid serving targets without mutation", async () => {
    const store = createKitchenStore({ now: () => TODAY });
    const tools = createPantryTools({
      getKitchenState: store.getState,
      now: () => TODAY,
    });
    const execute = async (name: string, input: Record<string, unknown>) => {
      const tool = tools.find((candidate) => candidate.name === name);
      if (!tool) throw new Error(`Missing tool ${name}`);
      return await tool.execute(input, {
        signal: new AbortController().signal,
      });
    };
    const valid = {
      title: "Audit Soup",
      description: "A structured test recipe.",
      servings: 2,
      timing: { totalMinutes: 12 },
      ingredients: [{ name: "stock", quantity: 1, displayUnit: "cup" }],
      steps: [{ instruction: "Simmer the stock." }],
    };

    await expect(
      execute("add_recipe", {
        ...valid,
        photo: "data:image/webp;base64,AAAA",
      }),
    ).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    await expect(
      execute("add_recipe", {
        ...valid,
        ingredients: [{ name: "stock", quantity: 1 }],
      }),
    ).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    await expect(
      execute("add_recipe", {
        ...valid,
        steps: [{ instruction: "   " }],
      }),
    ).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    await expect(
      execute("add_recipe", {
        ...valid,
        timing: { prepMinutes: 8, cookMinutes: 5, totalMinutes: 1 },
      }),
    ).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    await expect(
      execute("add_recipe", {
        ...valid,
        timing: { prepMinutes: 0, cookMinutes: 0 },
      }),
    ).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(store.getState().customRecipes).toEqual([]);

    const first = (await execute("add_recipe", valid)) as {
      data: { recipeId: string };
    };
    const second = (await execute("add_recipe", valid)) as {
      data: { recipeId: string };
    };
    expect([first.data.recipeId, second.data.recipeId]).toEqual([
      "custom-audit-soup",
      "custom-audit-soup-2",
    ]);

    const beforeInvalidUpdate = store.getState().customRecipes[0];
    await expect(
      execute("update_recipe", {
        recipeId: first.data.recipeId,
        ...valid,
        surprise: true,
      }),
    ).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    await expect(
      execute("update_recipe", {
        recipeId: first.data.recipeId,
        title: valid.title,
      }),
    ).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(store.getState().customRecipes[0]).toEqual(beforeInvalidUpdate);

    for (const targetServings of [0, 25]) {
      await expect(
        execute("add_recipe_to_grocery_list", {
          recipeId: first.data.recipeId,
          targetServings,
        }),
      ).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    }
    expect(store.getState().groceries).toEqual([]);
  });

  it("accepts the full bounded sum of separate prep and cooking times", async () => {
    const store = createKitchenStore({ now: () => TODAY });
    const tools = createPantryTools({
      getKitchenState: store.getState,
      now: () => TODAY,
    });
    const add = tools.find((candidate) => candidate.name === "add_recipe")!;
    const update = tools.find(
      (candidate) => candidate.name === "update_recipe",
    )!;

    const recipe = {
      title: "Weekend Stock",
      description: "A long, hands-off kitchen project.",
      servings: 4,
      ingredients: [{ name: "bones" }],
      steps: [{ instruction: "Simmer slowly." }],
    };
    const added = (await add.execute(
      { ...recipe, timing: { prepMinutes: 300, cookMinutes: 300 } },
      { signal: new AbortController().signal },
    )) as { data: { recipeId: string } };
    expect(added).toMatchObject({
      ok: true,
      data: { totalMinutes: 600 },
    });
    await expect(
      update.execute(
        {
          recipeId: added.data.recipeId,
          ...recipe,
          timing: { totalMinutes: 600 },
        },
        { signal: new AbortController().signal },
      ),
    ).resolves.toMatchObject({
      ok: true,
      data: { totalMinutes: 600 },
    });
  });
});
