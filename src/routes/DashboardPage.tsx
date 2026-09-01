import { format } from "date-fns";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { RecipeResult } from "../components/recipes/RecipeResult";
import {
  Button,
  FreshnessMarker,
  PageIntro,
  SectionHeading,
} from "../components/ui";
import { getAllRecipes } from "../data/recipes";
import { getExpiryDetails, getUseFirstItems } from "../domain/expiry";
import { countInventoryByLocation } from "../domain/inventory";
import { findRecipes } from "../domain/recipe-matching";
import { pluralize, spellNumber } from "../domain/number-words";
import { formatQuantity } from "../domain/units";
import { requestConfirmation } from "../stores/confirmation-store";
import { useKitchenStore } from "../stores/kitchen-store";
import { useToday } from "../stores/today-store";
export function DashboardPage() {
  const inventory = useKitchenStore((state) => state.inventory);
  const customRecipes = useKitchenStore((state) => state.customRecipes);
  const resetDemo = useKitchenStore((state) => state.resetDemo);
  const today = useToday();
  const useFirst = getUseFirstItems(inventory, today, 3);
  const locationCounts = countInventoryByLocation(inventory);
  const amount = spellNumber(useFirst.length);
  const title =
    useFirst.length === 0
      ? "Nothing needs using soon."
      : useFirst.length === 1
        ? "Use this ingredient soon."
        : `Use these ${amount} ingredients soon.`;
  const firstExpiry = useFirst[0]
    ? getExpiryDetails(useFirst[0].expiryDate, today)
    : undefined;
  const bestRecipe = useMemo(
    () =>
      findRecipes(
        getAllRecipes(customRecipes),
        inventory,
        {
          maxMinutes: 45,
          maxMissingIngredients: 2,
          prioritizeExpiring: true,
        },
        today,
        1,
      ).results[0],
    [customRecipes, inventory, today],
  );

  async function confirmReset() {
    const decision = await requestConfirmation({
      cancelLabel: "Keep my kitchen",
      confirmLabel: "Reset it",
      description:
        "This replaces the whole kitchen with the demo one. Anything you or your agent put in is lost, and it cannot be undone.",
      eyebrow: "Before the kitchen is replaced",
      title: "Reset the demo kitchen?",
    });
    if (decision === "confirmed") resetDemo();
  }

  return (
    <>
      <PageIntro
        description={
          useFirst.length === 0
            ? "Your dated food is in good shape for the next three days."
            : firstExpiry?.status === "expired"
              ? `${useFirst[0]?.name} is past its date. Check it and decide whether to keep or remove it.`
              : `${useFirst[0]?.name} expires first. Start there to make the most of what you bought.`
        }
        eyebrow={format(today, "EEEE, d MMMM")}
        title={title}
      />

      <section className="mt-14">
        <SectionHeading
          meta={`${useFirst.length} ${pluralize(useFirst.length, "item")}`}
        >
          Use soon
        </SectionHeading>
        {useFirst.length === 0 ? (
          <p className="border-b border-rule-soft py-6 text-ink-muted">
            Nothing expires within three days. Check the full kitchen for later
            dates.
          </p>
        ) : (
          useFirst.map((item) => {
            const expiry = getExpiryDetails(item.expiryDate, today);
            return (
              <div
                className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-rule-soft px-0.5 py-[18px] last:border-b-0"
                key={item.id}
              >
                <span className="min-w-52 grow font-serif text-2xl">
                  {item.name}
                </span>
                <span className="w-24 text-[15px] text-ink-muted">
                  {formatQuantity(item)}
                </span>
                <span className="w-16 text-[13px] text-ink-faint capitalize">
                  {item.location}
                </span>
                <FreshnessMarker
                  daysRemaining={expiry.daysRemaining ?? undefined}
                  label={expiry.label}
                  status={expiry.status}
                />
              </div>
            );
          })
        )}
      </section>

      <section className="mt-12 grid bg-paper-sunk sm:grid-cols-3">
        {(
          [
            ["Fridge", locationCounts.fridge],
            ["Pantry", locationCounts.pantry],
            ["Freezer", locationCounts.freezer],
          ] as const
        ).map(([label, count]) => (
          <div
            className="border-b border-rule-warm px-6 py-5 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0"
            key={label}
          >
            <span className="font-serif text-[40px] leading-none font-light text-copper">
              {count}
            </span>
            <span className="mt-1 block text-xs font-semibold tracking-[0.14em] text-ink-muted uppercase">
              {label}
            </span>
          </div>
        ))}
      </section>

      {bestRecipe ? (
        <section className="mt-14">
          <SectionHeading
            meta={
              <Link className="text-copper-deep" to="/recipes">
                See all recipes
              </Link>
            }
          >
            Cook next
          </SectionHeading>
          <div className="mt-5">
            <RecipeResult featured match={bestRecipe} />
          </div>
        </section>
      ) : null}

      <section className="mt-12">
        <SectionHeading>Ways an AI assistant can help</SectionHeading>
        <div className="pt-4">
          <p className="font-serif text-[17px] leading-7 text-ink-soft italic">
            “What should I use first?”
          </p>
          <p className="mt-3.5 font-serif text-[17px] leading-7 text-ink-soft italic">
            “Find a quick dinner that uses food expiring soon.”
          </p>
          <p className="mt-3.5 font-serif text-[17px] leading-7 text-ink-soft italic">
            “Add the missing ingredients for that meal to my list.”
          </p>
        </div>
      </section>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-6 border-t border-rule pt-7">
        <div>
          <p className="font-serif text-xl">
            Your kitchen is saved on this device.
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Your food, saved recipes, and grocery list will be here when you
            come back.
          </p>
        </div>
        <div className="flex items-center gap-6">
          <Link
            className="border-b border-rule-warm pb-0.5 text-sm text-copper-deep"
            to="/kitchen"
          >
            See everything in your kitchen
          </Link>
          <Button onClick={() => void confirmReset()} variant="secondary">
            Start demo over
          </Button>
        </div>
      </div>
    </>
  );
}
