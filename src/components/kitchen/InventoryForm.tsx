import { useState, type FormEvent } from "react";
import {
  describeInventoryError,
  LOCATION_LABELS,
} from "../../domain/inventory";
import {
  areUnitsCompatible,
  fromCanonicalAmount,
  toCanonicalAmount,
} from "../../domain/units";
import type {
  DisplayUnit,
  InventoryItem,
  Location,
} from "../../schemas/inventory";
import { useKitchenStore } from "../../stores/kitchen-store";
import { Button, FieldCaption, Select, TextField } from "../ui";

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

const LOCATION_OPTIONS = Object.entries(LOCATION_LABELS).map(
  ([value, label]) => ({ label, value }),
);

/** Matches inputQuantitySchema, so the browser catches the ceiling first. */
const MAX_QUANTITY = 1_000_000;

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

  /**
   * The quantity is written in the selected unit, so switching g → kg has to
   * carry the amount across with it. Without this, 600 g silently becomes
   * 600 kg. Units that measure different things (g → count) leave the number
   * alone, because it is a genuinely different quantity.
   */
  function changeUnit(nextUnit: DisplayUnit) {
    const parsed = Number(quantity);
    if (quantity.trim() !== "" && Number.isFinite(parsed) && parsed > 0) {
      const current = toCanonicalAmount(parsed, unit);
      if (areUnitsCompatible(current.canonicalUnit, nextUnit)) {
        setQuantity(String(fromCanonicalAmount(current.quantity, nextUnit)));
      }
    }
    setUnit(nextUnit);
  }

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
      setError(describeInventoryError(caught));
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
            max={MAX_QUANTITY}
            min="0.000001"
            onChange={(event) => setQuantity(event.target.value)}
            required
            step="any"
            type="number"
            value={quantity}
          />
          <div>
            <FieldCaption>Unit</FieldCaption>
            <Select
              label="Unit"
              onChange={(value) => changeUnit(value as DisplayUnit)}
              options={[...UNIT_OPTIONS]}
              value={unit}
            />
          </div>
        </div>

        {mode !== "consume" ? (
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <FieldCaption>Location</FieldCaption>
              <Select
                label="Location"
                onChange={(value) => setLocation(value as Location)}
                options={LOCATION_OPTIONS}
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
