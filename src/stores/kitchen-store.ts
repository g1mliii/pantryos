import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import {
  persist,
  type PersistStorage,
  type StorageValue,
} from "zustand/middleware";
import { z } from "zod";
import { clearAgentActivity } from "./agent-activity-store";
import { createDemoInventory } from "../data/demo-kitchen";
import { getAllRecipes, getRecipeById } from "../data/recipes";
import { createCustomRecipe } from "../domain/custom-recipes";
import {
  addGroceryItem,
  addMissingRecipeIngredients,
  clearCheckedGroceries,
  removeGroceryItem,
  setGroceryChecked,
  type GroceryAddResult,
} from "../domain/groceries";
import {
  addInventoryItem,
  consumeInventoryItem,
  editInventoryItem,
  normalizeInventoryName,
  removeInventoryItem,
} from "../domain/inventory";
import { matchRecipe } from "../domain/recipe-matching";
import {
  groceryItemSchema,
  type GroceryDraft,
  type GroceryItem,
} from "../schemas/grocery";
import {
  inventoryItemSchema,
  type InventoryConsumption,
  type InventoryDraft,
  type InventoryEdit,
  type InventoryItem,
} from "../schemas/inventory";
import {
  customRecipeDraftSchema,
  recipeSchema,
  type CustomRecipeDraft,
  type Recipe,
} from "../schemas/recipe";

export const KITCHEN_STORAGE_KEY = "pantryos-kitchen";
export const KITCHEN_SCHEMA_VERSION = 4;
const MAX_RECIPE_PHOTO_STORAGE = 2_000_000;
// add_recipe is unconfirmed, so an agent can call it in a loop. Without a
// ceiling the persisted payload grows until localStorage rejects the write,
// which takes the inventory and grocery list down with it.
const MAX_CUSTOM_RECIPES = 60;

// Items are validated one at a time in cleanPersistedState rather than as a
// typed array here. All-or-nothing validation would let a single unreadable row
// discard the whole kitchen, and the demo would then re-seed over the top of it.
const persistedKitchenSchema = z.object({
  hasInitialized: z.boolean(),
  inventory: z.array(z.unknown()),
  groceries: z.array(z.unknown()).optional(),
  customRecipes: z.array(z.unknown()).optional(),
});

// Versioning is persist's `version` option, not a field carried in state.
export interface PersistedKitchenState {
  hasInitialized: boolean;
  inventory: InventoryItem[];
  groceries: GroceryItem[];
  customRecipes: Recipe[];
}

export interface KitchenStoreState extends PersistedKitchenState {
  hasHydrated: boolean;
  addGrocery: (input: GroceryDraft) => GroceryAddResult;
  addInventory: (input: InventoryDraft) => InventoryItem;
  addCustomRecipe: (input: CustomRecipeDraft) => Recipe;
  addRecipeToGroceries: (
    recipeId: string,
    targetServings?: number,
  ) => GroceryAddResult;
  clearCheckedGroceries: () => void;
  consumeInventory: (
    itemId: string,
    input?: InventoryConsumption,
  ) => InventoryItem;
  editInventory: (itemId: string, input: InventoryEdit) => InventoryItem;
  initialize: () => void;
  removeInventory: (itemId: string) => InventoryItem;
  removeGrocery: (itemId: string) => void;
  resetDemo: () => void;
  setGroceryChecked: (itemId: string, checked: boolean) => void;
  setHasHydrated: (value: boolean) => void;
}

interface KitchenStoreOptions {
  now?: () => Date;
  storage?: PersistStorage<PersistedKitchenState>;
}

