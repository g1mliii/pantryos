import type { ReactNode } from "react";

interface SectionHeadingProps {
  children: ReactNode;
  meta?: ReactNode;
}

/**
 * Copper marker, label, split rule. This replaces a card border everywhere in
 * the app — sections are separated by rules and space, never by boxes.
 */
export function SectionHeading({ children, meta }: SectionHeadingProps) {
  return (
    <div>
      <div className="mb-[7px] flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="inline-block size-[7px] bg-copper"
        />
        <h2 className="label-caps grow text-ink-muted">{children}</h2>
        {meta ? (
          <span className="text-[13px] text-ink-faint">{meta}</span>
        ) : null}
      </div>
      <div aria-hidden="true" className="flex">
        <span className="h-0.5 w-[62px] bg-copper" />
        <span className="h-0.5 grow bg-rule" />
      </div>
    </div>
  );
}
