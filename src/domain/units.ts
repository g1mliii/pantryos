import type {
  CanonicalUnit,
  DisplayUnit,
  InventoryItem,
} from "../schemas/inventory";

const UNIT_DEFINITIONS: Record<
  DisplayUnit,
  { canonicalUnit: CanonicalUnit; multiplier: number }
> = {
  g: { canonicalUnit: "g", multiplier: 1 },
  kg: { canonicalUnit: "g", multiplier: 1_000 },
  ml: { canonicalUnit: "ml", multiplier: 1 },
  l: { canonicalUnit: "ml", multiplier: 1_000 },
  count: { canonicalUnit: "count", multiplier: 1 },
  package: { canonicalUnit: "package", multiplier: 1 },
  serving: { canonicalUnit: "serving", multiplier: 1 },
};

function tidyNumber(value: number) {
  return Number(value.toFixed(6));
}

export function toCanonicalAmount(quantity: number, unit: DisplayUnit) {
  const definition = UNIT_DEFINITIONS[unit];
  return {
    canonicalUnit: definition.canonicalUnit,
    quantity: tidyNumber(quantity * definition.multiplier),
  };
}

export function fromCanonicalAmount(
  quantity: number,
  displayUnit: DisplayUnit,
) {
  return tidyNumber(quantity / UNIT_DEFINITIONS[displayUnit].multiplier);
}

export function areUnitsCompatible(
  canonicalUnit: CanonicalUnit,
  displayUnit: DisplayUnit,
) {
  return UNIT_DEFINITIONS[displayUnit].canonicalUnit === canonicalUnit;
}

export function formatQuantity(item: InventoryItem) {
  const quantity = fromCanonicalAmount(item.quantity, item.displayUnit);
  return formatDisplayQuantity(quantity, item.displayUnit);
}

export function formatDisplayQuantity(
  quantity: number | undefined,
  displayUnit: DisplayUnit | undefined,
) {
  if (quantity === undefined) return "";
  const formatted = new Intl.NumberFormat("en-CA", {
    maximumFractionDigits: 3,
  }).format(quantity);
  if (displayUnit === undefined || displayUnit === "count") return formatted;
  if (displayUnit === "l") return `${formatted} L`;
  if (displayUnit === "package" || displayUnit === "serving") {
    return `${formatted} ${displayUnit}${quantity === 1 ? "" : "s"}`;
  }
  return `${formatted} ${displayUnit}`;
}
