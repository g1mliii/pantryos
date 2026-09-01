import { Button, Select } from "../ui";
import { pluralize } from "../../domain/number-words";
import type { RecipeUnitMode } from "../../domain/recipe-units";

interface RecipeScaleControlsProps {
  baseServings: number;
  servings: number;
  onServingsChange: (servings: number) => void;
  unitMode: RecipeUnitMode;
  onUnitModeChange: (mode: RecipeUnitMode) => void;
}

const UNIT_OPTIONS = [
  { label: "Original units", value: "original" },
  { label: "Metric units", value: "metric" },
] satisfies Array<{ label: string; value: RecipeUnitMode }>;

export function RecipeScaleControls({
  baseServings,
  servings,
  onServingsChange,
  unitMode,
  onUnitModeChange,
}: RecipeScaleControlsProps) {
  return (
    <section
      aria-label="Recipe servings and units"
      className="mt-8 flex flex-wrap items-end gap-5 border-y border-rule py-5"
    >
      <div>
        <p className="mb-2 text-xs tracking-[0.12em] text-ink-faint uppercase">
          Make this for
        </p>
        <div className="flex items-center border border-rule-warm bg-paper-raised">
          <Button
            aria-label="Decrease servings"
            className="min-w-11 border-r border-rule-warm px-3 py-2.5"
            disabled={servings <= 1}
            onClick={() => onServingsChange(Math.max(1, servings - 1))}
            variant="quiet"
          >
            −
          </Button>
          <output
            aria-live="polite"
            className="min-w-[108px] px-4 text-center text-sm text-ink"
          >
            {servings} {pluralize(servings, "serving")}
          </output>
          <Button
            aria-label="Increase servings"
            className="min-w-11 border-l border-rule-warm px-3 py-2.5"
            disabled={servings >= 24}
            onClick={() => onServingsChange(Math.min(24, servings + 1))}
            variant="quiet"
          >
            +
          </Button>
        </div>
      </div>
      <div className="w-[180px]">
        <p className="mb-2 text-xs tracking-[0.12em] text-ink-faint uppercase">
          Show amounts in
        </p>
        <Select
          label="Ingredient units"
          onChange={onUnitModeChange}
          options={UNIT_OPTIONS}
          value={unitMode}
        />
      </div>
      {servings !== baseServings ? (
        <Button
          className="mb-2"
          onClick={() => onServingsChange(baseServings)}
          variant="quiet"
        >
          Reset to {baseServings}
        </Button>
      ) : null}
    </section>
  );
}
