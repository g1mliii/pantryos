import type { ReactNode } from "react";

interface TickBoxProps {
  checked: boolean;
  children: ReactNode;
  onChange: (checked: boolean) => void;
}

/** Fills copper on tick; the strike-through does the rest. */
export function TickBox({ checked, children, onChange }: TickBoxProps) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <input
        checked={checked}
        className="peer sr-only"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span
        aria-hidden="true"
        className={`flex size-4 shrink-0 items-center justify-center border-[1.5px] border-copper peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-copper ${
          checked ? "bg-copper" : ""
        }`}
      >
        {checked ? (
          <svg
            fill="none"
            height="11"
            stroke="var(--color-paper)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3.5"
            viewBox="0 0 24 24"
            width="11"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : null}
      </span>
      <span
        className={`font-serif text-xl ${checked ? "text-ink-ghost line-through" : ""}`}
      >
        {children}
      </span>
    </label>
  );
}
