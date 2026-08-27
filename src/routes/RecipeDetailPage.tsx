import { Link, useParams } from "react-router-dom";
import { PageIntro } from "../components/ui";

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
        className="mt-8 inline-block border-b border-copper-mid pb-[3px] text-copper-deep hover:text-copper"
        to="/recipes"
      >
        ← Back to recipes
      </Link>
    </>
  );
}
