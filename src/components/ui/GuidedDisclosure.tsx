import type { ReactNode } from "react";

interface GuidedDisclosureProps {
  children: ReactNode;
  label: string;
}

export function GuidedDisclosure({ children, label }: GuidedDisclosureProps) {
  return (
    <details className="group mt-4 border-y border-rule-warm py-3">
      <summary className="cursor-pointer list-none text-[13px] font-medium text-copper-deep hover:text-copper">
        <span
          aria-hidden="true"
          className="mr-2 inline-block group-open:hidden"
        >
          +
        </span>
        <span
          aria-hidden="true"
          className="mr-2 hidden group-open:inline-block"
        >
          −
        </span>
        {label}
      </summary>
      <div className="pt-3 text-[13px] leading-5 text-ink-muted">
        {children}
      </div>
    </details>
  );
}
