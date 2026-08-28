import { INGREDIENT_ALIASES } from "../data/ingredient-aliases";

/** Mechanical normalization before exact aliases are applied. */
export function simplifyIngredientName(name: string) {
  return name
    .toLocaleLowerCase("en-CA")
    .trim()
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** One canonical spelling shared by inventory, recipes, and groceries. */
export function normalizeIngredientName(name: string) {
  const normalized = simplifyIngredientName(name);
  return INGREDIENT_ALIASES.get(normalized) ?? normalized;
}
