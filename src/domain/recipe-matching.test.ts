import { addDays } from "date-fns";
import { describe, expect, it } from "vitest";
import { createDemoInventory } from "../data/demo-kitchen";
import { getRecipeById, RECIPES } from "../data/recipes";
import { toLocalCalendarDate } from "./expiry";
import { findRecipes, matchRecipe } from "./recipe-matching";

const TODAY = new Date(2026, 7, 27, 9);

function recipe(id: string) {
  const found = getRecipeById(id);
  if (!found) throw new Error(`Missing test recipe ${id}`);
  return found;
}

describe("recipe matching", () => {
  it("uses names rather than quantities and never uses expired inventory", () => {
    const inventory = createDemoInventory(TODAY).map((item) => {
      if (item.id === "chicken-breast") return { ...item, quantity: 0.001 };
      if (item.id === "spinach") {
        return {
          ...item,
          expiryDate: toLocalCalendarDate(addDays(TODAY, -1)),
        };
      }
      return item;
    });
    const match = matchRecipe(recipe("chicken-saag"), inventory, TODAY);

    expect(match.have.map((item) => item.normalizedName)).toContain(
      "chicken breast",
    );
    expect(match.missing.map((item) => item.normalizedName)).toEqual([
      "spinach",
      "ginger",
      "fresh tomato",
    ]);
    expect(match.expiringUsed.map((item) => item.id)).not.toContain("spinach");
  });

  it("excludes staples and optional ingredients from missing and coverage", () => {
    const match = matchRecipe(
      recipe("chicken-saag"),
      createDemoInventory(TODAY),
      TODAY,
    );

    expect(match.staples.map((item) => item.normalizedName)).toEqual([
      "garam masala",
      "cumin",
      "turmeric",
      "cooking oil",
      "salt",
    ]);
    expect(match.optionalMissing.map((item) => item.normalizedName)).toEqual([
      "lemon",
    ]);
    expect(match.have).toHaveLength(5);
    expect(match.missing).toHaveLength(2);
    expect(match.coverage).toBeCloseTo(5 / 7);
  });

  it("does not let canned tomato satisfy fresh tomato", () => {
    const match = matchRecipe(
      recipe("chicken-saag"),
      createDemoInventory(TODAY),
      TODAY,
    );
    expect(match.missing.map((item) => item.normalizedName)).toContain(
      "fresh tomato",
    );
  });
});

describe("recipe filters and ranking", () => {
  it("applies query, time, and missing filters", () => {
    const inventory = createDemoInventory(TODAY);
    const result = findRecipes(
      RECIPES,
      inventory,
      {
        query: "chicken",
        maxMinutes: 30,
        maxMissingIngredients: 2,
        prioritizeExpiring: true,
      },
      TODAY,
    );

    expect(result.totalMatches).toBe(1);
    expect(result.results.map((match) => match.recipe.id)).toEqual([
      "chicken-saag",
    ]);
    expect(
      findRecipes(RECIPES, inventory, { maxMinutes: 10 }, TODAY).results.every(
        (match) => match.recipe.totalMinutes <= 10,
      ),
    ).toBe(true);
    expect(
      findRecipes(
        RECIPES,
        inventory,
        { maxMissingIngredients: 0 },
        TODAY,
      ).results.every((match) => match.missing.length === 0),
    ).toBe(true);
  });

  it("returns at most five ranked results", () => {
    const result = findRecipes(
      RECIPES,
      createDemoInventory(TODAY),
      {
        maxMinutes: 30,
        maxMissingIngredients: 2,
        prioritizeExpiring: true,
      },
      TODAY,
      20,
    );
    expect(result.totalMatches).toBe(6);
    expect(result.results).toHaveLength(5);
    expect(
      result.results.every(
        (match, index) =>
          index === 0 || match.score <= result.results[index - 1]!.score,
      ),
    ).toBe(true);
  });

  it("meets the Chicken Saag acceptance result and ranking margin", () => {
    const result = findRecipes(
      RECIPES,
      createDemoInventory(TODAY),
      {
        maxMinutes: 30,
        maxMissingIngredients: 2,
        prioritizeExpiring: true,
      },
      TODAY,
    );
    const [saag, runnerUp] = result.results;

    expect(saag?.recipe.id).toBe("chicken-saag");
    expect(saag?.recipe.totalMinutes).toBe(27);
    expect(saag?.have).toHaveLength(5);
    expect(saag?.missing.map((item) => item.normalizedName)).toEqual([
      "ginger",
      "fresh tomato",
    ]);
    expect(saag?.expiringUsed.map((item) => item.id)).toEqual([
      "spinach",
      "chicken-breast",
      "greek-yogurt",
    ]);
    expect((saag?.score ?? 0) - (runnerUp?.score ?? 0)).toBeGreaterThanOrEqual(
      0.05,
    );
  });
});
