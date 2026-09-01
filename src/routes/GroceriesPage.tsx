import { useMemo, useState } from "react";
import { GroceryForm } from "../components/groceries/GroceryForm";
import { GroceryMealSuggestion } from "../components/groceries/GroceryMealSuggestion";
import { Button, Callout, SectionHeading, TickBox } from "../components/ui";
import { getAllRecipes, getRecipeById } from "../data/recipes";
import { describeGroceryError } from "../domain/groceries";
import { findRecipes } from "../domain/recipe-matching";
import { formatDisplayQuantity } from "../domain/units";
import {
  capitalize,
  joinNames,
  pluralize,
  spellNumber,
} from "../domain/number-words";
import { useKitchenStore } from "../stores/kitchen-store";
import { useToday } from "../stores/today-store";

export function GroceriesPage() {
  const groceries = useKitchenStore((state) => state.groceries);
  const inventory = useKitchenStore((state) => state.inventory);
  const customRecipes = useKitchenStore((state) => state.customRecipes);
  const addGrocery = useKitchenStore((state) => state.addGrocery);
  const addRecipeToGroceries = useKitchenStore(
    (state) => state.addRecipeToGroceries,
  );
  const clearCheckedGroceries = useKitchenStore(
    (state) => state.clearCheckedGroceries,
  );
  const removeGrocery = useKitchenStore((state) => state.removeGrocery);
  const setGroceryChecked = useKitchenStore((state) => state.setGroceryChecked);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string>();
  const today = useToday();
  const recipes = useMemo(() => getAllRecipes(customRecipes), [customRecipes]);
  const mealSuggestions = useMemo(
    () =>
      findRecipes(
        recipes,
        inventory,
        {
          maxMissingIngredients: 3,
          minMissingIngredients: 1,
          prioritizeExpiring: true,
        },
        today,
        3,
      ).results,
    [inventory, recipes, today],
  );
  const checkedCount = groceries.filter((item) => item.checked).length;
  const eyebrow =
    groceries.length === 0
      ? "Nothing on the list"
      : `${capitalize(spellNumber(groceries.length))} ${pluralize(groceries.length, "thing", "things")}, ${checkedCount === 0 ? "none" : spellNumber(checkedCount)} picked up`;

  return (
    <>
      <div className="flex items-end justify-between gap-8">
        <div>
          <p className="label-caps mb-[18px] text-copper">{eyebrow}</p>
          <h1 className="font-serif text-[52px] leading-none font-light tracking-[-0.015em]">
            Your grocery list
          </h1>
          <p className="mt-4 max-w-[620px] text-base leading-7 text-ink-muted">
            Add everyday items, or choose a meal and add only what your kitchen
            is missing.
          </p>
        </div>
        {checkedCount > 0 ? (
          <Button onClick={clearCheckedGroceries} variant="quiet">
            Clear what's done
          </Button>
        ) : null}
      </div>

      {mealSuggestions.length > 0 ? (
        <section className="mt-12">
          <SectionHeading meta="Based on your kitchen">
            Shop for a meal
          </SectionHeading>
          <p className="mt-4 text-sm leading-6 text-ink-muted">
            These meals make good use of food you already have. Nothing is added
            until you choose it.
          </p>
          <div className="mt-3">
            {mealSuggestions.map((match) => (
              <GroceryMealSuggestion
                key={match.recipe.id}
                match={match}
                onAdd={() => {
                  // addGroceryItem validates through Zod and throws; this route
                  // has no error boundary above it to catch that.
                  try {
                    const result = addRecipeToGroceries(match.recipe.id);
                    setNotice(
                      result.added.length > 0
                        ? `Added ${joinNames(result.added.map((item) => item.name))} for ${match.recipe.title}.`
                        : `The ingredients for ${match.recipe.title} are already on your list.`,
                    );
                  } catch (caught) {
                    setNotice(
                      `Nothing was added. ${describeGroceryError(caught)}`,
                    );
                  }
                }}
              />
            ))}
          </div>
        </section>
      ) : null}

      {notice ? (
        <Callout className="mt-8" padding="compact" role="status">
          {notice}
        </Callout>
      ) : null}

      <section className="mt-12">
        <SectionHeading
          meta={`${groceries.length} ${pluralize(groceries.length, "item")}`}
        >
          Your list
        </SectionHeading>
        {groceries.length === 0 ? (
          <p className="border-b border-rule-soft py-8 font-serif text-2xl text-ink-muted">
            Your list is empty. Add an item, or pick a meal above and PantryOS
            will add only what you still need.
          </p>
        ) : (
          groceries.map((item) => {
            const recipe = item.sourceRecipeId
              ? getRecipeById(item.sourceRecipeId, recipes)
              : undefined;
            return (
              <article
                className="flex flex-wrap items-center gap-x-[18px] gap-y-2 border-b border-rule-soft px-0.5 py-5"
                key={item.id}
              >
                <div className="min-w-56 grow">
                  <TickBox
                    checked={item.checked}
                    onChange={(checked) => setGroceryChecked(item.id, checked)}
                  >
                    {item.name}
                  </TickBox>
                </div>
                <span
                  className={`w-20 text-[15px] ${item.checked ? "text-ink-ghost" : "text-ink-muted"}`}
                >
                  {formatDisplayQuantity(item.quantity, item.displayUnit)}
                </span>
                <span
                  className={`w-44 text-right font-serif text-[17px] italic ${item.checked ? "text-ink-ghost" : "text-ink-faint"}`}
                >
                  {recipe ? `for ${recipe.title}` : "added by you"}
                </span>
                <Button
                  aria-label={`Remove ${item.name}`}
                  onClick={() => removeGrocery(item.id)}
                  variant="quiet"
                >
                  remove
                </Button>
              </article>
            );
          })
        )}
      </section>

      {adding ? (
        <GroceryForm onAdd={addGrocery} onCancel={() => setAdding(false)} />
      ) : (
        <Button className="mt-9" onClick={() => setAdding(true)}>
          Add an item
        </Button>
      )}
    </>
  );
}
