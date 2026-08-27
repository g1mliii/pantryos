import { useMemo, useState } from "react";
import {
  InventoryForm,
  type InventoryFormMode,
} from "../components/kitchen/InventoryForm";
import { InventorySection } from "../components/kitchen/InventorySection";
import { Button, PageIntro } from "../components/ui";
import { groupInventoryByLocation } from "../domain/inventory";
import { capitalize, spellNumber } from "../domain/number-words";
import { formatQuantity } from "../domain/units";
import type { InventoryItem, Location } from "../schemas/inventory";
import { requestConfirmation } from "../stores/confirmation-store";
import { useKitchenStore } from "../stores/kitchen-store";

interface OpenForm {
  initialLocation?: Location;
  item?: InventoryItem;
  mode: InventoryFormMode;
}

const LOCATIONS: readonly Location[] = ["fridge", "pantry", "freezer"];

function countLabel(count: number) {
  if (count === 0) return "Nothing here";
  if (count === 1) return "One thing";
  return `${capitalize(spellNumber(count))} things`;
}

export function KitchenPage() {
  const inventory = useKitchenStore((state) => state.inventory);
  const removeInventory = useKitchenStore((state) => state.removeInventory);
  const [openForm, setOpenForm] = useState<OpenForm | null>(null);
  const today = useMemo(() => new Date(), []);
  const groups = useMemo(
    () => groupInventoryByLocation(inventory, today),
    [inventory, today],
  );

  async function confirmRemove(item: InventoryItem) {
    const decision = await requestConfirmation({
      cancelLabel: "Keep it",
      confirmLabel: "Throw it out",
      description: `This removes ${formatQuantity(item)} from the ${item.location}. It cannot be undone.`,
      eyebrow: "Before anything is thrown away",
      title: `Throw out ${item.name}?`,
    });
    if (decision !== "confirmed") return;

    removeInventory(item.id);
    if (openForm?.item?.id === item.id) setOpenForm(null);
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-8">
        <PageIntro eyebrow={countLabel(inventory.length)} title="The kitchen" />
        <Button onClick={() => setOpenForm({ mode: "add" })}>
          Put something in
        </Button>
      </div>

      {openForm ? (
        <InventoryForm
          initialLocation={openForm.initialLocation}
          item={openForm.item}
          key={`${openForm.mode}-${openForm.item?.id ?? openForm.initialLocation ?? "fridge"}`}
          mode={openForm.mode}
          onClose={() => setOpenForm(null)}
        />
      ) : null}

      <div className="mt-14 space-y-13">
        {LOCATIONS.map((location) => (
          <InventorySection
            items={groups[location]}
            key={location}
            location={location}
            onAdd={(initialLocation) =>
              setOpenForm({ initialLocation, mode: "add" })
            }
            onConsume={(item) => setOpenForm({ item, mode: "consume" })}
            onEdit={(item) => setOpenForm({ item, mode: "edit" })}
            onRemove={(item) => void confirmRemove(item)}
            today={today}
          />
        ))}
      </div>
    </>
  );
}
