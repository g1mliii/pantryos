import { describe, expect, it } from "vitest";
import { capitalize, spellNumber } from "./number-words";

describe("spellNumber", () => {
  it.each([
    [0, "no"],
    [1, "one"],
    [3, "three"],
    [13, "thirteen"],
    [20, "twenty"],
  ])("spells %i as %s", (value, expected) => {
    expect(spellNumber(value)).toBe(expected);
  });

  it("falls back to digits past twenty", () => {
    expect(spellNumber(21)).toBe("21");
    expect(spellNumber(148)).toBe("148");
  });

  it("leaves values that are not whole counts alone", () => {
    expect(spellNumber(-1)).toBe("-1");
    expect(spellNumber(2.5)).toBe("2.5");
    expect(spellNumber(Number.NaN)).toBe("NaN");
  });
});

describe("capitalize", () => {
  it("raises the first letter only", () => {
    expect(capitalize("thirteen")).toBe("Thirteen");
    expect(capitalize("no")).toBe("No");
  });

  it("is safe on an empty string", () => {
    expect(capitalize("")).toBe("");
  });
});
