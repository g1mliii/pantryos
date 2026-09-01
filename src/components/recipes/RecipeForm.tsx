import { useState, type FormEvent } from "react";
import { ZodError } from "zod";
import { Button, TextArea, TextField } from "../ui";
import { RecipePhotoField } from "./RecipePhotoField";
import {
  parseRecipeIngredients,
  parseRecipeSteps,
} from "../../domain/custom-recipes";
import type { CustomRecipeDraft, Recipe } from "../../schemas/recipe";

interface RecipeFormProps {
  onCancel: () => void;
  onSave: (draft: CustomRecipeDraft) => Recipe;
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

export function RecipeForm({ onCancel, onSave }: RecipeFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [servings, setServings] = useState("4");
  const [prepMinutes, setPrepMinutes] = useState("10");
  const [cookMinutes, setCookMinutes] = useState("20");
  const [photo, setPhoto] = useState<string>();
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");
  const [error, setError] = useState<string>();

  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      onSave({
        title,
        description,
        servings: Number(servings),
        prepMinutes: Number(prepMinutes),
        cookMinutes: Number(cookMinutes),
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
        <Button type="submit">Save recipe</Button>
        <Button onClick={onCancel} variant="quiet">
          Cancel
        </Button>
      </div>
    </form>
  );
}
