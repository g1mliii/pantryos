import { getExpiryDetails } from "../../domain/expiry";
import { formatQuantity } from "../../domain/units";
import type { InventoryItem, Location } from "../../schemas/inventory";
import { Button, FreshnessMarker, SectionHeading } from "../ui";

interface InventorySectionProps {
  items: InventoryItem[];
  location: Location;
  onAdd: (location: Location) => void;
  onConsume: (item: InventoryItem) => void;
  onEdit: (item: InventoryItem) => void;
  onRemove: (item: InventoryItem) => void;
  today: Date;
}

const LOCATION_LABELS: Record<Location, string> = {
  fridge: "Fridge",
  freezer: "Freezer",
  pantry: "Pantry",
};

export function InventorySection({
  items,
  location,
  onAdd,
  onConsume,
  onEdit,
  onRemove,
  today,
}: InventorySectionProps) {
  const dated = items.filter((item) => item.expiryDate !== null);
  const urgentCount = dated.filter((item) => {
    const days = getExpiryDetails(item.expiryDate, today).daysRemaining;
    return days !== null && days <= 3;
  }).length;
  const meta =
    urgentCount > 0
      ? `${urgentCount} want using`
      : dated.length > 0
        ? `${dated.length} dated`
        : "nothing dated";

  return (
    <section>
      <SectionHeading meta={meta}>{LOCATION_LABELS[location]}</SectionHeading>
      {items.length === 0 ? (
        <div className="mt-4 border border-dashed border-rule-warm px-5 py-5">
          <p className="font-serif text-[21px]">The {location} is empty.</p>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            Put something in when it belongs here.
          </p>
          <Button
            className="mt-4"
            onClick={() => onAdd(location)}
            variant="secondary"
          >
            Add to the {location}
          </Button>
        </div>
      ) : (
        <div
          className={
            location === "pantry" ? "md:grid md:grid-cols-2 md:gap-x-12" : ""
          }
        >
          {items.map((item) => {
            const expiry = getExpiryDetails(item.expiryDate, today);
            return (
              <article
                className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-rule-soft px-0.5 py-4 last:border-b-0"
                key={item.id}
              >
                <h3 className="min-w-44 grow font-serif text-[21px] leading-7">
                  {item.name}
                </h3>
                <span className="w-24 text-[15px] text-ink-muted">
                  {formatQuantity(item)}
                </span>
                {item.expiryDate ? (
                  <FreshnessMarker
                    daysRemaining={expiry.daysRemaining ?? undefined}
                    label={expiry.label}
                    status={expiry.status}
                  />
                ) : null}
                <div className="ml-auto flex w-full justify-end gap-4 sm:w-auto">
                  <button
                    className="cursor-pointer border-b border-rule-warm pb-0.5 text-[13px] text-copper-deep hover:border-copper-mid"
                    onClick={() => onConsume(item)}
                    type="button"
                  >
                    use
                  </button>
                  <button
                    className="cursor-pointer text-[13px] text-ink-faint hover:text-copper-deep"
                    onClick={() => onEdit(item)}
                    type="button"
                  >
                    edit
                  </button>
                  <button
                    className="cursor-pointer text-[13px] text-urgent hover:text-urgent-deep"
                    onClick={() => onRemove(item)}
                    type="button"
                  >
                    toss
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
