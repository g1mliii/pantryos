import { z } from "zod";
import { displayUnitSchema } from "./inventory";

// Every grocery unit is also a recipe unit, so extend that list rather than
// restating it: a unit added to displayUnitSchema cannot fall out of sync.
export const recipeUnitSchema = z.enum([
  ...displayUnitSchema.options,
  "tsp",
  "tbsp",
  "cup",
  "oz",
  "lb",
]);

export const recipePhotoSchema = z
  .object({
    dataUrl: z
      .string()
      .max(400_000, "That photo is too large — use a smaller one")
      .regex(
        /^data:image\/(?:webp|jpeg|png);base64,/,
        "Use a WebP, JPEG, or PNG photo",
      ),
    alt: z
      .string()
      .trim()
      .min(1, "Describe the photo")
      .max(160, "Keep the photo description to 160 characters or fewer"),
  })
  .strict();

const recipeStepObjectSchema = z
  .object({
    instruction: z
      .string()
      .trim()
      .min(1, "Write out the direction")
      .max(800, "Keep each direction to 800 characters or fewer"),
    section: z
      .string()
      .trim()
      .min(1, "Name the section")
      .max(80, "Keep each section heading to 80 characters or fewer")
      .optional(),
    note: z
      .string()
      .trim()
      .min(1, "Write out the cook's note")
      .max(300, "Keep each cook's note to 300 characters or fewer")
      .optional(),
  })
  .strict();

function validateRecipeTiming(
  recipe: {
    prepMinutes?: number;
    cookMinutes?: number;
    totalMinutes?: number;
  },
  context: z.RefinementCtx,
) {
  const activeMinutes = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  if (
    recipe.totalMinutes !== undefined &&
    recipe.totalMinutes < activeMinutes
  ) {
    context.addIssue({
      code: "custom",
      message: "Total time cannot be shorter than prep plus cooking time",
      path: ["totalMinutes"],
    });
  }
}

/** Converts Phase 2/5 string steps while validating the richer Phase 6 shape. */
export const recipeStepSchema = z.preprocess(
  (value) => (typeof value === "string" ? { instruction: value } : value),
  recipeStepObjectSchema,
);

export const recipeIngredientSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    normalizedName: z.string().min(1).max(120),
    quantity: z.number().finite().positive().max(1_000_000).optional(),
    displayUnit: recipeUnitSchema.optional(),
    optional: z.boolean().optional(),
    section: z.string().trim().min(1).max(80).optional(),
  })
  .strict();

export const recipeSchema = z
  .object({
    id: z.string().min(1).max(160),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(500),
    servings: z.number().int().positive().max(24),
    prepMinutes: z.number().int().min(0).max(480).optional(),
    cookMinutes: z.number().int().min(0).max(480).optional(),
    totalMinutes: z.number().int().positive().max(960),
    photo: recipePhotoSchema.optional(),
    ingredients: z.array(recipeIngredientSchema).min(1).max(40),
    steps: z.array(recipeStepSchema).min(1).max(30),
  })
  .strict()
  .superRefine(validateRecipeTiming);

export const recipeIngredientDraftSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Give the ingredient a name")
      .max(120, "Keep each ingredient name to 120 characters or fewer"),
    quantity: z
      .number()
      .finite()
      .positive("Use a quantity greater than zero")
      .max(1_000_000, "That quantity is too large")
      .optional(),
    displayUnit: recipeUnitSchema.optional(),
    optional: z.boolean().optional(),
    section: z
      .string()
      .trim()
      .min(1, "Name the section")
      .max(80, "Keep each section heading to 80 characters or fewer")
      .optional(),
  })
  .strict()
  .refine(
    (ingredient) =>
      (ingredient.quantity === undefined) ===
      (ingredient.displayUnit === undefined),
    "Give both a quantity and unit, or leave both out",
  );

export const customRecipeDraftSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Give the recipe a name")
      .max(120, "Keep the recipe name to 120 characters or fewer"),
    description: z
      .string()
      .trim()
      .min(1, "Add a short description")
      .max(500, "Keep the description to 500 characters or fewer"),
    servings: z
      .number()
      .int("Serves must be a whole number")
      .positive("This recipe has to serve at least one")
      .max(24, "Keep servings to 24 or fewer"),
    prepMinutes: z
      .number()
      .int("Prep time must be a whole number of minutes")
      .min(0, "Prep time cannot be negative")
      .max(480, "Keep prep time to 480 minutes or fewer")
      .optional(),
    cookMinutes: z
      .number()
      .int("Cooking time must be a whole number of minutes")
      .min(0, "Cooking time cannot be negative")
      .max(480, "Keep cooking time to 480 minutes or fewer")
      .optional(),
    // Optional here only: createCustomRecipe derives it from prep plus cook
    // so no caller has to redo that sum before saving.
    totalMinutes: z
      .number()
      .int("Total time must be a whole number of minutes")
      .positive("Give the recipe some prep or cooking time")
      .max(960, "Keep total time to 960 minutes or fewer")
      .optional(),
    photo: recipePhotoSchema.optional(),
    ingredients: z
      .array(recipeIngredientDraftSchema)
      .min(1, "Add at least one ingredient")
      .max(40, "Keep the recipe to 40 ingredients or fewer"),
    steps: z
      .array(recipeStepSchema)
      .min(1, "Add at least one direction")
      .max(30, "Keep the recipe to 30 directions or fewer"),
  })
  .strict()
  .superRefine(validateRecipeTiming);

export const recipeFiltersSchema = z
  .object({
    query: z.string().trim().max(120).optional(),
    maxMinutes: z.number().int().positive().max(480).optional(),
    maxMissingIngredients: z.number().int().min(0).max(40).optional(),
    // "Only recipes I still have to shop for" — the grocery list suggests
    // meals worth a trip, so a fully covered recipe is not a suggestion.
    minMissingIngredients: z.number().int().min(0).max(40).optional(),
    prioritizeExpiring: z.boolean().optional(),
  })
  .strict();

export type Recipe = z.infer<typeof recipeSchema>;
export type RecipeFilters = z.infer<typeof recipeFiltersSchema>;
export type RecipeIngredient = z.infer<typeof recipeIngredientSchema>;
export type CustomRecipeDraft = z.infer<typeof customRecipeDraftSchema>;
export type RecipeUnit = z.infer<typeof recipeUnitSchema>;
