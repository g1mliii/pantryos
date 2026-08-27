import { describe, expect, it } from "vitest";
import { createDemoInventory } from "../data/demo-kitchen";
import {
  getExpiryDetails,
  getUseFirstItems,
  parseLocalCalendarDate,
} from "./expiry";

const TODAY = new Date(2026, 7, 26, 23, 30);

describe("expiry helpers", () => {
  it("parses calendar dates in local time", () => {
    const parsed = parseLocalCalendarDate("2026-08-27");
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(7);
    expect(parsed.getDate()).toBe(27);
    expect(parsed.getHours()).toBe(0);
  });

  it.each([
    ["2026-08-25", "expired"],
    ["2026-08-26", "today"],
    ["2026-08-29", "soon"],
    ["2026-08-30", "safe"],
    [null, "none"],
  ] as const)("classifies %s as %s", (date, status) => {
    expect(getExpiryDetails(date, TODAY).status).toBe(status);
  });

  it("orders Use First deterministically and retains expired items", () => {
    const inventory = createDemoInventory(TODAY);
    const spinach = inventory.find((item) => item.id === "spinach");
    if (!spinach) throw new Error("Missing spinach fixture");
    spinach.expiryDate = "2026-08-25";
    expect(getUseFirstItems(inventory, TODAY).map((item) => item.id)).toEqual([
      "spinach",
      "chicken-breast",
      "greek-yogurt",
    ]);
  });
});
