/**
 * Readable ids for the things a person names: grocery rows and custom
 * recipes both want "sunday-tomato-soup" rather than a uuid, and both need
 * the same collision suffix, so the rule lives in one place.
 */
export function slugify(value: string, fallback: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("en-CA")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || fallback
  );
}

/** `base`, or the first `base-2`, `base-3`, … that nothing else has taken. */
export function uniqueId(base: string, used: ReadonlySet<string>) {
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}
