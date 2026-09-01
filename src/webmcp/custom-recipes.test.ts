import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
    const tool = createPantryTools({
      getKitchenState: store.getState,
      now: () => TODAY,
    }).find((candidate) => candidate.name === "add_recipe")!;

    await expect(
      tool.execute(
        {
          title: "Weekend Stock",
          description: "A long, hands-off kitchen project.",
          servings: 4,
          timing: { prepMinutes: 300, cookMinutes: 300 },
          ingredients: [{ name: "bones" }],
          steps: [{ instruction: "Simmer slowly." }],
        },
        { signal: new AbortController().signal },
      ),
    ).resolves.toMatchObject({
      ok: true,
      data: { totalMinutes: 600 },
    });
  });
});
