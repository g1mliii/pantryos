import { Button, FreshnessMarker, SectionHeading } from "../ui";
import { getExpiryDetails } from "../../domain/expiry";
import {
  findUsableInventoryItem,
  type RecipeMatch,
} from "../../domain/recipe-matching";
import { distinctMissingIngredients } from "../../domain/groceries";
import { spellNumber } from "../../domain/number-words";
import { isNewSection } from "../../domain/recipe-sections";
import {
  formatRecipeAmount,
  type RecipeUnitMode,
} from "../../domain/recipe-units";
import type { InventoryItem } from "../../schemas/inventory";

interface RecipeIngredientListProps {
  inventory: readonly InventoryItem[];
  match: RecipeMatch;
  onAddMissing: () => void;
  servingFactor: number;
  today: Date;
  unitMode: RecipeUnitMode;
}

export function RecipeIngredientList({
  inventory,
  match,
  onAddMissing,
  servingFactor,
  today,
  unitMode,
}: RecipeIngredientListProps) {
  const listedIngredients = match.recipe.ingredients.filter(
    (ingredient) => !match.staples.includes(ingredient),
  );
  const missingNames = new Set(
    match.missing.map((ingredient) => ingredient.normalizedName),
  );
  const optionalMissingNames = new Set(
    match.optionalMissing.map((ingredient) => ingredient.normalizedName),
  );
  // Counts the rows the grocery list will gain, not the raw ingredient rows:
  // a name repeated across sections is merged into one item when added.
  const missingCount = distinctMissingIngredients(match.missing).length;
  const addLabel =
    missingCount === 0
      ? "Everything needed is covered"
      : missingCount === 1
        ? "Put it on the list"
        : missingCount === 2
          ? "Put both on the list"
          : `Put all ${spellNumber(missingCount)} on the list`;

  return (
    <section>
      <SectionHeading>You need</SectionHeading>
      <div>
        {listedIngredients.map((ingredient, index) => {
          const inventoryItem = findUsableInventoryItem(
            ingredient,
            inventory,
            today,
          );
          const isMissing = missingNames.has(ingredient.normalizedName);
          const isOptionalMissing = optionalMissingNames.has(
            ingredient.normalizedName,
          );
          const expiry = inventoryItem?.expiryDate
            ? getExpiryDetails(inventoryItem.expiryDate, today)
            : null;
          const showSection = isNewSection(listedIngredients, index);
          return (
            <div
              className="border-b border-rule-faint last:border-b-0"
              key={`${ingredient.normalizedName}-${index}`}
            >
              {showSection ? (
                <p className="pt-5 pb-1 text-xs font-semibold tracking-[0.12em] text-copper-deep uppercase">
                  {ingredient.section}
                </p>
              ) : null}
              <div className="flex items-baseline gap-3 py-3">
                <span
                  className={`w-[62px] shrink-0 text-sm ${isMissing ? "text-ink-ghost" : "text-ink-muted"}`}
                >
                  {formatRecipeAmount(ingredient, servingFactor, unitMode)}
                </span>
                <span
                  className={`grow font-serif text-xl ${isMissing ? "text-copper" : "text-ink"}`}
                >
                  {ingredient.name}
                </span>
                {expiry ? (
                  <FreshnessMarker
                    daysRemaining={expiry.daysRemaining ?? undefined}
                    label={expiry.label}
                    status={expiry.status}
                  />
                ) : isMissing ? (
                  <span className="bg-copper px-2 py-1 text-[11px] font-semibold tracking-[0.04em] text-paper uppercase">
                    To buy
                  </span>
                ) : isOptionalMissing ? (
                  <span className="text-[11px] font-semibold tracking-[0.08em] text-ink-faint uppercase">
                    Optional
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <Button
        className="mt-6"
        disabled={missingCount === 0}
        onClick={onAddMissing}
      >
        {addLabel}
      </Button>
      {match.staples.length > 0 ? (
        <div className="mt-8">
          <p className="text-xs tracking-[0.14em] text-ink-ghost uppercase">
            Assumed you have
          </p>
          <p className="mt-2 font-serif text-[17px] leading-7 text-ink-faint italic">
            {match.staples.map((ingredient) => ingredient.name).join(", ")}
          </p>
        </div>
      ) : null}
    </section>
  );
}
