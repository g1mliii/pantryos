/**
 * Exact aliases applied after punctuation and whitespace normalization.
 * Fresh and canned tomato intentionally remain different canonical names.
 */
export const INGREDIENT_ALIASES = new Map<string, string>([
  ["baby spinach", "spinach"],
  ["spinach leaves", "spinach"],
  ["chicken", "chicken breast"],
  ["chicken breasts", "chicken breast"],
  ["greek yoghurt", "greek yogurt"],
  ["yoghurt", "greek yogurt"],
  ["onions", "onion"],
  ["yellow onion", "onion"],
  ["yellow onions", "onion"],
  ["garlic clove", "garlic"],
  ["garlic cloves", "garlic"],
  ["canned tomatoes", "canned tomato"],
  ["tinned tomato", "canned tomato"],
  ["tinned tomatoes", "canned tomato"],
  ["fresh tomatoes", "fresh tomato"],
  ["tomato", "fresh tomato"],
  ["tomatoes", "fresh tomato"],
  ["chickpeas", "chickpea"],
  ["garbanzo bean", "chickpea"],
  ["garbanzo beans", "chickpea"],
  ["eggs", "egg"],
  ["frozen peas", "frozen pea"],
  ["green onions", "green onion"],
  ["spring onion", "green onion"],
  ["spring onions", "green onion"],
  ["olive oil", "cooking oil"],
  ["vegetable oil", "cooking oil"],
]);
