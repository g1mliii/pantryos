import { z } from "zod";
import { RECIPES, getRecipeById } from "../data/recipes";
import {
  daysUntilExpiry,
  getExpiryDetails,
  sortByUseFirst,
} from "../domain/expiry";
import {
  describeInventoryError,
  InventoryDomainError,
} from "../domain/inventory";
import { resolveInventoryItem } from "../domain/inventory-resolution";
import { findRecipes } from "../domain/recipe-matching";
import { formatDisplayQuantity, formatQuantity } from "../domain/units";
import {
  displayUnitSchema,
  inputQuantitySchema,
  locationSchema,
  type InventoryItem,
} from "../schemas/inventory";
import {
  requestConfirmation,
  type ConfirmationDecision,
} from "../stores/confirmation-store";
import { kitchenStore, type KitchenStoreState } from "../stores/kitchen-store";
import {
  createToolExecutor,
  toolFailure,
  toolSuccess,
  toToolJsonSchema,
} from "./tool-utils";

const toolName = z
  .string()
  .min(1, "Give the item a name")
  .max(120, "Keep the name to 120 characters or fewer")
  .regex(/\S/, "Give the item a name");
const toolId = z
  .string()
  .min(1, "Give the item id")
  .max(160, "Keep the item id to 160 characters or fewer")
  .regex(/\S/, "Give the item id");
const toolCalendarDate = z.iso.date({
  error: "Use a valid local YYYY-MM-DD calendar date",
});
const getInventoryInput = z
  .object({
    location: locationSchema
      .optional()
      .describe("Only return items stored in this kitchen location."),
    includeExpired: z
      .boolean()
      .optional()
      .describe(
        "Set true to include unusable expired items in a separate expired bucket.",
      ),
  })
  .strict();

const getExpiringInput = z
  .object({
    withinDays: z
      .number()
      .int()
      .min(0)
      .max(30)
      .optional()
      .describe(
        "Return non-expired items expiring from today through this many days; defaults to 3.",
      ),
  })
  .strict();

const addInventoryInput = z
  .object({
    name: toolName.describe("The food or ingredient name to add."),
    quantity: inputQuantitySchema.describe("How much is being added."),
    unit: displayUnitSchema.describe("The unit used by the quantity."),
    location: locationSchema.describe("Where the item is stored."),
    expiryDate: toolCalendarDate
      .nullable()
      .optional()
      .describe(
        "Optional local expiry date in YYYY-MM-DD form; use null when undated.",
      ),
  })
  .strict();

const locatorShape = {
  item: toolName
    .optional()
    .describe("An exact or unambiguous inventory item name."),
  itemId: toolId.optional().describe("The exact id returned by get_inventory."),
};

const consumeInventoryInput = z
  .object({
    ...locatorShape,
    quantity: inputQuantitySchema
      .optional()
      .describe("Amount used; omit with unit to consume the whole item."),
    unit: displayUnitSchema
      .optional()
      .describe(
        "Unit for quantity; omit with quantity to consume the whole item.",
      ),
  })
  .strict()
  .superRefine((input, context) => {
    if ((input.item === undefined) === (input.itemId === undefined)) {
      context.addIssue({
        code: "custom",
        message: "Provide exactly one of item or itemId",
      });
    }
    if ((input.quantity === undefined) !== (input.unit === undefined)) {
      context.addIssue({
        code: "custom",
        message: "Quantity and unit must be provided together",
      });
    }
  });

const removeInventoryInput = z
  .object(locatorShape)
  .strict()
  .refine(
    (input) => (input.item === undefined) !== (input.itemId === undefined),
    {
      message: "Provide exactly one of item or itemId",
    },
  );

const findRecipesInput = z
  .object({
    query: z
      .string()
      .max(120)
      .optional()
      .describe("Optional recipe title or ingredient search text."),
    maxMinutes: z
      .number()
      .int()
      .positive()
      .max(480)
      .optional()
      .describe("Only return recipes at or under this total time."),
    maxMissingIngredients: z
      .number()
      .int()
      .min(0)
      .max(40)
      .optional()
      .describe("Maximum missing required non-staple ingredients."),
    prioritizeExpiring: z
      .boolean()
      .optional()
      .describe("Set true to strongly favor recipes using food expiring soon."),
  })
  .strict();

