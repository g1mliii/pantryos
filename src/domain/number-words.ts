/**
 * Small counts read as prose in PantryOS ("Three things want using soon"),
 * matching the serif, sentence-led voice of the artboards. Past twenty,
 * English needs hyphenation and digits read better, so we stop there.
 */
const WORDS = [
  "no",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
] as const;

/** Lowercase word for 0–20; the plain digits for anything else. */
export function spellNumber(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value >= WORDS.length) {
    return String(value);
  }
  return WORDS[value];
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Picks the form that agrees with a count. Recipes, groceries and the tool
 * summaries all need the same choice, so it lives here rather than as another
 * inline ternary per surface.
 */
export function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return count === 1 ? singular : plural;
}

/**
 * Joins names the way the copy reads them: "a", "a and b", "a, b and c".
 * Recipes, groceries and the tool summaries all list added items, so the
 * serial comma rule lives here rather than as `.join(" and ")` per surface.
 */
export function joinNames(names: readonly string[]): string {
  if (names.length < 2) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}
