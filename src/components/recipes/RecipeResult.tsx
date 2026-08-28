import { Link } from "react-router-dom";
import { CoverageBar } from "../ui";
import type { RecipeMatch } from "../../domain/recipe-matching";

interface RecipeResultProps {
  featured?: boolean;
  match: RecipeMatch;
}

function readableExpiringName(name: string) {
  return name
    .toLocaleLowerCase("en-CA")
    .replace("chicken breast", "chicken")
    .replace("greek yogurt", "yogurt");
}

function joinNatural(items: string[]) {
  if (items.length < 2) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

export function RecipeResult({ featured = false, match }: RecipeResultProps) {
  const { recipe } = match;
  const expiringNames = match.expiringUsed.map((item) =>
    readableExpiringName(item.name),
  );
  const availability =
    match.missing.length === 0
      ? "everything already here"
      : `still needs ${match.missing.map((item) => item.name).join(", ")}`;
  const urgency =
    expiringNames.length > 0
      ? `uses ${joinNatural(expiringNames.map((name) => `the ${name}`))}`
      : "nothing going off soon";

  return (
    <article
      className={
        featured
          ? "border-t-4 border-copper bg-paper-sunk px-8 py-7"
          : "border-b border-rule-soft px-8 py-6"
      }
    >
      <div className="flex items-baseline justify-between gap-8">
        <div className="grow">
          {featured ? (
            <span className="mb-3 inline-block bg-copper px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-paper uppercase">
              {match.expiringUsed.length > 0
                ? `Uses ${match.expiringUsed.length} expiring`
                : "Best match"}
            </span>
          ) : null}
          <h2
            className={`font-serif font-normal ${featured ? "text-4xl leading-[42px]" : "text-3xl leading-9"}`}
          >
            <Link
              className="hover:text-copper-deep"
              to={`/recipes/${recipe.id}`}
            >
              {recipe.title}
            </Link>
          </h2>
          <p className="mt-2 text-[15px] leading-6 text-ink-muted">
            {recipe.totalMinutes} minutes · serves {recipe.servings} · {urgency}
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            {match.missing.length === 0 ? (
              availability
            ) : (
              <>
                Still needed —{" "}
                <span className="font-serif text-lg text-copper-deep italic">
                  {match.missing.map((item) => item.name).join(", ")}
                </span>
              </>
            )}
          </p>
        </div>
        <div className={`shrink-0 ${featured ? "w-[118px]" : "w-20"}`}>
          <CoverageBar
            have={match.have.length}
            total={match.have.length + match.missing.length}
          />
        </div>
      </div>
    </article>
  );
}
