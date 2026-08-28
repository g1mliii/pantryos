import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { RecipeIngredientList } from "../components/recipes/RecipeIngredientList";
import { SectionHeading } from "../components/ui";
import { getRecipeById } from "../data/recipes";
import { matchRecipe } from "../domain/recipe-matching";
import { useKitchenStore } from "../stores/kitchen-store";
import { useToday } from "../stores/today-store";

export function RecipeDetailPage() {
  const { recipeId } = useParams();
  const inventory = useKitchenStore((state) => state.inventory);
  const addRecipeToGroceries = useKitchenStore(
    (state) => state.addRecipeToGroceries,
  );
  const today = useToday();
  const [notice, setNotice] = useState<string>();
  const recipe = recipeId ? getRecipeById(recipeId) : undefined;

  if (!recipe) {
    return (
      <>
        <p className="label-caps mb-[18px] text-copper">Recipe not found</p>
        <h1 className="font-serif text-[52px] font-light">
          That recipe is not here.
        </h1>
        <Link
          className="mt-8 inline-block border-b border-copper-mid pb-[3px] text-copper-deep hover:text-copper"
          to="/recipes"
        >
          ← Back to recipes
        </Link>
      </>
    );
  }

  const currentRecipe = recipe;
  const match = matchRecipe(currentRecipe, inventory, today);

  function addMissing() {
    const result = addRecipeToGroceries(currentRecipe.id);
    setNotice(
      result.added.length > 0
        ? `Added ${result.added.map((item) => item.name).join(" and ")} to groceries.`
        : "Nothing new was added — those ingredients are already on the list.",
    );
  }

  return (
    <>
      <Link
        className="mb-6 inline-block text-[13px] text-ink-faint hover:text-copper-deep"
        to="/recipes"
      >
        ← Back to recipes
      </Link>
      <h1 className="font-serif text-[62px] leading-[66px] font-light tracking-[-0.02em]">
        {currentRecipe.title}
      </h1>
      <p className="mt-4 max-w-[620px] font-serif text-[22px] leading-[34px] font-light text-ink-soft italic">
        {currentRecipe.description}
      </p>
      <p className="mt-5 text-[15px] text-ink-muted">
        {currentRecipe.totalMinutes} minutes · serves {currentRecipe.servings} ·{" "}
        <span className="font-medium text-copper-deep">
          you have {match.have.length} of the{" "}
          {match.have.length + match.missing.length}
        </span>
        {match.expiringUsed.length > 0 ? (
          <>
            {" "}
            ·{" "}
            <span className="font-medium text-urgent">
              uses {match.expiringUsed.length} things going off
            </span>
          </>
        ) : null}
      </p>
      <div aria-hidden="true" className="mt-5 flex">
        <span className="h-0.5 w-[62px] bg-copper" />
        <span className="h-0.5 grow bg-rule" />
      </div>

      {notice ? (
        <p
          aria-live="polite"
          className="mt-7 border-l-[3px] border-copper bg-paper-sunk px-5 py-4 text-[15px] text-ink-muted"
        >
          {notice}
        </p>
      ) : null}

      <div className="mt-11 grid items-start gap-14 lg:grid-cols-[300px_1fr]">
        <RecipeIngredientList
          inventory={inventory}
          match={match}
          onAddMissing={addMissing}
          today={today}
        />
        <section>
          <SectionHeading>Method</SectionHeading>
          <ol>
            {currentRecipe.steps.map((step, index) => (
              <li className="flex gap-5 pt-5" key={step}>
                <span className="w-7 shrink-0 font-serif text-[26px] leading-[30px] font-light text-copper">
                  {index + 1}
                </span>
                <p className="text-base leading-[30px]">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
