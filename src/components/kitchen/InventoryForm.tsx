import { useState, type FormEvent } from "react";
import { fromCanonicalAmount } from "../../domain/units";
import type {
  DisplayUnit,
  InventoryItem,
  Location,
} from "../../schemas/inventory";
import { useKitchenStore } from "../../stores/kitchen-store";
import { Button, Select, TextField } from "../ui";

export type InventoryFormMode = "add" | "consume" | "edit";

interface InventoryFormProps {
  initialLocation?: Location;
  item?: InventoryItem;
  mode: InventoryFormMode;
  onClose: () => void;
}

const UNIT_OPTIONS = [
  { label: "grams (g)", value: "g" },
  { label: "kilograms (kg)", value: "kg" },
  { label: "millilitres (ml)", value: "ml" },
  { label: "litres (L)", value: "l" },
  { label: "count", value: "count" },
  { label: "packages", value: "package" },
  { label: "servings", value: "serving" },
] as const;

const LOCATION_OPTIONS = [
  { label: "Fridge", value: "fridge" },
  { label: "Freezer", value: "freezer" },
  { label: "Pantry", value: "pantry" },
] as const;

export function InventoryForm({
  initialLocation = "fridge",
  item,
  mode,
  onClose,
}: InventoryFormProps) {
  const addInventory = useKitchenStore((state) => state.addInventory);
  const consumeInventory = useKitchenStore((state) => state.consumeInventory);
  const editInventory = useKitchenStore((state) => state.editInventory);
  const [name, setName] = useState(item?.name ?? "");
  const [quantity, setQuantity] = useState(
    item ? String(fromCanonicalAmount(item.quantity, item.displayUnit)) : "",
  );
  const [unit, setUnit] = useState<DisplayUnit>(item?.displayUnit ?? "g");
  const [location, setLocation] = useState<Location>(
    item?.location ?? initialLocation,
  );
  const [expiryDate, setExpiryDate] = useState(item?.expiryDate ?? "");
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsedQuantity = Number(quantity);
    try {
      if (mode === "consume" && item) {
        consumeInventory(item.id, { quantity: parsedQuantity, unit });
      } else if (mode === "edit" && item) {
        editInventory(item.id, {
          name,
          quantity: parsedQuantity,
          unit,
          location,
          expiryDate: expiryDate || null,
        });
      } else {
        addInventory({
          name,
          quantity: parsedQuantity,
          unit,
          location,
          expiryDate: expiryDate || null,
        });
      }
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to save item.",
      );
    }
  }

  const title =
    mode === "add"
      ? "Put something in"
      : mode === "edit"
        ? `Edit ${item?.name ?? "item"}`
        : `Use ${item?.name ?? "item"}`;

  return (
    <section
      aria-labelledby="inventory-form-title"
      className="mt-10 border-l-[3px] border-copper bg-paper-sunk px-6 py-6"
    >
      <h2 className="font-serif text-[28px]" id="inventory-form-title">
        {title}
      </h2>
      <form className="mt-6" onSubmit={submit}>
        {mode !== "consume" ? (
          <TextField
            label="Name"
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
            placeholder="Chicken breast"
            required
            value={name}
          />
        ) : null}

        <div
          className={`grid gap-5 ${mode === "consume" ? "sm:grid-cols-2" : "mt-5 sm:grid-cols-2"}`}
        >
          <TextField
            label={mode === "consume" ? "Amount used" : "Quantity"}
            min="0.000001"
            onChange={(event) => setQuantity(event.target.value)}
            required
            step="any"
            type="number"
            value={quantity}
          />
          <div>
            <span className="mb-2 block text-xs font-semibold tracking-[0.14em] text-ink-faint uppercase">
              Unit
            </span>
            <Select
              label="Unit"
              onChange={(value) => setUnit(value as DisplayUnit)}
              options={[...UNIT_OPTIONS]}
              value={unit}
            />
          </div>
        </div>

        {mode !== "consume" ? (
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <span className="mb-2 block text-xs font-semibold tracking-[0.14em] text-ink-faint uppercase">
                Location
              </span>
              <Select
                label="Location"
                onChange={(value) => setLocation(value as Location)}
                options={[...LOCATION_OPTIONS]}
                value={location}
              />
            </div>
            <TextField
              label="Expiry date (optional)"
              onChange={(event) => setExpiryDate(event.target.value)}
              type="date"
              value={expiryDate}
            />
          </div>
        ) : null}

        {error ? (
          <p className="mt-5 border-l-2 border-urgent pl-3 text-sm text-urgent">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex items-center gap-5">
          <Button type="submit">
            {mode === "add"
              ? "Add it"
              : mode === "edit"
                ? "Save changes"
                : "Use it"}
          </Button>
          <Button onClick={onClose} variant="quiet">
            Cancel
          </Button>
        </div>
      </form>
    </section>
  );
}
