import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import {
  persist,
  type PersistStorage,
  type StorageValue,
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

// Items are validated one at a time in cleanPersistedState rather than as a
// typed array here. All-or-nothing validation would let a single unreadable row
// discard the whole kitchen, and the demo would then re-seed over the top of it.
const persistedKitchenSchema = z.object({
  hasInitialized: z.boolean(),
  inventory: z.array(z.unknown()),
});

// Versioning is persist's `version` option, not a field carried in state.
export interface PersistedKitchenState {
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
    if (item.success) inventory.push(item.data);
  }
  return { hasInitialized: parsed.data.hasInitialized, inventory };
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
    } catch {
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
          hasHydrated: false,
          initialize: () => {
            if (get().hasInitialized) return;
            set({
              hasInitialized: true,
              inventory: createDemoInventory(now()),
            });
          },
          setHasHydrated: (value) => set({ hasHydrated: value }),
          resetDemo: () =>
            set({
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
        };
      },
      {
        name: KITCHEN_STORAGE_KEY,
        version: KITCHEN_SCHEMA_VERSION,
        storage,
        partialize: (state) => ({
          hasInitialized: state.hasInitialized,
          inventory: state.inventory,
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
