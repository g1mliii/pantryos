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

export const inventoryDraftSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    quantity: z.number().finite().positive().max(1_000_000),
    unit: displayUnitSchema,
    location: locationSchema,
    expiryDate: localCalendarDateSchema.nullable().optional(),
  })
  .strict();

export const inventoryEditSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    quantity: z.number().finite().positive().max(1_000_000).optional(),
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
    quantity: z.number().finite().positive().max(1_000_000),
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
