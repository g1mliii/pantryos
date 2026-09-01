import { describe, expect, it } from "vitest";
import { RECIPES } from "../data/recipes";
import {
  createCustomRecipe,
  parseRecipeIngredients,
  parseRecipeSteps,
} from "./custom-recipes";

const DRAFT = {
  title: "Tomato Toast",
  description: "A quick lunch.",
  servings: 1,
  totalMinutes: 8,
  ingredients: [
    { name: "Fresh Tomatoes", quantity: 2, displayUnit: "count" as const },
    { name: "bread" },
  ],
  steps: [
    { instruction: "Toast the bread." },
    { instruction: "Top with tomato." },
  ],
};

describe("custom recipes", () => {
  it("normalizes ingredients and creates collision-safe ids", () => {
    const first = createCustomRecipe(RECIPES, DRAFT);
    const second = createCustomRecipe([...RECIPES, first], DRAFT);

    expect(first.id).toBe("custom-tomato-toast");
    expect(first.ingredients[0]?.normalizedName).toBe("fresh tomato");
    expect(second.id).toBe("custom-tomato-toast-2");
  });

  it("accepts friendly one-line ingredients and directions", () => {
    expect(
      parseRecipeIngredients(
        "[Main]\n400 g chicken breast\n2 tomatoes\nsalt\n[To finish]\n1 tbsp lemon juice (optional)",
      ),
    ).toEqual([
      {
        name: "chicken breast",
        quantity: 400,
        displayUnit: "g",
        section: "Main",
      },
      {
        name: "tomatoes",
        quantity: 2,
        displayUnit: "count",
        section: "Main",
      },
      { name: "salt", section: "Main" },
      {
        name: "lemon juice",
        quantity: 1,
        displayUnit: "tbsp",
        optional: true,
        section: "To finish",
      },
    ]);
    expect(
      parseRecipeSteps(
        "[Prepare]\n1. Chop everything | Keep the pieces even\n[Cook]\n2) Cook until ready",
      ),
    ).toEqual([
      {
        instruction: "Chop everything",
        note: "Keep the pieces even",
        section: "Prepare",
      },
      { instruction: "Cook until ready", section: "Cook" },
    ]);
  });

  it("parses common and Unicode fractional ingredient amounts", () => {
    expect(
      parseRecipeIngredients(
        "1/2 cup stock\n1 1/2 tbsp soy sauce\n2½ cups flour\n¾ tsp yeast\n½ onion",
      ),
    ).toEqual([
      { name: "stock", quantity: 0.5, displayUnit: "cup" },
      { name: "soy sauce", quantity: 1.5, displayUnit: "tbsp" },
      { name: "flour", quantity: 2.5, displayUnit: "cup" },
      { name: "yeast", quantity: 0.75, displayUnit: "tsp" },
      { name: "onion", quantity: 0.5, displayUnit: "count" },
    ]);
    expect(() => parseRecipeIngredients("1/0 cup stock")).toThrow(
      "valid ingredient quantity",
    );
  });

  it("rejects a total time shorter than prep plus cooking time", () => {
    expect(() =>
      createCustomRecipe(RECIPES, {
        ...DRAFT,
        prepMinutes: 8,
        cookMinutes: 5,
        totalMinutes: 10,
      }),
    ).toThrow("Total time cannot be shorter");
  });

  it("keeps an uploaded browser photo with the saved recipe", () => {
    const recipe = createCustomRecipe(RECIPES, {
      ...DRAFT,
      photo: {
        dataUrl: "data:image/webp;base64,AAAA",
        alt: "Tomato toast recipe",
      },
    });

    expect(recipe.photo).toEqual({
      dataUrl: "data:image/webp;base64,AAAA",
      alt: "Tomato toast recipe",
    });
  });
});
