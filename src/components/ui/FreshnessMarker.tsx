/** Mirrors `ExpiryStatus` in domain/expiry (plan §2, §7). */
export type FreshnessStatus = "expired" | "today" | "soon" | "safe" | "none";

interface FreshnessMarkerProps {
  /** Days until expiry; only used to shade `soon`. */
  daysRemaining?: number;
  label: string;
  status: FreshnessStatus;
}

/**
 * Filled while it is urgent, outlined once it is not.
 * Colour is never the only signal — the label always carries the meaning too.
 */
const OUTLINED = "border border-rule-warm text-ink-faint";

const TONES: Record<FreshnessStatus, string> = {
  expired: "bg-urgent-deep text-paper",
  today: "bg-urgent text-paper",
  // Resolved per-item below; `soon` shades by how much runway is left.
  soon: "bg-soon text-ink",
  safe: OUTLINED,
  none: OUTLINED,
};

export function FreshnessMarker({
  daysRemaining,
  label,
  status,
}: FreshnessMarkerProps) {
  const tone =
    status === "soon" && daysRemaining !== undefined && daysRemaining >= 3
      ? "bg-later text-ink"
      : TONES[status];

  return (
    <span
      className={`inline-block px-2.5 py-1 text-xs font-semibold tracking-[0.04em] ${tone}`}
    >
      {label.toUpperCase()}
    </span>
  );
}
