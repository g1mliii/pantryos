import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { RecipeIngredientList } from "../components/recipes/RecipeIngredientList";
import { RecipeForm } from "../components/recipes/RecipeForm";
import { RecipeScaleControls } from "../components/recipes/RecipeScaleControls";
import { Button, SectionHeading } from "../components/ui";
import { getAllRecipes, getRecipeById } from "../data/recipes";
import { describeGroceryError } from "../domain/groceries";
import { joinNames } from "../domain/number-words";
import { matchRecipe } from "../domain/recipe-matching";
import { isNewSection } from "../domain/recipe-sections";
import {
  formatRecipeTiming,
  type RecipeUnitMode,
} from "../domain/recipe-units";
import { requestConfirmation } from "../stores/confirmation-store";
import { kitchenStore, useKitchenStore } from "../stores/kitchen-store";
import { useToday } from "../stores/today-store";

export function RecipeDetailPage() {
  const { recipeId } = useParams();
  const navigate = useNavigate();
  const inventory = useKitchenStore((state) => state.inventory);
  const customRecipes = useKitchenStore((state) => state.customRecipes);
  const editCustomRecipe = useKitchenStore((state) => state.editCustomRecipe);
  const removeCustomRecipe = useKitchenStore(
    (state) => state.removeCustomRecipe,
  );
  const addRecipeToGroceries = useKitchenStore(
    (state) => state.addRecipeToGroceries,
  );
  const today = useToday();
  const [notice, setNotice] = useState<string>();
  const [editing, setEditing] = useState(false);
  const [targetServings, setTargetServings] = useState<number>();
  const [unitMode, setUnitMode] = useState<RecipeUnitMode>("original");
  // Neither the recipe nor its inventory match depends on the serving or
  // unit controls, so scaling the recipe must not re-run either.
  const recipe = useMemo(
    () =>
      recipeId
        ? getRecipeById(recipeId, getAllRecipes(customRecipes))
        : undefined,
    [customRecipes, recipeId],
  );
  const match = useMemo(
    () => (recipe ? matchRecipe(recipe, inventory, today) : undefined),
    [inventory, recipe, today],
  );

  if (!recipe || !match) {
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

  const servings = targetServings ?? recipe.servings;
  const servingFactor = servings / recipe.servings;

  // Captured so the handler does not depend on narrowing `recipe`.
  const chosenRecipeId = recipe.id;
  const chosenRecipe = recipe;
  const isSavedRecipe = customRecipes.some(
    (candidate) => candidate.id === chosenRecipeId,
  );

  function addMissing() {
    // A scaled amount can fall outside what a grocery row accepts, and the
    // schema throws rather than returning a result. There is no error boundary
    // above this route, so a raw throw would blank the page.
    try {
      const result = addRecipeToGroceries(chosenRecipeId, servings);
      setNotice(
        result.added.length > 0
          ? `Added ${joinNames(result.added.map((item) => item.name))} to groceries.`
          : "Nothing new was added — those ingredients are already on the list.",
      );
    } catch (caught) {
      setNotice(`Nothing was added. ${describeGroceryError(caught)}`);
    }
  }

  async function deleteSavedRecipe() {
    const decision = await requestConfirmation({
      cancelLabel: "Keep recipe",
      confirmLabel: "Delete recipe",
      description:
        "This removes the saved recipe. Grocery items already added from it stay on your list. It cannot be undone.",
      eyebrow: "Before this recipe is deleted",
      title: `Delete ${chosenRecipe.title}?`,
    });
    if (decision !== "confirmed") return;

    const currentRecipe = kitchenStore
      .getState()
      .customRecipes.find((candidate) => candidate.id === chosenRecipeId);
    if (currentRecipe !== chosenRecipe) {
      setNotice(
        "That recipe changed while the confirmation was open. Review it and try again.",
      );
      return;
    }
    removeCustomRecipe(chosenRecipeId);
    navigate("/recipes", { replace: true });
  }

  if (editing) {
    return (
      <>
        <Link
          className="mb-6 inline-block text-[13px] text-ink-faint hover:text-copper-deep"
          to={`/recipes/${chosenRecipeId}`}
          onClick={(event) => {
            event.preventDefault();
            setEditing(false);
          }}
        >
          ← Back to recipe
        </Link>
        <p className="label-caps mb-[18px] text-copper">Edit saved recipe</p>
        <h1 className="font-serif text-[52px] leading-none font-light tracking-[-0.015em]">
          Keep the recipe yours
        </h1>
        <RecipeForm
          onCancel={() => setEditing(false)}
          onSave={(draft) => {
            const updated = editCustomRecipe(chosenRecipeId, draft);
            setEditing(false);
            setTargetServings(undefined);
            setNotice(`Saved changes to ${updated.title}.`);
            return updated;
          }}
          recipe={recipe}
        />
      </>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-5">
        <Link
          className="text-[13px] text-ink-faint hover:text-copper-deep"
          to="/recipes"
        >
          ← Back to recipes
        </Link>
        {isSavedRecipe ? (
          <div className="flex items-center gap-5">
            <Button onClick={() => setEditing(true)} variant="quiet">
              Edit recipe
            </Button>
            <Button onClick={deleteSavedRecipe} variant="quiet">
              Delete recipe
            </Button>
          </div>
        ) : null}
      </div>
      <h1 className="font-serif text-[62px] leading-[66px] font-light tracking-[-0.02em]">
        {recipe.title}
      </h1>
      {recipe.photo ? (
        <img
          alt={recipe.photo.alt}
          className="mt-7 aspect-[16/7] w-full border border-rule object-cover"
          src={recipe.photo.dataUrl}
        />
      ) : null}
      <p className="mt-4 max-w-[620px] font-serif text-[22px] leading-[34px] font-light text-ink-soft italic">
        {recipe.description}
      </p>
      <p className="mt-5 text-[15px] text-ink-muted">
        {formatRecipeTiming(recipe)} · serves {servings} ·{" "}
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

      <RecipeScaleControls
        baseServings={recipe.servings}
        onServingsChange={setTargetServings}
        onUnitModeChange={setUnitMode}
        servings={servings}
        unitMode={unitMode}
      />

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
          servingFactor={servingFactor}
          today={today}
          unitMode={unitMode}
        />
        <section>
          <SectionHeading>Method</SectionHeading>
          <ol>
            {recipe.steps.map((step, index) => (
              <li className="pt-5" key={`${step.instruction}-${index}`}>
                {isNewSection(recipe.steps, index) ? (
                  <p className="mb-2 text-xs font-semibold tracking-[0.12em] text-copper-deep uppercase">
                    {step.section}
                  </p>
                ) : null}
                <div className="flex gap-5">
                  <span className="w-7 shrink-0 font-serif text-[26px] leading-[30px] font-light text-copper">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-base leading-[30px]">
                      {step.instruction}
                    </p>
                    {step.note ? (
                      <p className="mt-2 border-l-2 border-copper-mid pl-4 text-sm leading-6 text-ink-muted italic">
                        Cook’s note: {step.note}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
