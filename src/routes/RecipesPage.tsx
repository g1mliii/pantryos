import { useMemo, useState } from "react";
import { RecipeResult } from "../components/recipes/RecipeResult";
import { FieldCaption, Select, TextField, TickBox } from "../components/ui";
import { RECIPES } from "../data/recipes";
import { findRecipes } from "../domain/recipe-matching";
import { capitalize, spellNumber } from "../domain/number-words";
import { useKitchenStore } from "../stores/kitchen-store";
import { useToday } from "../stores/today-store";

const MINUTE_OPTIONS = [
  { label: "Any time", value: "any" },
  { label: "15 minutes", value: "15" },
  { label: "30 minutes", value: "30" },
  { label: "45 minutes", value: "45" },
  { label: "60 minutes", value: "60" },
];

const MISSING_OPTIONS = [
  { label: "Any number", value: "any" },
  { label: "Nothing missing", value: "0" },
  { label: "At most one", value: "1" },
  { label: "At most two", value: "2" },
  { label: "At most three", value: "3" },
];

export function RecipesPage() {
  const inventory = useKitchenStore((state) => state.inventory);
  const today = useToday();
  const [query, setQuery] = useState("");
  const [maxMinutes, setMaxMinutes] = useState("30");
  const [maxMissing, setMaxMissing] = useState("2");
  const [prioritizeExpiring, setPrioritizeExpiring] = useState(true);
  const matches = useMemo(
    () =>
      findRecipes(
        RECIPES,
        inventory,
        {
          query: query || undefined,
          maxMinutes: maxMinutes === "any" ? undefined : Number(maxMinutes),
          maxMissingIngredients:
            maxMissing === "any" ? undefined : Number(maxMissing),
          prioritizeExpiring,
        },
        today,
      ),
    [inventory, maxMinutes, maxMissing, prioritizeExpiring, query, today],
  );
  const resultEyebrow =
    matches.results.length < matches.totalMatches
      ? `${capitalize(spellNumber(matches.results.length))} shown of ${spellNumber(matches.totalMatches)} matches`
      : `${capitalize(spellNumber(matches.totalMatches))} of ${spellNumber(RECIPES.length)}`;

  return (
    <>
      <p className="label-caps mb-[18px] text-copper">{resultEyebrow}</p>
      <h1 className="font-serif text-[52px] leading-none font-light tracking-[-0.015em]">
        What you could make
      </h1>

      <section
        aria-label="Recipe filters"
        className="mt-8 border-y border-rule py-5"
      >
        <div className="grid items-end gap-5 md:grid-cols-[1fr_170px_180px]">
          <TextField
            label="Search recipes or ingredients"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. chicken or spinach"
            type="search"
            value={query}
          />
          <label className="block text-sm text-ink-soft">
            <FieldCaption>Maximum time</FieldCaption>
            <Select
              label="Maximum time"
              onChange={setMaxMinutes}
              options={MINUTE_OPTIONS}
              value={maxMinutes}
            />
          </label>
          <label className="block text-sm text-ink-soft">
            <FieldCaption>Missing ingredients</FieldCaption>
            <Select
              label="Maximum missing ingredients"
              onChange={setMaxMissing}
              options={MISSING_OPTIONS}
              value={maxMissing}
            />
          </label>
        </div>
        <div className="mt-5">
          <TickBox
            checked={prioritizeExpiring}
            onChange={setPrioritizeExpiring}
          >
            Prioritize what expires first
          </TickBox>
        </div>
      </section>

      <p className="mt-7 max-w-[700px] font-serif text-[21px] leading-9 font-light text-ink-soft">
        Ranked by what is already here, what goes off first, and how quickly it
        gets dinner on the table.
      </p>

      <section aria-live="polite" className="mt-10">
        {matches.results.length === 0 ? (
          <p className="border-y border-rule py-8 font-serif text-2xl text-ink-muted">
            Nothing matches those filters yet.
          </p>
        ) : (
          matches.results.map((match, index) => (
            <RecipeResult
              featured={index === 0}
              key={match.recipe.id}
              match={match}
            />
          ))
        )}
      </section>
    </>
  );
}
