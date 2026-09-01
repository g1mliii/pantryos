import { normalizeIngredientName } from "./normalize-ingredient";
import { slugify, uniqueId } from "./slug";
import {
  customRecipeDraftSchema,
  recipeSchema,
  type CustomRecipeDraft,
  type Recipe,
} from "../schemas/recipe";
import type { RecipeUnit } from "../schemas/recipe";

const UNIT_NAMES = new Map<string, RecipeUnit>([
  ["g", "g"],
  ["gram", "g"],
  ["grams", "g"],
  ["kg", "kg"],
  ["kilogram", "kg"],
  ["kilograms", "kg"],
  ["ml", "ml"],
  ["millilitre", "ml"],
  ["millilitres", "ml"],
  ["l", "l"],
  ["litre", "l"],
  ["litres", "l"],
  ["count", "count"],
  ["package", "package"],
  ["packages", "package"],
  ["serving", "serving"],
  ["servings", "serving"],
  ["tsp", "tsp"],
  ["teaspoon", "tsp"],
  ["teaspoons", "tsp"],
  ["tbsp", "tbsp"],
  ["tablespoon", "tbsp"],
  ["tablespoons", "tbsp"],
  ["cup", "cup"],
  ["cups", "cup"],
  ["oz", "oz"],
  ["ounce", "oz"],
  ["ounces", "oz"],
  ["lb", "lb"],
  ["pound", "lb"],
  ["pounds", "lb"],
]);

const UNICODE_FRACTIONS: Record<string, number> = {
  "¼": 1 / 4,
  "½": 1 / 2,
  "¾": 3 / 4,
  "⅐": 1 / 7,
  "⅑": 1 / 9,
  "⅒": 1 / 10,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅕": 1 / 5,
  "⅖": 2 / 5,
  "⅗": 3 / 5,
  "⅘": 4 / 5,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
  "⅛": 1 / 8,
  "⅜": 3 / 8,
  "⅝": 5 / 8,
  "⅞": 7 / 8,
};

const UNICODE_FRACTION_CHARS = Object.keys(UNICODE_FRACTIONS).join("");
const QUANTITY_PATTERN = String.raw`(?:\d+\s+\d+\/\d+|\d+\s*[${UNICODE_FRACTION_CHARS}]|\d+\/\d+|[${UNICODE_FRACTION_CHARS}]|\d+(?:\.\d+)?|\.\d+)`;
const UNIT_PATTERN =
  "kg|kilograms?|g|grams?|ml|millilitres?|l|litres?|count|packages?|servings?|tsp|teaspoons?|tbsp|tablespoons?|cups?|oz|ounces?|lb|pounds?";
const QUANTITY_WITH_UNIT = new RegExp(
  `^(${QUANTITY_PATTERN})\\s*(${UNIT_PATTERN})\\s+(.+)$`,
  "i",
);
const COUNTED_QUANTITY = new RegExp(`^(${QUANTITY_PATTERN})\\s+(.+)$`);

function parseRecipeQuantity(value: string) {
  const normalized = value.trim();
  const unicode = normalized.match(
    new RegExp(`^(\\d+)?\\s*([${UNICODE_FRACTION_CHARS}])$`),
  );
  if (unicode) {
    return Number(unicode[1] ?? 0) + UNICODE_FRACTIONS[unicode[2]!]!;
  }
  const fraction = normalized.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
  if (fraction) {
    const denominator = Number(fraction[3]);
    if (denominator === 0) return undefined;
    return Number(fraction[1] ?? 0) + Number(fraction[2]) / denominator;
  }
  const decimal = Number(normalized);
  return Number.isFinite(decimal) ? decimal : undefined;
}

/** Every quantity the parser accepts must be readable, or the row is a typo. */
function requireQuantity(value: string, line: string) {
  const quantity = parseRecipeQuantity(value);
  if (quantity === undefined) {
    throw new Error(`Use a valid ingredient quantity in "${line}".`);
  }
  return quantity;
}

function customRecipeId(title: string, recipes: readonly Recipe[]) {
  return uniqueId(
    `custom-${slugify(title, "recipe")}`,
    new Set(recipes.map((recipe) => recipe.id)),
  );
}

function recipeFromDraft(id: string, input: CustomRecipeDraft) {
  const draft = customRecipeDraftSchema.parse(input);
  return recipeSchema.parse({
    ...draft,
    id,
    totalMinutes:
      draft.totalMinutes ?? (draft.prepMinutes ?? 0) + (draft.cookMinutes ?? 0),
    ingredients: draft.ingredients.map((ingredient) => ({
      ...ingredient,
      normalizedName: normalizeIngredientName(ingredient.name),
    })),
  });
}

/**
 * One pass over the pasted block, handing back each content line with the
 * "[Section]" heading currently in force. Ingredients and directions share
 * the same hand-authored section syntax, so they share the reader.
 */
function splitSectionedLines(
  value: string,
  clean: (line: string) => string = (line) => line.trim(),
) {
  let section: string | undefined;
  const rows: Array<{ line: string; section?: string }> = [];
  for (const raw of value.split(/\r?\n/)) {
    const line = clean(raw);
    if (!line) continue;
    const heading = line.match(/^\[(.*)]$/);
    if (heading) {
      section = heading[1]!.trim() || undefined;
      continue;
    }
    rows.push({ line, ...(section ? { section } : {}) });
  }
  return rows;
}

