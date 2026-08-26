import { Link, useParams } from "react-router-dom";
import { PageIntro } from "../components/ui/PageIntro";

export function RecipeDetailPage() {
  const { recipeId } = useParams();

  return (
    <>
      <PageIntro
        description="Recipe ingredients, match status, steps, and the add-missing action will render here."
        eyebrow="Recipe detail"
        title={recipeId ?? "Recipe"}
      />
      <Link
        className="mt-8 inline-block text-lime-400 hover:text-lime-300"
        to="/recipes"
      >
        ← Back to recipes
      </Link>
    </>
  );
}