function cleanPersistedState(value: unknown): PersistedKitchenState | null {
  const parsed = persistedKitchenSchema.safeParse(value);
  if (!parsed.success) return null;
  const inventory: InventoryItem[] = [];
  for (const candidate of parsed.data.inventory) {
    const item = inventoryItemSchema.safeParse(candidate);
    if (item.success) {
      inventory.push({
        ...item.data,
        normalizedName: normalizeInventoryName(item.data.name),
      });
    }
  }
  const groceries: GroceryItem[] = [];
  for (const candidate of parsed.data.groceries ?? []) {
    const item = groceryItemSchema.safeParse(candidate);
    if (item.success) groceries.push(item.data);
  }
  const customRecipes: Recipe[] = [];
  for (const candidate of parsed.data.customRecipes ?? []) {
    const recipe = recipeSchema.safeParse(candidate);
    if (recipe.success && recipe.data.id.startsWith("custom-")) {
      customRecipes.push(recipe.data);
    }
  }
  return {
    hasInitialized: parsed.data.hasInitialized,
    inventory,
    groceries,
    customRecipes,
  };
}

/**
 * localStorage throws outright in Safari private mode, with cookies blocked,
 * and inside a third-party iframe, and its stored value can be corrupt. Either
 * would otherwise leave the app permanently unhydrated, so fall back to memory
 * and drop a payload that will not parse instead of failing the load.
 */
function createResilientStorage(): PersistStorage<PersistedKitchenState> {
  const fallback = new Map<string, string>();

  function read(name: string) {
    try {
      return localStorage.getItem(name);
    } catch {
      return fallback.get(name) ?? null;
    }
  }

  function write(name: string, value: string) {
    try {
      localStorage.setItem(name, value);
    } catch (error) {
      // Memory keeps this session working, but the kitchen is no longer being
      // saved. Say so rather than losing everything silently on reload.
      console.warn("Kitchen state could not be saved to this browser", error);
      fallback.set(name, value);
    }
  }

  function drop(name: string) {
    try {
      localStorage.removeItem(name);
    } catch {
      // Unreachable storage has nothing to remove.
    }
    fallback.delete(name);
  }

  return {
    getItem: (name) => {
      const raw = read(name);
      if (raw === null) return null;
      try {
        return JSON.parse(raw) as StorageValue<PersistedKitchenState>;
      } catch {
        drop(name);
        return null;
      }
    },
    setItem: (name, value) => {
      write(name, JSON.stringify(value));
    },
    removeItem: (name) => {
      drop(name);
    },
  };
}

