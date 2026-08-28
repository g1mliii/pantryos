import { useState, type FormEvent } from "react";
import { Button, FieldCaption, Select, TextField } from "../ui";
import {
  describeGroceryError,
  type GroceryAddResult,
} from "../../domain/groceries";
import type { GroceryDraft } from "../../schemas/grocery";
import type { DisplayUnit } from "../../schemas/inventory";

const UNIT_OPTIONS: Array<{ label: string; value: DisplayUnit }> = [
  { label: "count", value: "count" },
  { label: "g", value: "g" },
  { label: "kg", value: "kg" },
  { label: "ml", value: "ml" },
  { label: "L", value: "l" },
  { label: "package", value: "package" },
  { label: "serving", value: "serving" },
];

interface GroceryFormProps {
  onAdd: (draft: GroceryDraft) => GroceryAddResult;
  onCancel: () => void;
}

export function GroceryForm({ onAdd, onCancel }: GroceryFormProps) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<DisplayUnit>("count");
  const [error, setError] = useState<string>();

  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const result = onAdd({
        name,
        ...(quantity === "" ? {} : { quantity: Number(quantity), unit }),
      });
      if (result.added.length === 0) {
        setError(result.skipped[0]?.reason ?? "Already on the list");
        return;
      }
      setName("");
      setQuantity("");
      setError(undefined);
      onCancel();
    } catch (caught) {
      setError(describeGroceryError(caught));
    }
  }

  return (
    <form className="mt-6 border-y border-rule py-6" onSubmit={submit}>
      <div className="grid gap-5 sm:grid-cols-[1fr_130px_150px]">
        <TextField
          autoFocus
          error={error}
          label="Item"
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. bananas"
          value={name}
        />
        <TextField
          label="Quantity (optional)"
          min="0"
          onChange={(event) => setQuantity(event.target.value)}
          step="any"
          type="number"
          value={quantity}
        />
        <label className="block text-sm text-ink-soft">
          <FieldCaption>Unit</FieldCaption>
          <Select
            disabled={quantity === ""}
            label="Grocery unit"
            onChange={setUnit}
            options={UNIT_OPTIONS}
            value={unit}
          />
        </label>
      </div>
      <div className="mt-5 flex items-center gap-5">
        <Button type="submit">Add to list</Button>
        <Button onClick={onCancel} variant="quiet">
          Cancel
        </Button>
      </div>
    </form>
  );
}
