import { daysUntilExpiry } from "./expiry";
import { normalizeIngredientName } from "./normalize-ingredient";
import { isStapleIngredient } from "../data/staples";
import {
  recipeFiltersSchema,
  type Recipe,
  type RecipeFilters,
  type RecipeIngredient,
} from "../schemas/recipe";
import type { InventoryItem } from "../schemas/inventory";

export interface RecipeMatch {
  recipe: Recipe;
  have: RecipeIngredient[];
  missing: RecipeIngredient[];
  optionalMissing: RecipeIngredient[];
  expiringUsed: InventoryItem[];
  staples: RecipeIngredient[];
  coverage: number;
  urgency: number;
  score: number;
}

export interface RecipeSearchResult {
  results: RecipeMatch[];
  totalMatches: number;
}

interface PendingRecipeMatch extends Omit<RecipeMatch, "score" | "urgency"> {
  rawUrgency: number;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export function findUsableInventoryItem(
  ingredient: RecipeIngredient,
  inventory: readonly InventoryItem[],
  today = new Date(),
) {
  const normalizedName = normalizeIngredientName(ingredient.name);
  return inventory
    .filter(
      (item) =>
        normalizeIngredientName(item.name) === normalizedName &&
        (item.expiryDate === null ||
          daysUntilExpiry(item.expiryDate, today) >= 0),
    )
    .sort((left, right) => {
      if (left.expiryDate === null) return 1;
      if (right.expiryDate === null) return -1;
      return (
        daysUntilExpiry(left.expiryDate, today) -
        daysUntilExpiry(right.expiryDate, today)
      );
    })[0];
}

function evaluateRecipe(
  recipe: Recipe,
  inventory: readonly InventoryItem[],
  today: Date,
): PendingRecipeMatch {
  const have: RecipeIngredient[] = [];
  const missing: RecipeIngredient[] = [];
  const optionalMissing: RecipeIngredient[] = [];
  const staples: RecipeIngredient[] = [];
  const expiringById = new Map<string, InventoryItem>();

  for (const ingredient of recipe.ingredients) {
    if (isStapleIngredient(ingredient.normalizedName)) {
      staples.push(ingredient);
      continue;
    }
    const inventoryItem = findUsableInventoryItem(ingredient, inventory, today);
    if (ingredient.optional) {
      if (!inventoryItem) optionalMissing.push(ingredient);
      continue;
    }
    if (!inventoryItem) {
      missing.push(ingredient);
      continue;
    }
    have.push(ingredient);
    if (inventoryItem.expiryDate) {
      const days = daysUntilExpiry(inventoryItem.expiryDate, today);
      if (days <= 3) expiringById.set(inventoryItem.id, inventoryItem);
    }
  }

  const expiringUsed = [...expiringById.values()];
  const rawUrgency = expiringUsed.reduce((sum, item) => {
    const days = daysUntilExpiry(item.expiryDate as string, today);
    return sum + 1 / (1 + days);
  }, 0);
  const denominator = have.length + missing.length;

  return {
    recipe,
    have,
    missing,
    optionalMissing,
    expiringUsed,
    staples,
    coverage: denominator > 0 ? have.length / denominator : 1,
    rawUrgency,
  };
}

function withScore(
  match: PendingRecipeMatch,
  maxRawUrgency: number,
  prioritizeExpiring: boolean,
): RecipeMatch {
  const urgency = maxRawUrgency > 0 ? match.rawUrgency / maxRawUrgency : 0;
  const timeFit = clamp(1 - match.recipe.totalMinutes / 60, 0, 1);
  const weights = prioritizeExpiring
    ? { coverage: 0.25, urgency: 0.6, time: 0.15 }
    : { coverage: 0.4, urgency: 0.45, time: 0.15 };
  return {
    recipe: match.recipe,
    have: match.have,
    missing: match.missing,
    optionalMissing: match.optionalMissing,
    expiringUsed: match.expiringUsed,
    staples: match.staples,
    coverage: match.coverage,
    urgency,
    score:
      match.coverage * weights.coverage +
      urgency * weights.urgency +
      timeFit * weights.time,
  };
}

function queryMatches(recipe: Recipe, query: string) {
  if (!query) return true;
  const needle = normalizeIngredientName(query);
  const searchable = [
    normalizeIngredientName(recipe.title),
    normalizeIngredientName(recipe.description),
    ...recipe.ingredients.map((ingredient) => ingredient.normalizedName),
  ];
  return searchable.some((value) => value.includes(needle));
}

export function findRecipes(
  recipes: readonly Recipe[],
  inventory: readonly InventoryItem[],
  input: RecipeFilters = {},
  today = new Date(),
  limit = 5,
): RecipeSearchResult {
  const filters = recipeFiltersSchema.parse(input);
  const query = filters.query?.trim() ?? "";
  const pending = recipes
    .filter(
      (recipe) =>
        queryMatches(recipe, query) &&
        (filters.maxMinutes === undefined ||
          recipe.totalMinutes <= filters.maxMinutes),
    )
    .map((recipe) => evaluateRecipe(recipe, inventory, today))
    .filter(
      (match) =>
        (filters.maxMissingIngredients === undefined ||
          match.missing.length <= filters.maxMissingIngredients) &&
        (filters.minMissingIngredients === undefined ||
          match.missing.length >= filters.minMissingIngredients),
    );
  const maxRawUrgency = pending.reduce(
    (maximum, match) => Math.max(maximum, match.rawUrgency),
    0,
  );
  const prioritizeExpiring = filters.prioritizeExpiring ?? false;
  const ranked = pending
    .map((match) => withScore(match, maxRawUrgency, prioritizeExpiring))
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.coverage - left.coverage ||
        left.missing.length - right.missing.length ||
        left.recipe.totalMinutes - right.recipe.totalMinutes ||
        left.recipe.title.localeCompare(right.recipe.title),
    );

  return {
    results: ranked.slice(0, Math.min(5, Math.max(0, limit))),
    totalMatches: ranked.length,
  };
}

export function matchRecipe(
  recipe: Recipe,
  inventory: readonly InventoryItem[],
  today = new Date(),
) {
  const match = findRecipes([recipe], inventory, {}, today, 1).results[0];
  if (!match) throw new Error(`Recipe ${recipe.id} could not be matched.`);
  return match;
}
