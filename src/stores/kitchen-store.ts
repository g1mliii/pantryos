import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import {
  createJSONStorage,
  persist,
  type PersistStorage,
} from "zustand/middleware";
import { z } from "zod";
import { createDemoInventory } from "../data/demo-kitchen";
import {
  addInventoryItem,
  consumeInventoryItem,
  editInventoryItem,
  removeInventoryItem,
} from "../domain/inventory";
import {
  inventoryItemSchema,
  type InventoryConsumption,
  type InventoryDraft,
  type InventoryEdit,
  type InventoryItem,
} from "../schemas/inventory";

export const KITCHEN_STORAGE_KEY = "pantryos-kitchen";
export const KITCHEN_SCHEMA_VERSION = 1;

const persistedKitchenSchema = z
  .object({
    schemaVersion: z.literal(KITCHEN_SCHEMA_VERSION),
    hasInitialized: z.boolean(),
    inventory: z.array(inventoryItemSchema),
  })
  .strict();

export interface PersistedKitchenState {
  schemaVersion: typeof KITCHEN_SCHEMA_VERSION;
  hasInitialized: boolean;
  inventory: InventoryItem[];
}

export interface KitchenStoreState extends PersistedKitchenState {
  hasHydrated: boolean;
  addInventory: (input: InventoryDraft) => InventoryItem;
  consumeInventory: (
    itemId: string,
    input?: InventoryConsumption,
  ) => InventoryItem;
  editInventory: (itemId: string, input: InventoryEdit) => InventoryItem;
  initialize: () => void;
  removeInventory: (itemId: string) => InventoryItem;
  resetDemo: () => void;
  setHasHydrated: (value: boolean) => void;
}

const EMPTY_PERSISTED_STATE: PersistedKitchenState = {
  schemaVersion: KITCHEN_SCHEMA_VERSION,
  hasInitialized: false,
  inventory: [],
};

interface KitchenStoreOptions {
  now?: () => Date;
  storage?: PersistStorage<PersistedKitchenState>;
}

function cleanPersistedState(value: unknown): PersistedKitchenState | null {
  const parsed = persistedKitchenSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function createKitchenStore(options: KitchenStoreOptions = {}) {
  const now = options.now ?? (() => new Date());
  const storage =
    options.storage ??
    createJSONStorage<PersistedKitchenState>(() => localStorage);
  return createStore<KitchenStoreState>()(
    persist(
      (set, get) => ({
        schemaVersion: KITCHEN_SCHEMA_VERSION,
        hasInitialized: false,
        inventory: [],
        hasHydrated: false,
        initialize: () => {
          if (get().hasInitialized) return;
          set({
            schemaVersion: KITCHEN_SCHEMA_VERSION,
            hasInitialized: true,
            inventory: createDemoInventory(now()),
          });
        },
        setHasHydrated: (value) => set({ hasHydrated: value }),
        resetDemo: () =>
          set({
            schemaVersion: KITCHEN_SCHEMA_VERSION,
            hasInitialized: true,
            inventory: createDemoInventory(now()),
          }),
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
      }),
      {
        name: KITCHEN_STORAGE_KEY,
        version: KITCHEN_SCHEMA_VERSION,
        storage,
        partialize: (state) => ({
          schemaVersion: state.schemaVersion,
          hasInitialized: state.hasInitialized,
          inventory: state.inventory,
        }),
        migrate: (persistedState) =>
          cleanPersistedState(persistedState) ?? EMPTY_PERSISTED_STATE,
        merge: (persistedState, currentState) => ({
          ...currentState,
          ...(cleanPersistedState(persistedState) ?? {}),
        }),
        onRehydrateStorage: () => (state, error) => {
          if (error || !state) return;
          state.initialize();
          state.setHasHydrated(true);
        },
      },
    ),
  );
}

export const kitchenStore = createKitchenStore();

export function useKitchenStore<T>(selector: (state: KitchenStoreState) => T) {
  return useStore(kitchenStore, selector);
}
