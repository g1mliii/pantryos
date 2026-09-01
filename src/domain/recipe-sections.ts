/**
 * Ingredients and directions are both flat lists carrying an optional
 * `section`, rendered with a heading only where the section changes. Two
 * lists, one off-by-one boundary — so it lives here rather than inline twice.
 */
export function isNewSection(
  rows: readonly { section?: string }[],
  index: number,
) {
  const section = rows[index]?.section;
  return section !== undefined && section !== rows[index - 1]?.section;
}
