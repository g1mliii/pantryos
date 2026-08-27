import { format } from "date-fns";
import { Link } from "react-router-dom";
import {
  Button,
  FreshnessMarker,
  PageIntro,
  SectionHeading,
} from "../components/ui";
import { getExpiryDetails, getUseFirstItems } from "../domain/expiry";
import { capitalize, spellNumber } from "../domain/number-words";
import { formatQuantity } from "../domain/units";
import { useKitchenStore } from "../stores/kitchen-store";
import type { SmokeRegistrationStatus } from "../webmcp/foundation-smoke";

interface DashboardPageProps {
  webMcpStatus: SmokeRegistrationStatus;
}

export function DashboardPage({ webMcpStatus }: DashboardPageProps) {
  const inventory = useKitchenStore((state) => state.inventory);
  const resetDemo = useKitchenStore((state) => state.resetDemo);
  const today = new Date();
  const useFirst = getUseFirstItems(inventory, today, 3);
  const locationCounts = {
    fridge: inventory.filter((item) => item.location === "fridge").length,
    freezer: inventory.filter((item) => item.location === "freezer").length,
    pantry: inventory.filter((item) => item.location === "pantry").length,
  };
  const amount = capitalize(spellNumber(useFirst.length));
  const title =
    useFirst.length === 0
      ? "Nothing needs using in the next three days."
      : `${amount} ${useFirst.length === 1 ? "thing wants" : "things want"} using soon.`;

  return (
    <>
      <PageIntro
        description={
          useFirst.length === 0
            ? "Your dated inventory is clear for now."
            : `${useFirst[0]?.name ?? "Something"} goes first. Expired food stays visible until you decide what to do with it.`
        }
        eyebrow={format(today, "EEEE, d MMMM")}
        title={title}
      />

      <section className="mt-14">
        <SectionHeading meta={`${useFirst.length} items`}>
          Use first
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

      <section className="mt-12">
        <SectionHeading>Try asking your agent</SectionHeading>
        <div className="pt-4">
          <p className="font-serif text-[17px] leading-7 text-ink-soft italic">
            “What's expiring soon?”
          </p>
          <p className="mt-3.5 font-serif text-[17px] leading-7 text-ink-soft italic">
            “Find dinner under 30 minutes using what expires first.”
          </p>
          <p className="mt-3.5 font-serif text-[17px] leading-7 text-ink-soft italic">
            “Add what I'm missing to groceries.”
          </p>
        </div>
      </section>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-6 border-t border-rule pt-7">
        <div>
          <p className="font-serif text-xl">
            Kitchen state lives in this browser.
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            WebMCP foundation status: {webMcpStatus.state}.
          </p>
        </div>
        <div className="flex items-center gap-6">
          <Link
            className="border-b border-rule-warm pb-0.5 text-sm text-copper-deep"
            to="/kitchen"
          >
            Open the kitchen
          </Link>
          <Button onClick={resetDemo} variant="secondary">
            Reset Demo
          </Button>
        </div>
      </div>
    </>
  );
}
