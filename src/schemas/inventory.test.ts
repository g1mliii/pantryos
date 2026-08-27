import { describe, expect, it } from "vitest";
import { inventoryDraftSchema, localCalendarDateSchema } from "./inventory";

describe("inventory schemas", () => {
  it("accepts valid local dates and rejects rolled-over dates", () => {
    expect(localCalendarDateSchema.parse("2028-02-29")).toBe("2028-02-29");
    expect(localCalendarDateSchema.safeParse("2027-02-29").success).toBe(false);
  });

  it("rejects unknown fields and non-positive quantities", () => {
    expect(
      inventoryDraftSchema.safeParse({
        name: "Milk",
        quantity: 0,
        unit: "l",
        location: "fridge",
        surprise: true,
      }).success,
    ).toBe(false);
  });
});
