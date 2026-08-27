interface CoverageBarProps {
  have: number;
  total: number;
}

/**
 * The fraction is the real answer; the bar is the glance.
 * Square, 4px, no radius, no gradient.
 */
export function CoverageBar({ have, total }: CoverageBarProps) {
  const complete = total > 0 && have >= total;
  const percent = total > 0 ? Math.min(100, (have / total) * 100) : 0;

  return (
    <div className="w-full">
      <p className="mb-2.5 font-serif text-3xl font-light text-copper">
        {have}
        <span className="text-ink-ghost">/{total}</span>
      </p>
      <div className="h-1 bg-rule-soft">
        <div
          className={`h-1 ${complete ? "bg-copper-mid" : "bg-copper"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
