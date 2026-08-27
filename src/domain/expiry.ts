import { differenceInCalendarDays } from "date-fns";
import type { InventoryItem } from "../schemas/inventory";

export type ExpiryStatus = "expired" | "today" | "soon" | "safe" | "none";

export interface ExpiryDetails {
  daysRemaining: number | null;
  label: string;
  status: ExpiryStatus;
}

export function parseLocalCalendarDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toLocalCalendarDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function daysUntilExpiry(expiryDate: string, today = new Date()) {
  return differenceInCalendarDays(parseLocalCalendarDate(expiryDate), today);
}

export function getExpiryDetails(
  expiryDate: string | null,
  today = new Date(),
): ExpiryDetails {
  if (!expiryDate)
    return { daysRemaining: null, label: "No date", status: "none" };
  const daysRemaining = daysUntilExpiry(expiryDate, today);
  if (daysRemaining < 0) {
    return { daysRemaining, label: "Gone off", status: "expired" };
  }
  if (daysRemaining === 0) {
    return { daysRemaining, label: "Today", status: "today" };
  }
  if (daysRemaining <= 3) {
    return {
      daysRemaining,
      label: daysRemaining === 1 ? "Tomorrow" : `${daysRemaining} days`,
      status: "soon",
    };
  }
  return { daysRemaining, label: `In ${daysRemaining} days`, status: "safe" };
}

export function sortByUseFirst(
  items: readonly InventoryItem[],
  today = new Date(),
) {
  return [...items].sort((left, right) => {
    if (left.expiryDate === null && right.expiryDate !== null) return 1;
    if (left.expiryDate !== null && right.expiryDate === null) return -1;
    const leftDays = left.expiryDate
      ? daysUntilExpiry(left.expiryDate, today)
      : Number.POSITIVE_INFINITY;
    const rightDays = right.expiryDate
      ? daysUntilExpiry(right.expiryDate, today)
      : Number.POSITIVE_INFINITY;
    return (
      leftDays - rightDays ||
      left.createdAt.localeCompare(right.createdAt) ||
      left.name.localeCompare(right.name)
    );
  });
}

export function getUseFirstItems(
  items: readonly InventoryItem[],
  today = new Date(),
  withinDays = 3,
) {
  return sortByUseFirst(items, today).filter(
    (item) =>
      item.expiryDate !== null &&
      daysUntilExpiry(item.expiryDate, today) <= withinDays,
  );
}