const addGroceryInput = z
  .object({
    name: toolName.describe("The grocery item to add."),
    quantity: inputQuantitySchema
      .optional()
      .describe("Optional amount; must be paired with unit."),
    unit: displayUnitSchema
      .optional()
      .describe("Optional quantity unit; must be paired with quantity."),
  })
  .strict()
  .refine(
    (input) => (input.quantity === undefined) === (input.unit === undefined),
    {
      message: "Quantity and unit must be provided together",
    },
  );

const recipeIdInput = z
  .object({
    recipeId: z
      .string()
      .min(1)
      .max(160)
      .regex(/\S/, "Give the recipe id")
      .describe("The exact recipeId returned by find_recipes."),
  })
  .strict();

const noInput = z.object({}).strict();

const locatorJsonConstraint = {
  oneOf: [
    { required: ["item"], not: { required: ["itemId"] } },
    { required: ["itemId"], not: { required: ["item"] } },
  ],
};
const quantityPairJsonConstraint = {
  anyOf: [
    { required: ["quantity", "unit"] },
    {
      not: {
        anyOf: [{ required: ["quantity"] }, { required: ["unit"] }],
      },
    },
  ],
};

interface PantryToolDependencies {
  getKitchenState?: () => KitchenStoreState;
  now?: () => Date;
  requestConfirmation?: (
    request: Parameters<typeof requestConfirmation>[0],
    options?: Parameters<typeof requestConfirmation>[1],
  ) => Promise<ConfirmationDecision>;
}

function compactInventoryItem(item: InventoryItem, today: Date) {
  const freshness = getExpiryDetails(item.expiryDate, today);
  return {
    id: item.id,
    name: item.name,
    quantity: formatQuantity(item),
    location: item.location,
    expiryDate: item.expiryDate,
    freshness: freshness.label,
  };
}

function readableError(caught: unknown) {
  return {
    code:
      caught instanceof InventoryDomainError
        ? caught.code.toLowerCase()
        : "invalid_change",
    // The person and the agent read the same sentence for the same failure.
    message: describeInventoryError(caught),
  };
}

