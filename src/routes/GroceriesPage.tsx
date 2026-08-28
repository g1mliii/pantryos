import { useState } from "react";
import { GroceryForm } from "../components/groceries/GroceryForm";
import { Button, TickBox } from "../components/ui";
import { getRecipeById } from "../data/recipes";
import { formatDisplayQuantity } from "../domain/units";
import { capitalize, pluralize, spellNumber } from "../domain/number-words";
import { useKitchenStore } from "../stores/kitchen-store";

export function GroceriesPage() {
  const groceries = useKitchenStore((state) => state.groceries);
  const addGrocery = useKitchenStore((state) => state.addGrocery);
  const clearCheckedGroceries = useKitchenStore(
    (state) => state.clearCheckedGroceries,
  );
  const removeGrocery = useKitchenStore((state) => state.removeGrocery);
  const setGroceryChecked = useKitchenStore((state) => state.setGroceryChecked);
  const [adding, setAdding] = useState(false);
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
            The list
          </h1>
        </div>
        {checkedCount > 0 ? (
          <Button onClick={clearCheckedGroceries} variant="quiet">
            Clear what's done
          </Button>
        ) : null}
      </div>

      <section className="mt-12 border-t-2 border-rule">
        {groceries.length === 0 ? (
          <p className="border-b border-rule-soft py-8 font-serif text-2xl text-ink-muted">
            Missing recipe ingredients and anything you add will appear here.
          </p>
        ) : (
          groceries.map((item) => {
            const recipe = item.sourceRecipeId
              ? getRecipeById(item.sourceRecipeId)
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
                  {recipe ? `for the ${recipe.title}` : "you added this"}
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
          Add something
        </Button>
      )}
    </>
  );
}
