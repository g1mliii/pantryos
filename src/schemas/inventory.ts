import { z } from "zod";

export const canonicalUnitSchema = z.enum([
  "g",
  "ml",
  "count",
  "package",
  "serving",
]);

export const displayUnitSchema = z.enum([
  "g",
  "kg",
  "ml",
  "l",
  "count",
  "package",
  "serving",
]);

export const locationSchema = z.enum(["fridge", "freezer", "pantry"]);

function isRealLocalCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

export const localCalendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD calendar date")
  .refine(isRealLocalCalendarDate, "Use a valid local calendar date");

export const inventoryItemSchema = z
  .object({
    id: z.string().min(1).max(160),
    name: z.string().trim().min(1).max(120),
    normalizedName: z.string().min(1).max(120),
    quantity: z.number().finite().positive().max(1_000_000_000),
    canonicalUnit: canonicalUnitSchema,
    displayUnit: displayUnitSchema,
    location: locationSchema,
    expiryDate: localCalendarDateSchema.nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

/**
 * These messages reach both the agent, as a tool error, and the person, in the
 * inventory form. Zod's defaults ("Too small: expected string to have >=1
 * characters") serve neither, so the input schemas carry their own.
 */
const inputNameSchema = z
  .string()
  .trim()
  .min(1, "Give the item a name")
  .max(120, "Keep the name to 120 characters or fewer");

export const inputQuantitySchema = z
  .number()
  .finite()
  .positive("Use a quantity greater than zero")
  .max(1_000_000, "That quantity is larger than one kitchen can hold");

export const inventoryDraftSchema = z
  .object({
    name: inputNameSchema,
    quantity: inputQuantitySchema,
    unit: displayUnitSchema,
    location: locationSchema,
    expiryDate: localCalendarDateSchema.nullable().optional(),
  })
  .strict();

export const inventoryEditSchema = z
  .object({
    name: inputNameSchema.optional(),
    quantity: inputQuantitySchema.optional(),
    unit: displayUnitSchema.optional(),
    location: locationSchema.optional(),
    expiryDate: localCalendarDateSchema.nullable().optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "Provide at least one inventory change",
  });

export const inventoryConsumptionSchema = z
  .object({
    quantity: inputQuantitySchema,
    unit: displayUnitSchema,
  })
  .strict();

export type CanonicalUnit = z.infer<typeof canonicalUnitSchema>;
export type DisplayUnit = z.infer<typeof displayUnitSchema>;
export type InventoryConsumption = z.infer<typeof inventoryConsumptionSchema>;
export type InventoryDraft = z.infer<typeof inventoryDraftSchema>;
export type InventoryEdit = z.infer<typeof inventoryEditSchema>;
export type InventoryItem = z.infer<typeof inventoryItemSchema>;
export type Location = z.infer<typeof locationSchema>;
