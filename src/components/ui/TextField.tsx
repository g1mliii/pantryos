import { useId, type InputHTMLAttributes } from "react";

interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className"
> {
  error?: string;
  label: string;
}

export function TextField({ error, id, label, ...props }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  return (
    <label className="block text-sm text-ink-soft" htmlFor={inputId}>
      <span className="mb-2 block text-xs font-semibold tracking-[0.14em] text-ink-faint uppercase">
        {label}
      </span>
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
