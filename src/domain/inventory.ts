import { ZodError } from "zod";
import {
  inventoryConsumptionSchema,
  inventoryDraftSchema,
  inventoryEditSchema,
  type InventoryConsumption,
  type InventoryDraft,
  type InventoryEdit,
  type InventoryItem,
  type Location,
} from "../schemas/inventory";
import { sortByUseFirst } from "./expiry";
import {
  normalizeIngredientName,
  simplifyIngredientName,
} from "./normalize-ingredient";
import { areUnitsCompatible, toCanonicalAmount } from "./units";

/** One spelling of each location, shared by every surface that names one. */
export const LOCATION_LABELS: Record<Location, string> = {
  fridge: "Fridge",
  freezer: "Freezer",
  pantry: "Pantry",
};

export type InventoryErrorCode =
  "INCOMPATIBLE_UNIT" | "ITEM_NOT_FOUND" | "OVER_CONSUMPTION";

export class InventoryDomainError extends Error {
  constructor(
    public readonly code: InventoryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "InventoryDomainError";
  }
}

/**
 * One readable sentence for anything these actions throw. The WebMCP tools hit
 * the same failures as the form and must report them the same way, so the
 * shaping belongs beside the actions rather than inside a component.
 */
export function describeInventoryError(caught: unknown): string {
  if (caught instanceof InventoryDomainError) return caught.message;
  // ZodError.message is a JSON dump of every issue; the first one is the one
  // that can actually be acted on.
  if (caught instanceof ZodError) {
    return caught.issues[0]?.message ?? "That inventory change was not valid.";
  }
  return "That inventory change was not valid.";
}

export function normalizeInventoryName(name: string) {
  return normalizeIngredientName(name);
}

function readableIdBase(name: string) {
  return (
    simplifyIngredientName(name)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "item"
  );
}

export function createReadableInventoryId(
  name: string,
  existingIds: Iterable<string>,
) {
  const base = readableIdBase(name);
  const used = new Set(existingIds);
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function findItem(items: readonly InventoryItem[], itemId: string) {
  const item = items.find((candidate) => candidate.id === itemId);
  if (!item) {
    throw new InventoryDomainError(
      "ITEM_NOT_FOUND",
      `No inventory item has id "${itemId}".`,
    );
  }
  return item;
}

export function addInventoryItem(
  items: readonly InventoryItem[],
  input: InventoryDraft,
  now = new Date(),
) {
  const draft = inventoryDraftSchema.parse(input);
  const amount = toCanonicalAmount(draft.quantity, draft.unit);
  const timestamp = now.toISOString();
  const item: InventoryItem = {
    id: createReadableInventoryId(
      draft.name,
      items.map((item) => item.id),
    ),
    name: draft.name.trim(),
    normalizedName: normalizeInventoryName(draft.name),
    quantity: amount.quantity,
    canonicalUnit: amount.canonicalUnit,
    displayUnit: draft.unit,
    location: draft.location,
    expiryDate: draft.expiryDate ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  return { item, items: [...items, item] };
}

export function editInventoryItem(
  items: readonly InventoryItem[],
  itemId: string,
  input: InventoryEdit,
  now = new Date(),
) {
  const changes = inventoryEditSchema.parse(input);
  const current = findItem(items, itemId);
  const displayUnit = changes.unit ?? current.displayUnit;
  // Checked unconditionally: an edit that also carries a quantity must not be
  // allowed to silently rewrite the canonical unit an item is stored in.
  if (!areUnitsCompatible(current.canonicalUnit, displayUnit)) {
    throw new InventoryDomainError(
      "INCOMPATIBLE_UNIT",
      `${current.name} is stored in ${current.canonicalUnit}; ${displayUnit} is not compatible.`,
    );
  }
  const quantity =
    changes.quantity === undefined
      ? current.quantity
      : toCanonicalAmount(changes.quantity, displayUnit).quantity;
  const name = changes.name?.trim() ?? current.name;
  const item: InventoryItem = {
    ...current,
    name,
    normalizedName: normalizeInventoryName(name),
    quantity,
    displayUnit,
    location: changes.location ?? current.location,
    expiryDate:
      changes.expiryDate === undefined
        ? current.expiryDate
        : changes.expiryDate,
    updatedAt: now.toISOString(),
  };
  return {
    item,
    items: items.map((candidate) =>
      candidate.id === itemId ? item : candidate,
    ),
  };
}

export function consumeInventoryItem(
  items: readonly InventoryItem[],
  itemId: string,
  input?: InventoryConsumption,
  now = new Date(),
) {
  const current = findItem(items, itemId);
  if (!input) {
    return { item: current, items: items.filter((item) => item.id !== itemId) };
  }
  const consumption = inventoryConsumptionSchema.parse(input);
  const amount = toCanonicalAmount(consumption.quantity, consumption.unit);
  if (amount.canonicalUnit !== current.canonicalUnit) {
    throw new InventoryDomainError(
      "INCOMPATIBLE_UNIT",
      `${consumption.unit} cannot be used to consume ${current.name}, which is stored in ${current.canonicalUnit}.`,
    );
  }
  if (amount.quantity > current.quantity) {
    throw new InventoryDomainError(
      "OVER_CONSUMPTION",
      `Cannot consume more than the available ${current.quantity} ${current.canonicalUnit}.`,
    );
  }
  if (amount.quantity === current.quantity) {
    return { item: current, items: items.filter((item) => item.id !== itemId) };
  }
  const item = {
    ...current,
    quantity: Number((current.quantity - amount.quantity).toFixed(6)),
    updatedAt: now.toISOString(),
  };
  return {
    item,
    items: items.map((candidate) =>
      candidate.id === itemId ? item : candidate,
    ),
  };
}

export function removeInventoryItem(
  items: readonly InventoryItem[],
  itemId: string,
) {
  const item = findItem(items, itemId);
  return { item, items: items.filter((candidate) => candidate.id !== itemId) };
}

/** Per-location totals in one pass; no ordering work, unlike grouping. */
export function countInventoryByLocation(
  items: readonly InventoryItem[],
): Record<Location, number> {
  const counts: Record<Location, number> = { fridge: 0, freezer: 0, pantry: 0 };
  for (const item of items) counts[item.location] += 1;
  return counts;
}

export function groupInventoryByLocation(
  items: readonly InventoryItem[],
  today = new Date(),
): Record<Location, InventoryItem[]> {
  return {
    fridge: sortByUseFirst(
      items.filter((item) => item.location === "fridge"),
      today,
    ),
    freezer: sortByUseFirst(
      items.filter((item) => item.location === "freezer"),
      today,
    ),
    pantry: sortByUseFirst(
      items.filter((item) => item.location === "pantry"),
      today,
    ),
  };
}