export function createCustomRecipe(
  recipes: readonly Recipe[],
  input: CustomRecipeDraft,
) {
  const draft = customRecipeDraftSchema.parse(input);
  return recipeFromDraft(customRecipeId(draft.title, recipes), draft);
}

export function updateCustomRecipe(recipe: Recipe, input: CustomRecipeDraft) {
  if (!recipe.id.startsWith("custom-")) {
    throw new Error("Only saved recipes can be edited.");
  }
  return recipeFromDraft(recipe.id, input);
}

export function parseRecipeIngredients(value: string) {
  return splitSectionedLines(value).map(({ line, section }) => {
    const optional = /\s*\(optional\)\s*$/i.test(line);
    const withoutOptional = line.replace(/\s*\(optional\)\s*$/i, "").trim();
    const common = {
      ...(optional ? { optional: true } : {}),
      ...(section ? { section } : {}),
    };
    const withUnit = withoutOptional.match(QUANTITY_WITH_UNIT);
    if (withUnit) {
      return {
        name: withUnit[3]!.trim(),
        quantity: requireQuantity(withUnit[1]!, line),
        displayUnit: UNIT_NAMES.get(withUnit[2]!.toLowerCase())!,
        ...common,
      };
    }
    const counted = withoutOptional.match(COUNTED_QUANTITY);
    if (counted) {
      return {
        name: counted[2]!.trim(),
        quantity: requireQuantity(counted[1]!, line),
        displayUnit: "count" as const,
        ...common,
      };
    }
    return { name: withoutOptional, ...common };
  });
}

export function parseRecipeSteps(value: string) {
  const stripNumbering = (line: string) =>
    line.trim().startsWith("\\:")
      ? line.trim()
      : line.trim().replace(/^\d+[.)]\s*/, "");
  return splitSectionedLines(value, stripNumbering).map(({ line, section }) => {
    const [instruction, note] = splitStepNote(line);
    return {
      instruction: unescapeFormText(instruction.trim()),
      ...(section ? { section: unescapeFormText(section) } : {}),
      ...(note ? { note: unescapeFormText(note.trim()) } : {}),
    };
  });
}

function splitStepNote(line: string): [string, string?] {
  const separators = line.matchAll(/\s+\|\s+/g);
  for (const separator of separators) {
    const match = separator[0];
    const pipeIndex = separator.index! + match.indexOf("|");
    let slashCount = 0;
    for (let index = pipeIndex - 1; line[index] === "\\"; index -= 1) {
      slashCount += 1;
    }
    if (slashCount % 2 === 0) {
      return [
        line.slice(0, separator.index),
        line.slice(separator.index! + match.length),
      ];
    }
  }
  return [line];
}

function escapeFormText(value: string, protectLeadingSyntax = false) {
  const needsEscaping =
    /[\\\r\n|]/.test(value) ||
    (protectLeadingSyntax &&
      (/^\d+[.)]\s/.test(value) || /^\[.*]$/.test(value)));
  if (!needsEscaping) return value;
  return `\\:${value
    .replaceAll("\\", "\\\\")
    .replaceAll("\r", "\\r")
    .replaceAll("\n", "\\n")
    .replaceAll("|", "\\|")}`;
}

function unescapeFormText(value: string) {
  if (!value.startsWith("\\:")) return value;
  value = value.slice(2);
  let result = "";
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]!;
    if (character !== "\\" || index === value.length - 1) {
      result += character;
      continue;
    }
    const next = value[index + 1]!;
    if (next === "n") result += "\n";
    else if (next === "r") result += "\r";
    else if (next === "\\" || next === "|") {
      result += next;
    } else {
      result += `\\${next}`;
    }
    index += 1;
  }
  return result;
}

function sectionedLines<T extends { section?: string }>(
  rows: readonly T[],
  format: (row: T) => string,
  formatSection: (section: string) => string = (section) => section,
) {
  const lines: string[] = [];
  let activeSection: string | undefined;
  for (const row of rows) {
    if (row.section !== activeSection) {
      lines.push(`[${formatSection(row.section ?? "")}]`);
      activeSection = row.section;
    }
    lines.push(format(row));
  }
  return lines.join("\n");
}

export function formatRecipeIngredientsForForm(recipe: Recipe) {
  return sectionedLines(recipe.ingredients, (ingredient) => {
    const amount =
      ingredient.quantity === undefined
        ? ""
        : `${ingredient.quantity} ${ingredient.displayUnit} `;
    return `${amount}${ingredient.name}${ingredient.optional ? " (optional)" : ""}`;
  });
}

export function formatRecipeStepsForForm(recipe: Recipe) {
  return sectionedLines(
    recipe.steps,
    (step) => {
      const instruction = escapeFormText(step.instruction, true);
      return step.note
        ? `${instruction} | ${escapeFormText(step.note)}`
        : instruction;
    },
    escapeFormText,
  );
}
