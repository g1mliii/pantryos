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
