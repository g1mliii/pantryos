import { describe, expect, it } from "vitest";
import { createDemoInventory } from "../data/demo-kitchen";
import { getRecipeById } from "../data/recipes";
import { createCustomRecipe } from "./custom-recipes";
import {
  addGroceryItem,
  addMissingRecipeIngredients,
  distinctMissingIngredients,
  setGroceryChecked,
} from "./groceries";
import { matchRecipe } from "./recipe-matching";

const TODAY = new Date(2026, 7, 27, 9);

describe("grocery actions", () => {
  it("adds only missing recipe ingredients and deduplicates a repeated add", () => {
    const recipe = getRecipeById("chicken-saag");
    if (!recipe) throw new Error("Missing Chicken Saag");
    const match = matchRecipe(recipe, createDemoInventory(TODAY), TODAY);
    const first = addMissingRecipeIngredients([], match, TODAY);
    const second = addMissingRecipeIngredients(first.items, match, TODAY);

    expect(first.added.map((item) => item.normalizedName)).toEqual([
      "ginger",
      "fresh tomato",
    ]);
    expect(first.items).toHaveLength(2);
    expect(second.added).toEqual([]);
    expect(second.skipped).toHaveLength(2);
    expect(second.items).toEqual(first.items);
  });

  it("does not duplicate checked or unchecked normalized aliases", () => {
    const first = addGroceryItem([], { name: "Tomatoes" }, TODAY);
    const unchecked = addGroceryItem(
      first.items,
      { name: "fresh tomato" },
      TODAY,
    );
    const checkedItems = setGroceryChecked(
      first.items,
      first.items[0]!.id,
      true,
    );
    const checked = addGroceryItem(
      checkedItems,
      { name: "Fresh tomatoes" },
      TODAY,
    );

    expect(unchecked.items).toHaveLength(1);
    expect(unchecked.skipped[0]?.reason).toBe("Already on the list");
    expect(checked.items).toHaveLength(1);
    expect(checked.items[0]?.checked).toBe(true);
    expect(checked.skipped[0]?.reason).toContain("checked");
  });

  it("combines repeated missing ingredients before grocery dedupe", () => {
    const recipe = createCustomRecipe([], {
      title: "Layered Stock",
      description: "Stock used in two recipe sections.",
      servings: 2,
      totalMinutes: 10,
      ingredients: [
        {
          name: "stock",
          quantity: 1,
          displayUnit: "tbsp",
          section: "Base",
        },
        {
          name: "stock",
          quantity: 2,
          displayUnit: "tbsp",
          section: "Sauce",
        },
      ],
      steps: [{ instruction: "Combine." }],
    });
    const match = matchRecipe(recipe, [], TODAY);

    const result = addMissingRecipeIngredients([], match, TODAY, 2);

    expect(result.added).toMatchObject([
      { name: "stock", quantity: 90, displayUnit: "ml" },
    ]);
    expect(result.skipped).toEqual([]);
  });
});

describe("counting what an add will produce", () => {
  it("counts merged sections once, matching the rows that get added", () => {
    const recipe = createCustomRecipe([], {
      title: "Layered Broth",
      description: "Stock in two places.",
      servings: 2,
      totalMinutes: 20,
      ingredients: [
        { name: "stock", quantity: 200, displayUnit: "ml", section: "Base" },
        { name: "stock", quantity: 100, displayUnit: "ml", section: "Sauce" },
      ],
      steps: [{ instruction: "Simmer." }],
    });
    const match = matchRecipe(recipe, [], TODAY);
    const result = addMissingRecipeIngredients([], match, TODAY);

    expect(match.missing).toHaveLength(2);
    expect(distinctMissingIngredients(match.missing)).toHaveLength(1);
    expect(result.added).toHaveLength(1);
  });
});
