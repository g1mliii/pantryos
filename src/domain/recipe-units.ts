import { displayUnitSchema, type DisplayUnit } from "../schemas/inventory";
import { pluralize } from "./number-words";
import { compactMetricAmount } from "./units";
import type { GroceryDraft } from "../schemas/grocery";
import type { Recipe, RecipeIngredient, RecipeUnit } from "../schemas/recipe";

export type RecipeUnitMode = "original" | "metric";

/** Recipe units a grocery row cannot store, so every one needs a conversion. */
type NonGroceryRecipeUnit = Exclude<RecipeUnit, DisplayUnit>;

// Typed over the full set of non-grocery units on purpose: adding a unit to
// recipeUnitSchema without a conversion here fails the build rather than
// throwing a ZodError inside addGroceryItem at runtime.
const METRIC_CONVERSIONS: Record<
  NonGroceryRecipeUnit,
  { multiplier: number; unit: "g" | "ml" }
> = {
  tsp: { multiplier: 5, unit: "ml" },
  tbsp: { multiplier: 15, unit: "ml" },
  cup: { multiplier: 240, unit: "ml" },
  oz: { multiplier: 28.3495, unit: "g" },
  lb: { multiplier: 453.592, unit: "g" },
};

function metricConversion(unit: RecipeUnit) {
  const conversions: Partial<
    Record<RecipeUnit, { multiplier: number; unit: "g" | "ml" }>
  > = METRIC_CONVERSIONS;
  return conversions[unit];
}

function isGroceryUnit(unit: RecipeUnit): unit is DisplayUnit {
  return (displayUnitSchema.options as readonly string[]).includes(unit);
}

function tidy(value: number) {
  return Number(value.toFixed(value < 10 ? 2 : 1));
}

function pluralUnit(unit: RecipeUnit, quantity: number) {
  if (unit === "l") return "L";
  if (unit === "count") return "";
  if (unit === "package" || unit === "serving" || unit === "cup") {
    return pluralize(quantity, unit);
  }
  return unit;
}

export function scaleRecipeAmount(
  ingredient: RecipeIngredient,
  factor: number,
  mode: RecipeUnitMode,
) {
  if (
    ingredient.quantity === undefined ||
    ingredient.displayUnit === undefined
  ) {
    return { quantity: undefined, unit: undefined };
  }
  let quantity = ingredient.quantity * factor;
  let unit: RecipeUnit = ingredient.displayUnit;
  if (mode === "metric") {
    const conversion = metricConversion(unit);
    if (conversion) {
      quantity *= conversion.multiplier;
      unit = conversion.unit;
    }
    if (isGroceryUnit(unit)) {
      const compact = compactMetricAmount(quantity, unit);
      quantity = compact.quantity;
      unit = compact.unit;
    }
  }
  return { quantity: tidy(quantity), unit };
}

export function formatRecipeAmount(
  ingredient: RecipeIngredient,
  factor = 1,
  mode: RecipeUnitMode = "original",
) {
  const { quantity, unit } = scaleRecipeAmount(ingredient, factor, mode);
  if (quantity === undefined || unit === undefined) return "";
  const suffix = pluralUnit(unit, quantity);
  return suffix ? `${quantity} ${suffix}` : String(quantity);
}

/**
 * Prep and cook are independently optional, and total can exceed them both
 * where a recipe rests or marinates, so build the line from whatever is known
 * instead of assuming one shape.
 */
export function formatRecipeTiming(
  recipe: Pick<Recipe, "prepMinutes" | "cookMinutes" | "totalMinutes">,
) {
  const parts: string[] = [];
  if (recipe.prepMinutes !== undefined) {
    parts.push(`${recipe.prepMinutes} min prep`);
  }
  if (recipe.cookMinutes !== undefined) {
    parts.push(`${recipe.cookMinutes} min cook`);
  }
  const accounted = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  if (parts.length === 0) return `${recipe.totalMinutes} minutes`;
  if (recipe.totalMinutes > accounted) {
    parts.push(`${recipe.totalMinutes} minutes in all`);
  }
  return parts.join(" · ");
}

export function recipeIngredientToGroceryDraft(
  ingredient: RecipeIngredient,
  factor = 1,
): GroceryDraft {
  if (
    ingredient.quantity === undefined ||
    ingredient.displayUnit === undefined
  ) {
    return { name: ingredient.name };
  }
  const { quantity, unit } = scaleRecipeAmount(ingredient, factor, "metric");
  // A scaled amount that rounds away to zero, or a unit with no grocery
  // equivalent, cannot be stored. The named row is still worth adding.
  if (
    quantity === undefined ||
    quantity <= 0 ||
    unit === undefined ||
    !isGroceryUnit(unit)
  ) {
    return { name: ingredient.name };
  }
  return { name: ingredient.name, quantity, unit };
}
