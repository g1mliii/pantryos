import { describe, expect, it } from "vitest";
import { createDemoInventory } from "../data/demo-kitchen";
import { getRecipeById } from "../data/recipes";
import {
  addGroceryItem,
  addMissingRecipeIngredients,
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
});
