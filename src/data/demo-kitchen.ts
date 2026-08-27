import { addDays, startOfDay } from "date-fns";
import { toLocalCalendarDate } from "../domain/expiry";
import { addInventoryItem } from "../domain/inventory";
import type { InventoryDraft, InventoryItem } from "../schemas/inventory";

interface DemoEntry extends Omit<InventoryDraft, "expiryDate"> {
  expiresInDays?: number;
}

const DEMO_ENTRIES: readonly DemoEntry[] = [
  {
    name: "Spinach",
    quantity: 200,
    unit: "g",
    location: "fridge",
    expiresInDays: 1,
  },
  {
    name: "Chicken breast",
    quantity: 600,
    unit: "g",
    location: "fridge",
    expiresInDays: 2,
  },
  {
    name: "Greek yogurt",
    quantity: 400,
    unit: "g",
    location: "fridge",
    expiresInDays: 3,
  },
  {
    name: "Milk",
    quantity: 1,
    unit: "l",
    location: "fridge",
    expiresInDays: 5,
  },
  {
    name: "Eggs",
    quantity: 8,
    unit: "count",
    location: "fridge",
    expiresInDays: 9,
  },
  { name: "Basmati rice", quantity: 1.5, unit: "kg", location: "pantry" },
  { name: "Onion", quantity: 3, unit: "count", location: "pantry" },
  { name: "Garlic", quantity: 1, unit: "count", location: "pantry" },
  { name: "Canned tomatoes", quantity: 2, unit: "count", location: "pantry" },
  { name: "Chickpeas", quantity: 2, unit: "count", location: "pantry" },
  { name: "Pasta", quantity: 500, unit: "g", location: "pantry" },
  { name: "Olive oil", quantity: 500, unit: "ml", location: "pantry" },
  { name: "Frozen peas", quantity: 500, unit: "g", location: "freezer" },
];

export function createDemoInventory(today = new Date()) {
  const seedDate = startOfDay(today);
  return DEMO_ENTRIES.reduce<InventoryItem[]>((items, entry, index) => {
    const { expiresInDays, ...draft } = entry;
    return addInventoryItem(
      items,
      {
        ...draft,
        expiryDate:
          expiresInDays === undefined
            ? null
            : toLocalCalendarDate(addDays(seedDate, expiresInDays)),
      },
      new Date(seedDate.getTime() + index),
    ).items;
  }, []);
}
