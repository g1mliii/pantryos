import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type CalloutPadding = "default" | "compact";

interface CalloutProps<T extends ElementType> {
  as?: T;
  children: ReactNode;
  className?: string;
  padding?: CalloutPadding;
}

const PADDING: Record<CalloutPadding, string> = {
  default: "px-7 py-6",
  compact: "p-5",
};

/**
 * The page's one filled emphasis block (skill rule 2/3): a copper edge on sunk
 * paper. One per view — if a screen wants a second, it wants a hairline rule.
 *
 * Padding is a prop rather than a `className` override because Tailwind
 * resolves `p-5` against `px-7 py-6` by stylesheet order, not attribute order.
 */
export function Callout<T extends ElementType = "div">({
  as,
  children,
  className = "",
  padding = "default",
  ...rest
}: CalloutProps<T> & Omit<ComponentPropsWithoutRef<T>, keyof CalloutProps<T>>) {
  const Component = as ?? "div";

  return (
    <Component
      className={`border-l-[3px] border-copper bg-paper-sunk ${PADDING[padding]} ${className}`}
      {...rest}
    >
      {children}
    </Component>
  );
}
