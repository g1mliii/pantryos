import { describe, expect, it } from "vitest";
import {
  formatRecipeAmount,
  formatRecipeTiming,
  recipeIngredientToGroceryDraft,
} from "./recipe-units";

const cup = {
  name: "stock",
  normalizedName: "stock",
  quantity: 2,
  displayUnit: "cup" as const,
};

describe("recipe serving and unit conversion", () => {
  it("scales original units and converts US units to compact metric", () => {
    expect(formatRecipeAmount(cup, 1.5, "original")).toBe("3 cups");
    expect(formatRecipeAmount(cup, 2.5, "metric")).toBe("1.2 L");
  });

  it("converts recipe-only units before adding groceries", () => {
    expect(recipeIngredientToGroceryDraft(cup, 0.5)).toEqual({
      name: "stock",
      quantity: 240,
      unit: "ml",
    });
  });
});

describe("recipe timing copy", () => {
  it("reads the whole line from whichever timings the recipe has", () => {
    expect(
      formatRecipeTiming({
        prepMinutes: 10,
        cookMinutes: 17,
        totalMinutes: 27,
      }),
    ).toBe("10 min prep · 17 min cook");
    expect(formatRecipeTiming({ totalMinutes: 20 })).toBe("20 minutes");
    expect(formatRecipeTiming({ prepMinutes: 10, totalMinutes: 27 })).toBe(
      "10 min prep · 27 minutes in all",
    );
  });

  it("accounts for resting time that prep and cooking do not cover", () => {
    expect(
      formatRecipeTiming({
        prepMinutes: 10,
        cookMinutes: 20,
        totalMinutes: 90,
      }),
    ).toBe("10 min prep · 20 min cook · 90 minutes in all");
  });
});
