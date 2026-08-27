import type { ComponentPropsWithRef, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "destructive" | "quiet";

interface ButtonProps extends ComponentPropsWithRef<"button"> {
  children: ReactNode;
  variant?: ButtonVariant;
}

/** One filled button per view. `quiet` is the escape hatch beside it. */
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-copper px-5 py-2.5 font-semibold text-paper hover:bg-copper-deep",
  secondary:
    "border border-copper bg-paper-raised px-5 py-2.5 font-semibold text-copper-deep hover:bg-copper-pale",
  destructive:
    "bg-urgent px-5 py-2.5 font-semibold text-paper hover:bg-urgent-deep",
  quiet:
    "border-b border-rule-warm pb-[3px] text-ink-muted hover:border-copper-mid hover:text-copper-deep",
};

export function Button({
  children,
  className = "",
  variant = "primary",
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`cursor-pointer text-sm disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      type="button"
      {...rest}
    >
      {children}
    </button>
  );
}