export function createPantryTools(
  dependencies: PantryToolDependencies = {},
): WebMCP.ModelContextTool[] {
  const getKitchenState = dependencies.getKitchenState ?? kitchenStore.getState;
  const now = dependencies.now ?? (() => new Date());
  const confirm = dependencies.requestConfirmation ?? requestConfirmation;

  return [
    {
      name: "get_inventory",
      title: "Read kitchen inventory",
      description:
        "Use to inspect the current fridge, freezer, or pantry before planning or changing food. Do not use for groceries or recipe instructions.",
      inputSchema: toToolJsonSchema(getInventoryInput),
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: createToolExecutor(
        "get_inventory",
        getInventoryInput,
        (input) => {
          const today = now();
          const all = getKitchenState().inventory.filter(
            (item) =>
              input.location === undefined || item.location === input.location,
          );
          const expired = all.filter(
            (item) =>
              item.expiryDate !== null &&
              daysUntilExpiry(item.expiryDate, today) < 0,
          );
          const expiredIds = new Set(expired.map((item) => item.id));
          const active = all.filter((item) => !expiredIds.has(item.id));
          const cap = 50;
          const perLocation = (["fridge", "freezer", "pantry"] as const).map(
            (location) => ({
              location,
              items: sortByUseFirst(
                active.filter((item) => item.location === location),
                today,
              ),
            }),
          );
          const shownExpired = input.includeExpired
            ? sortByUseFirst(expired, today).slice(0, cap)
            : [];
          const byLocation = Object.fromEntries(
            perLocation.map(({ location, items }) => [
              location,
              items
                .slice(0, cap)
                .map((item) => compactInventoryItem(item, today)),
            ]),
          );
          // Counts describe what this payload actually carries, so an agent
          // never reports items it was not given.
          const returned =
            perLocation.reduce(
              (total, { items }) => total + Math.min(items.length, cap),
              0,
            ) + shownExpired.length;
          const matching =
            active.length + (input.includeExpired ? expired.length : 0);
          const truncated = returned < matching;
          return toolSuccess(
            `Found ${returned} inventory ${returned === 1 ? "item" : "items"}${input.includeExpired ? ", including expired food" : ""}.`,
            {
              byLocation,
              ...(input.includeExpired
                ? {
                    expired: shownExpired.map((item) =>
                      compactInventoryItem(item, today),
                    ),
                  }
                : {}),
              returned,
              totalStored: matching,
              truncated,
            },
          );
        },
      ),
    },
    {
      name: "get_expiring_items",
      title: "Find food expiring soon",
      description:
        "Use to find non-expired inventory that should be used within a number of days. Do not use to include already expired food; call get_inventory with includeExpired instead.",
      inputSchema: toToolJsonSchema(getExpiringInput),
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: createToolExecutor(
        "get_expiring_items",
        getExpiringInput,
        (input) => {
          const today = now();
          const withinDays = input.withinDays ?? 3;
          // Filter before sorting: sortByUseFirst re-reads calendar dates on
          // every comparison, and only the matches need ordering.
          const matching = sortByUseFirst(
            getKitchenState().inventory.filter((item) => {
              if (!item.expiryDate) return false;
              const days = daysUntilExpiry(item.expiryDate, today);
              return days >= 0 && days <= withinDays;
            }),
            today,
          );
          const items = matching
            .slice(0, 50)
            .map((item) => compactInventoryItem(item, today));
          return toolSuccess(
            items.length === 0
              ? `Nothing expires in the next ${withinDays} days.`
              : `Found ${items.length} ${items.length === 1 ? "item" : "items"} to use within ${withinDays} days.`,
            {
              withinDays,
              items,
              totalMatches: matching.length,
              truncated: matching.length > 50,
            },
          );
        },
      ),
    },
    {
      name: "add_inventory_item",
      title: "Add food to the kitchen",
      description:
        "Use after the user states a food, amount, unit, and storage location to add. Do not use for shopping intentions; use add_grocery_item instead.",
      inputSchema: toToolJsonSchema(addInventoryInput),
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: createToolExecutor(
        "add_inventory_item",
        addInventoryInput,
        (input) => {
          const item = getKitchenState().addInventory(input);
          return toolSuccess(
            `Added ${item.name} (${formatQuantity(item)}) to the ${item.location}.`,
            { item: compactInventoryItem(item, now()) },
          );
        },
      ),
    },
    {
      name: "consume_inventory_item",
      title: "Use some or all inventory",
      description:
        "Use when the user says food was eaten, cooked, or otherwise used. Omit quantity and unit only when they clearly used all of it; do not use for spoilage or throwing food away.",
      inputSchema: toToolJsonSchema(consumeInventoryInput, {
        allOf: [locatorJsonConstraint, quantityPairJsonConstraint],
      }),
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: createToolExecutor(
        "consume_inventory_item",
        consumeInventoryInput,
        (input) => {
          const state = getKitchenState();
          const resolved = resolveInventoryItem(state.inventory, input);
          if (!resolved.ok) {
            return toolFailure(
              resolved.message,
              resolved.code,
              resolved.candidates,
            );
          }
          try {
            state.consumeInventory(
              resolved.item.id,
              input.quantity === undefined
                ? undefined
                : { quantity: input.quantity, unit: input.unit! },
            );
          } catch (caught) {
            const error = readableError(caught);
            return toolFailure(error.message, error.code);
          }
          const remaining = getKitchenState().inventory.find(
            (item) => item.id === resolved.item.id,
          );
          return remaining
            ? toolSuccess(
                `${remaining.name} is down to ${formatQuantity(remaining)}.`,
                {
                  item: compactInventoryItem(remaining, now()),
                  removed: false,
                },
              )
            : toolSuccess(
                `Used all of ${resolved.item.name}; it left the kitchen.`,
                {
                  itemId: resolved.item.id,
                  removed: true,
                },
              );
        },
      ),
    },
    {
      name: "remove_inventory_item",
      title: "Throw out inventory with approval",
      description:
        "Use only when the user wants food discarded rather than consumed. Always opens a human confirmation in PantryOS; do not assume chat wording alone authorizes removal.",
      inputSchema: toToolJsonSchema(
        removeInventoryInput,
        locatorJsonConstraint,
      ),
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: createToolExecutor(
        "remove_inventory_item",
        removeInventoryInput,
        async (input, options) => {
          const resolved = resolveInventoryItem(
            getKitchenState().inventory,
            input,
          );
          if (!resolved.ok) {
            return toolFailure(
              resolved.message,
              resolved.code,
              resolved.candidates,
            );
          }
          const item = resolved.item;
          const alsoStored = getKitchenState().inventory.filter(
            (candidate) =>
              candidate.id !== item.id &&
              candidate.normalizedName === item.normalizedName,
          ).length;
          const decision = await confirm(
            {
              cancelLabel: "Keep it",
              confirmLabel: "Throw it out",
              description:
                alsoStored > 0
                  ? `That takes ${formatQuantity(item)} out of the ${item.location}; ${alsoStored} more ${item.name} ${alsoStored === 1 ? "stays" : "stay"}. It cannot be undone.`
                  : `That is the last ${formatQuantity(item)}, out of the ${item.location}. It cannot be undone.`,
              eyebrow: "Your agent is asking",
              title: `Throw out ${item.name}?`,
            },
            { signal: options?.signal },
          );
          if (decision !== "confirmed") {
            return toolFailure(
              decision === "declined"
                ? `${item.name} stayed. Nothing changed.`
                : `Removal of ${item.name} was cancelled. Nothing changed.`,
              decision,
            );
          }
          const current = getKitchenState();
          if (
            !current.inventory.some((candidate) => candidate.id === item.id)
          ) {
            return toolFailure(
              `${item.name} is no longer in inventory. Call get_inventory before retrying.`,
              "item_not_found",
            );
          }
          current.removeInventory(item.id);
          return toolSuccess(
            `Removed ${item.name} from the ${item.location}.`,
            {
              itemId: item.id,
              removed: true,
            },
          );
        },
      ),
    },
    {
      name: "find_recipes",
      title: "Find recipes for this kitchen",
      description:
        "Use to rank up to five curated recipes by current ingredients, expiry urgency, time, and missing-item limits. Use get_recipe afterward for full instructions; do not invent recipes here.",
      inputSchema: toToolJsonSchema(findRecipesInput),
      // Curated recipes, but expiringUsed echoes stored inventory names.
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: createToolExecutor("find_recipes", findRecipesInput, (input) => {
        const search = findRecipes(
          RECIPES,
          getKitchenState().inventory,
          input,
          now(),
        );
        const results = search.results.map((match) => ({
          recipeId: match.recipe.id,
          title: match.recipe.title,
          totalMinutes: match.recipe.totalMinutes,
          servings: match.recipe.servings,
          have: match.have.length,
          required: match.have.length + match.missing.length,
          missing: match.missing.map((ingredient) => ingredient.name),
          optionalMissing: match.optionalMissing.map(
            (ingredient) => ingredient.name,
          ),
          expiringUsed: match.expiringUsed.map((item) => item.normalizedName),
          coverage: Number(match.coverage.toFixed(3)),
        }));
        return toolSuccess(
          results.length === 0
            ? "No curated recipes match those filters."
            : `${results.length} ${results.length === 1 ? "match" : "matches"}; ${results[0]!.title} ranks first.`,
          { results, totalMatches: search.totalMatches },
        );
      }),
    },
    {
      name: "get_recipe",
      title: "Read a curated recipe",
      description:
        "Use with a recipeId from find_recipes to read its ingredients and method. Do not use to search, rank, or change groceries.",
      inputSchema: toToolJsonSchema(recipeIdInput),
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: createToolExecutor("get_recipe", recipeIdInput, (input) => {
        const recipeId = input.recipeId.trim();
        const recipe = getRecipeById(recipeId);
        if (!recipe) {
          return toolFailure(
            `No curated recipe has id "${recipeId}". Call find_recipes for valid ids.`,
            "recipe_not_found",
          );
        }
        return toolSuccess(
          `Found ${recipe.title}, ready in ${recipe.totalMinutes} minutes.`,
          {
            recipeId: recipe.id,
            title: recipe.title,
            description: recipe.description,
            servings: recipe.servings,
            totalMinutes: recipe.totalMinutes,
            ingredients: recipe.ingredients.map((ingredient) => ({
              name: ingredient.name,
              quantity: formatDisplayQuantity(
                ingredient.quantity,
                ingredient.displayUnit,
              ),
              optional: ingredient.optional ?? false,
            })),
            steps: recipe.steps,
          },
        );
      }),
    },
    {
      name: "add_grocery_item",
      title: "Add one grocery item",
      description:
        "Use once per named shopping item the user wants added. Quantity and unit are optional together. Do not use for food already brought home; use add_inventory_item instead.",
      inputSchema: toToolJsonSchema(
        addGroceryInput,
        quantityPairJsonConstraint,
      ),
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: createToolExecutor(
        "add_grocery_item",
        addGroceryInput,
        (input) => {
          const result = getKitchenState().addGrocery(input);
          if (result.added.length === 0) {
            return toolSuccess(
              `${input.name.trim()} was already on the grocery list, so it was not changed.`,
              {
                added: [],
                skipped: [
                  {
                    name: input.name.trim(),
                    reason: result.skipped[0]?.reason,
                  },
                ],
              },
            );
          }
          const item = result.added[0]!;
          return toolSuccess(`Added ${item.name} to groceries.`, {
            added: [
              {
                id: item.id,
                name: item.name,
                quantity: formatDisplayQuantity(
                  item.quantity,
                  item.displayUnit,
                ),
              },
            ],
            skipped: [],
          });
        },
      ),
    },
    {
      name: "add_recipe_to_grocery_list",
      title: "Add a recipe's missing groceries",
      description:
        "Use after a recipe is chosen to add only its currently missing required non-staple ingredients. Do not add optional ingredients or duplicate existing grocery items.",
      inputSchema: toToolJsonSchema(recipeIdInput),
      // Curated recipes, but skipped[] echoes stored grocery names.
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: createToolExecutor(
        "add_recipe_to_grocery_list",
        recipeIdInput,
        (input) => {
          const recipeId = input.recipeId.trim();
          const recipe = getRecipeById(recipeId);
          if (!recipe) {
            return toolFailure(
              `No curated recipe has id "${recipeId}". Call find_recipes for valid ids.`,
              "recipe_not_found",
            );
          }
          const result = getKitchenState().addRecipeToGroceries(recipe.id);
          const added = result.added.map((item) => item.name);
          const skipped = result.skipped.map(({ item, reason }) => ({
            name: item.name,
            reason,
          }));
          return toolSuccess(
            added.length > 0
              ? `Added ${added.join(" and ")} for ${recipe.title}; skipped ${result.skipped.length} already listed.`
              : `Nothing new was added for ${recipe.title}; every missing item was already listed.`,
            {
              recipeId: recipe.id,
              added,
              skipped,
              skippedCount: skipped.length,
            },
          );
        },
      ),
    },
    {
      name: "get_grocery_list",
      title: "Read the grocery checklist",
      description:
        "Use to inspect the current grocery checklist and whether items were picked up. Do not use to read kitchen inventory or recipe ingredients.",
      inputSchema: toToolJsonSchema(noInput),
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: createToolExecutor("get_grocery_list", noInput, () => {
        const groceries = getKitchenState()
          .groceries.slice(0, 100)
          .map((item) => ({
            id: item.id,
            name: item.name,
            quantity: formatDisplayQuantity(item.quantity, item.displayUnit),
            checked: item.checked,
            sourceRecipeId: item.sourceRecipeId,
          }));
        const checked = groceries.filter((item) => item.checked).length;
        return toolSuccess(
          `${groceries.length} ${groceries.length === 1 ? "item" : "items"} on the grocery list; ${checked} checked.`,
          {
            items: groceries,
            truncated: getKitchenState().groceries.length > 100,
          },
        );
      }),
    },
  ];
}

export const PANTRY_TOOLS = createPantryTools();
