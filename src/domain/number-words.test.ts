import { describe, expect, it } from "vitest";
import { capitalize, pluralize, spellNumber } from "./number-words";

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

describe("pluralize", () => {
  it("uses the singular for one and the plural for everything else", () => {
    expect(pluralize(1, "item")).toBe("item");
    expect(pluralize(0, "item")).toBe("items");
    expect(pluralize(4, "item")).toBe("items");
  });

  it("takes an irregular plural when the default will not do", () => {
    expect(pluralize(1, "wants", "want")).toBe("wants");
    expect(pluralize(3, "thing wants", "things want")).toBe("things want");
  });
});