export function createKitchenStore(options: KitchenStoreOptions = {}) {
  const now = options.now ?? (() => new Date());
  const storage = options.storage ?? createResilientStorage();

  // Synchronous storage rehydrates while the store is still being built, so a
  // failure there arrives before the store exists to be repaired — and before
  // `get()` returns anything, because zustand assigns the store's state only
  // after the creator returns. Recover immediately when the store is there,
  // and defer to just after construction when it is not.
  let store: { getState: () => KitchenStoreState } | undefined = undefined;
  let deferredRecovery = false;

  function openDegradedKitchen() {
    const current = store?.getState();
    if (!current) return false;
    if (!current.hasHydrated) {
      current.initialize();
      current.setHasHydrated(true);
    }
    return true;
  }

  const created = createStore<KitchenStoreState>()(
    persist(
      (set, get) => {
        return {
          hasInitialized: false,
          inventory: [],
          groceries: [],
          customRecipes: [],
          hasHydrated: false,
          initialize: () => {
            if (get().hasInitialized) return;
            set({
              hasInitialized: true,
              inventory: createDemoInventory(now()),
              groceries: [],
              customRecipes: [],
            });
          },
          setHasHydrated: (value) => set({ hasHydrated: value }),
          resetDemo: () => {
            clearAgentActivity();
            set({
              hasInitialized: true,
              inventory: createDemoInventory(now()),
              groceries: [],
              customRecipes: [],
            });
          },
          addCustomRecipe: (input) => {
            const draft = customRecipeDraftSchema.parse(input);
            if (get().customRecipes.length >= MAX_CUSTOM_RECIPES) {
              throw new Error(
                `This kitchen holds up to ${MAX_CUSTOM_RECIPES} saved recipes. Remove one before adding another.`,
              );
            }
            const photoBytes = get().customRecipes.reduce(
              (total, recipe) => total + (recipe.photo?.dataUrl.length ?? 0),
              draft.photo?.dataUrl.length ?? 0,
            );
            if (photoBytes > MAX_RECIPE_PHOTO_STORAGE) {
              throw new Error(
                "Recipe photos have reached this browser's 2 MB storage limit.",
              );
            }
            const recipe = createCustomRecipe(
              getAllRecipes(get().customRecipes),
              draft,
            );
            set({ customRecipes: [...get().customRecipes, recipe] });
            return recipe;
          },
          addGrocery: (input) => {
            const result = addGroceryItem(get().groceries, input, now());
            set({ groceries: result.items });
            return result;
          },
          addRecipeToGroceries: (recipeId, targetServings) => {
            const recipe = getRecipeById(
              recipeId,
              getAllRecipes(get().customRecipes),
            );
            if (!recipe) throw new Error(`No recipe has id "${recipeId}".`);
            const match = matchRecipe(recipe, get().inventory, now());
            const result = addMissingRecipeIngredients(
              get().groceries,
              match,
              now(),
              targetServings === undefined
                ? 1
                : targetServings / recipe.servings,
            );
            set({ groceries: result.items });
            return result;
          },
          setGroceryChecked: (itemId, checked) =>
            set({
              groceries: setGroceryChecked(get().groceries, itemId, checked),
            }),
          removeGrocery: (itemId) =>
            set({ groceries: removeGroceryItem(get().groceries, itemId) }),
          clearCheckedGroceries: () =>
            set({ groceries: clearCheckedGroceries(get().groceries) }),
          addInventory: (input) => {
            const result = addInventoryItem(get().inventory, input, now());
            set({ inventory: result.items });
            return result.item;
          },
          editInventory: (itemId, input) => {
            const result = editInventoryItem(
              get().inventory,
              itemId,
              input,
              now(),
            );
            set({ inventory: result.items });
            return result.item;
          },
          consumeInventory: (itemId, input) => {
            const result = consumeInventoryItem(
              get().inventory,
              itemId,
              input,
              now(),
            );
            set({ inventory: result.items });
            return result.item;
          },
          removeInventory: (itemId) => {
            const result = removeInventoryItem(get().inventory, itemId);
            set({ inventory: result.items });
            return result.item;
          },
        };
      },
      {
        name: KITCHEN_STORAGE_KEY,
        version: KITCHEN_SCHEMA_VERSION,
        storage,
        partialize: (state) => ({
          hasInitialized: state.hasInitialized,
          inventory: state.inventory,
          groceries: state.groceries,
          customRecipes: state.customRecipes,
        }),
        // A migrated payload flows straight into merge, which is where the one
        // sanitising pass happens — for older versions and current ones alike.
        migrate: (persistedState) => persistedState as PersistedKitchenState,
        merge: (persistedState, currentState) => ({
          ...currentState,
          ...(cleanPersistedState(persistedState) ?? {}),
        }),
        onRehydrateStorage: () => (state, error) => {
          if (error) console.warn("Kitchen state could not be restored", error);
          if (state) {
            state.initialize();
            state.setHasHydrated(true);
            return;
          }
          // Hydration failed and handed back nothing. App gates every route on
          // hasHydrated, so stopping here would strand the whole UI on the
          // loading screen with no WebMCP tools registered.
          if (!openDegradedKitchen()) deferredRecovery = true;
        },
      },
    ),
  );

  store = created;
  if (deferredRecovery) openDegradedKitchen();
  return created;
}

export const kitchenStore = createKitchenStore();

export function useKitchenStore<T>(selector: (state: KitchenStoreState) => T) {
  return useStore(kitchenStore, selector);
}
