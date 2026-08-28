import { normalizeIngredientName } from "../domain/normalize-ingredient";

export const STAPLE_NAMES = [
  "salt",
  "pepper",
  "water",
  "cooking oil",
  "sugar",
  "cumin",
  "turmeric",
  "garam masala",
  "chili powder",
  "coriander",
] as const;

const NORMALIZED_STAPLES = new Set(
  STAPLE_NAMES.map((name) => normalizeIngredientName(name)),
);

export function isStapleIngredient(name: string) {
  return NORMALIZED_STAPLES.has(normalizeIngredientName(name));
}
