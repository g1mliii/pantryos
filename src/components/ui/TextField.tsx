import { useId, type InputHTMLAttributes, type ReactNode } from "react";

interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className"
> {
  error?: string;
  label: string;
}

/**
 * The caption above a field. `Select` exposes its label only to assistive
 * technology, so the screens that use one need this same caption beside it —
 * hence one component rather than the class string copied per call site.
 */
export function FieldCaption({ children }: { children: ReactNode }) {
  return (
    <span className="mb-2 block text-xs font-semibold tracking-[0.14em] text-ink-faint uppercase">
      {children}
    </span>
  );
}

export function TextField({ error, id, label, ...props }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  return (
    <label className="block text-sm text-ink-soft" htmlFor={inputId}>
      <FieldCaption>{label}</FieldCaption>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        className={`w-full border bg-paper-raised px-3.5 py-2.5 text-[15px] outline-none placeholder:text-ink-ghost focus:border-copper ${error ? "border-urgent" : "border-rule-warm"}`}
        id={inputId}
        {...props}
      />
      {error ? (
        <span className="mt-2 block text-[13px] text-urgent" id={errorId}>
          {error}
        </span>
      ) : null}
    </label>
  );
}
