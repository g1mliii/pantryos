import { describe, expect, it } from "vitest";
import { isStapleIngredient } from "../data/staples";
import { normalizeIngredientName } from "./normalize-ingredient";

describe("ingredient normalization", () => {
  it("normalizes punctuation, whitespace, and aliases", () => {
    expect(normalizeIngredientName("  Chicken!! ")).toBe("chicken breast");
    expect(normalizeIngredientName("Greek   yoghurt")).toBe("greek yogurt");
    expect(normalizeIngredientName("Garbanzo beans")).toBe("chickpea");
  });

  it("keeps canned and fresh tomato distinct", () => {
    expect(normalizeIngredientName("canned tomatoes")).toBe("canned tomato");
    expect(normalizeIngredientName("tomatoes")).toBe("fresh tomato");
    expect(normalizeIngredientName("canned tomatoes")).not.toBe(
      normalizeIngredientName("fresh tomato"),
    );
  });

  it("recognizes normalized staple aliases without treating food as staples", () => {
    expect(isStapleIngredient("olive oil")).toBe(true);
    expect(isStapleIngredient("garam masala")).toBe(true);
    expect(isStapleIngredient("spinach")).toBe(false);
  });
});
