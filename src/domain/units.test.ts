import { describe, expect, it } from "vitest";
import {
  areUnitsCompatible,
  fromCanonicalAmount,
  toCanonicalAmount,
} from "./units";

describe("unit handling", () => {
  it("canonicalizes kilograms to grams and litres to millilitres", () => {
    expect(toCanonicalAmount(1.5, "kg")).toEqual({
      canonicalUnit: "g",
      quantity: 1500,
    });
    expect(toCanonicalAmount(1, "l")).toEqual({
      canonicalUnit: "ml",
      quantity: 1000,
    });
    expect(fromCanonicalAmount(1500, "kg")).toBe(1.5);
  });

  it("keeps count, package, and serving distinct", () => {
    expect(areUnitsCompatible("count", "package")).toBe(false);
    expect(areUnitsCompatible("package", "serving")).toBe(false);
    expect(areUnitsCompatible("serving", "count")).toBe(false);
  });
});
