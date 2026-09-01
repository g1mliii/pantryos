import { Link } from "react-router-dom";
import { Button } from "../ui";
import { distinctMissingIngredients } from "../../domain/groceries";
import { joinNames, pluralize } from "../../domain/number-words";
import type { RecipeMatch } from "../../domain/recipe-matching";

interface GroceryMealSuggestionProps {
  match: RecipeMatch;
  onAdd: () => void;
}

export function GroceryMealSuggestion({
  match,
  onAdd,
}: GroceryMealSuggestionProps) {
  // The button promises what will land on the list, and adding merges
  // ingredients that share a normalized name.
  const missing = distinctMissingIngredients(match.missing).map(
    (ingredient) => ingredient.name,
  );
  const expiring = match.expiringUsed.map((item) => item.name);

  return (
    <article className="flex flex-wrap items-center gap-6 border-b border-rule-soft py-5">
      <div className="min-w-64 grow">
        <h3 className="font-serif text-2xl">
          <Link
            className="hover:text-copper-deep"
            to={`/recipes/${match.recipe.id}`}
          >
            {match.recipe.title}
          </Link>
        </h3>
        <p className="mt-1 text-sm leading-6 text-ink-muted">
          {expiring.length > 0
            ? `Uses ${joinNames(expiring)} before ${pluralize(expiring.length, "it expires", "they expire")}. `
            : "A strong match for what is already in your kitchen. "}
          Buy {joinNames(missing)}.
        </p>
      </div>
      <Button onClick={onAdd} variant="secondary">
        Add {missing.length} {pluralize(missing.length, "item")}
      </Button>
    </article>
  );
}
