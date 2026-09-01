import { useId, type TextareaHTMLAttributes } from "react";
import { FieldCaption } from "./TextField";

interface TextAreaProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "className"
> {
  error?: string;
  hint?: string;
  label: string;
}

export function TextArea({ error, hint, id, label, ...props }: TextAreaProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;

  return (
    <div className="block text-sm text-ink-soft">
      <label htmlFor={inputId}>
        <FieldCaption>{label}</FieldCaption>
      </label>
      <textarea
        aria-describedby={error || hint ? descriptionId : undefined}
        aria-invalid={Boolean(error)}
        className={`min-h-32 w-full resize-y border bg-paper-raised px-3.5 py-2.5 text-[15px] leading-6 outline-none placeholder:text-ink-ghost focus:border-copper ${error ? "border-urgent" : "border-rule-warm"}`}
        id={inputId}
        {...props}
      />
      {error || hint ? (
        <span
          className={`mt-2 block text-[13px] ${error ? "text-urgent" : "text-ink-faint"}`}
          id={descriptionId}
        >
          {error ?? hint}
        </span>
      ) : null}
    </div>
  );
}
