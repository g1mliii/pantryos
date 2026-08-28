import { z } from "zod";
import { displayUnitSchema } from "./inventory";

export const recipeIngredientSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    normalizedName: z.string().min(1).max(120),
    quantity: z.number().finite().positive().max(1_000_000).optional(),
    displayUnit: displayUnitSchema.optional(),
    optional: z.boolean().optional(),
  })
  .strict();

export const recipeSchema = z
  .object({
    id: z.string().min(1).max(160),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(500),
    servings: z.number().int().positive().max(24),
    totalMinutes: z.number().int().positive().max(480),
    ingredients: z.array(recipeIngredientSchema).min(1).max(40),
    steps: z.array(z.string().trim().min(1).max(800)).min(1).max(20),
  })
  .strict();

export const recipeFiltersSchema = z
  .object({
    query: z.string().trim().max(120).optional(),
    maxMinutes: z.number().int().positive().max(480).optional(),
    maxMissingIngredients: z.number().int().min(0).max(40).optional(),
    prioritizeExpiring: z.boolean().optional(),
  })
  .strict();

export type Recipe = z.infer<typeof recipeSchema>;
export type RecipeFilters = z.infer<typeof recipeFiltersSchema>;
export type RecipeIngredient = z.infer<typeof recipeIngredientSchema>;
