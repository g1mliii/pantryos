import { useState, type FormEvent } from "react";
import { ZodError } from "zod";
import { Button, TextArea, TextField } from "../ui";
import { RecipePhotoField } from "./RecipePhotoField";
import {
  formatRecipeIngredientsForForm,
  formatRecipeStepsForForm,
  parseRecipeIngredients,
  parseRecipeSteps,
} from "../../domain/custom-recipes";
import type { CustomRecipeDraft, Recipe } from "../../schemas/recipe";

interface RecipeFormProps {
  onCancel: () => void;
  onSave: (draft: CustomRecipeDraft) => Recipe;
  recipe?: Recipe;
}

// Zod reports the failing leaf (["ingredients", 2, "name"]), so name the row
// the writer has to go back to rather than blaming the list as a whole.
function readableError(caught: unknown) {
  if (caught instanceof ZodError) {
    const issue = caught.issues[0];
    if (!issue) return "Check the recipe and try again.";
    const [field, index] = issue.path;
    const position = typeof index === "number" ? index + 1 : undefined;
    if (field === "ingredients" && position !== undefined) {
      return `Ingredient ${position}: ${issue.message}`;
    }
    if (field === "steps" && position !== undefined) {
      return `Direction ${position}: ${issue.message}`;
    }
    return issue.message;
  }
  return caught instanceof Error
    ? caught.message
    : "That recipe could not be saved. Check the details and try again.";
}

export function RecipeForm({ onCancel, onSave, recipe }: RecipeFormProps) {
  const usesTotalTiming =
    recipe !== undefined &&
    recipe.prepMinutes === undefined &&
    recipe.cookMinutes === undefined;
  const [title, setTitle] = useState(recipe?.title ?? "");
  const [description, setDescription] = useState(recipe?.description ?? "");
  const [servings, setServings] = useState(String(recipe?.servings ?? 4));
  const [totalMinutes, setTotalMinutes] = useState(
    String(recipe?.totalMinutes ?? 20),
  );
  const [prepMinutes, setPrepMinutes] = useState(
    recipe ? String(recipe.prepMinutes ?? 0) : "10",
  );
  const [cookMinutes, setCookMinutes] = useState(
    String(recipe?.cookMinutes ?? 20),
  );
  const [photo, setPhoto] = useState<string | undefined>(
    recipe?.photo?.dataUrl,
  );
  const [ingredients, setIngredients] = useState(
    recipe ? formatRecipeIngredientsForForm(recipe) : "",
  );
  const [steps, setSteps] = useState(
    recipe ? formatRecipeStepsForForm(recipe) : "",
  );
  const [error, setError] = useState<string>();

  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const timing = usesTotalTiming
        ? { totalMinutes: Number(totalMinutes) }
        : {
            prepMinutes: Number(prepMinutes),
            cookMinutes: Number(cookMinutes),
          };
      onSave({
        title,
        description,
        servings: Number(servings),
        ...timing,
        ...(photo
          ? { photo: { dataUrl: photo, alt: `${title.trim()} recipe` } }
          : {}),
        ingredients: parseRecipeIngredients(ingredients),
        steps: parseRecipeSteps(steps),
      });
      setError(undefined);
    } catch (caught) {
      setError(readableError(caught));
    }
  }

  return (
    <form className="mt-8 border-y border-rule py-7" onSubmit={submit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <TextField
            autoFocus
            label="Recipe name"
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Sunday tomato soup"
            value={title}
          />
        </div>
        <div className="sm:col-span-2">
          <TextArea
            label="Short description"
            maxLength={500}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What makes this recipe worth cooking?"
            rows={2}
            value={description}
          />
        </div>
        <div className="sm:col-span-2">
          <RecipePhotoField onChange={setPhoto} title={title} value={photo} />
        </div>
        {usesTotalTiming ? (
          <TextField
            label="Total time (minutes)"
            max="960"
            min="1"
            onChange={(event) => setTotalMinutes(event.target.value)}
            type="number"
            value={totalMinutes}
          />
        ) : (
          <>
            <TextField
              label="Prep time (minutes)"
              max="480"
              min="0"
              onChange={(event) => setPrepMinutes(event.target.value)}
              type="number"
              value={prepMinutes}
            />
            <TextField
              label="Cooking time (minutes)"
              max="480"
              min="0"
              onChange={(event) => setCookMinutes(event.target.value)}
              type="number"
              value={cookMinutes}
            />
          </>
        )}
        <TextField
          label="Serves"
          max="24"
          min="1"
          onChange={(event) => setServings(event.target.value)}
          type="number"
          value={servings}
        />
        <div className="sm:col-span-2">
          <TextArea
            hint={
              "One per line. Use g, kg, ml, L, tsp, tbsp, cups, oz, or lb. Use “[Sauce]” to start a section."
            }
            label="Ingredients"
            maxLength={6000}
            onChange={(event) => setIngredients(event.target.value)}
            placeholder={
              "[Main]\n200 g spinach\n2 tomatoes\n1 onion\n[To finish]\n1 lemon (optional)"
            }
            rows={6}
            value={ingredients}
          />
        </div>
        <div className="sm:col-span-2">
          <TextArea
            hint={
              "One step per line. Add a cook’s note after “ | ”, or use “[Sauce]” to start a section."
            }
            label="Directions"
            maxLength={24000}
            onChange={(event) => setSteps(event.target.value)}
            placeholder={
              "[Prepare]\nChop the vegetables. | Keep the pieces even.\n[Cook]\nSimmer until tender.\nSeason and serve."
            }
            rows={6}
            value={steps}
          />
        </div>
      </div>
      {error ? (
        <p aria-live="polite" className="mt-4 text-sm text-urgent">
          {error}
        </p>
      ) : null}
      <div className="mt-6 flex items-center gap-5">
        <Button type="submit">{recipe ? "Save changes" : "Save recipe"}</Button>
        <Button onClick={onCancel} variant="quiet">
          Cancel
        </Button>
      </div>
    </form>
  );
}
