import { z } from "zod";
import { displayUnitSchema } from "./inventory";

const groceryQuantitySchema = z
  .number()
  .finite()
  .positive("Use a quantity greater than zero")
  .max(1_000_000, "That quantity is too large");

export const groceryDraftSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Give the grocery item a name")
      .max(120, "Keep the name to 120 characters or fewer"),
    quantity: groceryQuantitySchema.optional(),
    unit: displayUnitSchema.optional(),
    sourceRecipeId: z.string().min(1).max(160).optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if ((input.quantity === undefined) !== (input.unit === undefined)) {
      context.addIssue({
        code: "custom",
        message: "Quantity and unit must be provided together",
      });
    }
  });

export const groceryItemSchema = z
  .object({
    id: z.string().min(1).max(160),
    name: z.string().trim().min(1).max(120),
    normalizedName: z.string().min(1).max(120),
    quantity: groceryQuantitySchema.optional(),
    displayUnit: displayUnitSchema.optional(),
    checked: z.boolean(),
    sourceRecipeId: z.string().min(1).max(160).optional(),
    createdAt: z.string().datetime(),
  })
  .strict();

export type GroceryDraft = z.infer<typeof groceryDraftSchema>;
export type GroceryItem = z.infer<typeof groceryItemSchema>;
