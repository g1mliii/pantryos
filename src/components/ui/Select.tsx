import { useEffect, useId, useRef, useState } from "react";

export interface SelectOption<T extends string = string> {
  label: string;
  value: T;
}

interface SelectProps<T extends string> {
  disabled?: boolean;
  label: string;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  value: T;
}

const TYPEAHEAD_RESET_MS = 500;

/**
 * The app's one menu primitive. Every dropdown goes through this.
 *
 * Motion contract (see .claude/skills/pantryos-ui): only `opacity` and
 * `transform` animate, 140ms in / 90ms out. The list stays mounted and toggles
 * visibility so the exit transition actually plays.
 */
export function Select<T extends string = string>({
  disabled = false,
  label,
  onChange,
  options,
  value,
}: SelectProps<T>) {
  const baseId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef<{ buffer: string; timer?: number }>({ buffer: "" });

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  function openList() {
    if (disabled) return;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }

  function closeList() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function commit(index: number) {
    const option = options[index];
    if (option) onChange(option.value);
    closeList();
  }

  // Dismiss on any pointer press outside the control.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) closeList();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Move focus into the list so arrow keys and type-ahead work immediately.
  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- ref identity is stable
  useEffect(() => () => window.clearTimeout(typeahead.current.timer), []);

  function onListKeyDown(event: React.KeyboardEvent<HTMLUListElement>) {
    const { key } = event;

    if (key === "Escape" || key === "Tab") {
      event.preventDefault();
      closeList();
      return;
    }
    // With no options there is nothing to move between or commit, and the
    // wrap-around maths below would divide by zero.
    if (options.length === 0) return;
    if (key === "ArrowDown" || key === "ArrowUp") {
      event.preventDefault();
      const step = key === "ArrowDown" ? 1 : -1;
      setActiveIndex(
        (current) => (current + step + options.length) % options.length,
      );
      return;
    }
    if (key === "Home" || key === "End") {
      event.preventDefault();
      setActiveIndex(key === "Home" ? 0 : options.length - 1);
      return;
    }
    if (key === "Enter" || key === " ") {
      event.preventDefault();
      commit(activeIndex);
      return;
    }
    if (key.length === 1 && !event.metaKey && !event.ctrlKey) {
      window.clearTimeout(typeahead.current.timer);
      const buffer = typeahead.current.buffer + key.toLowerCase();
      typeahead.current.buffer = buffer;
      typeahead.current.timer = window.setTimeout(() => {
        typeahead.current.buffer = "";
      }, TYPEAHEAD_RESET_MS);

      const match = options.findIndex((option) =>
        option.label.toLowerCase().startsWith(buffer),
      );
      if (match >= 0) setActiveIndex(match);
    }
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        aria-controls={`${baseId}-list`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={label}
        className={`flex w-full items-center gap-3 border px-3.5 py-2.5 text-left text-[15px] ${
          disabled
            ? "cursor-not-allowed border-rule-soft bg-paper-deep/40 text-ink-ghost"
            : open
              ? "cursor-pointer border-copper bg-paper-raised outline-2 outline-paper-sunk"
              : "cursor-pointer border-rule-warm bg-paper-raised hover:border-copper-mid"
        }`}
        disabled={disabled}
        onClick={() => (open ? closeList() : openList())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openList();
          }
        }}
        ref={triggerRef}
        type="button"
      >
        <span className="grow">{selected?.label ?? label}</span>
        <svg
          aria-hidden="true"
          className={`transition-transform duration-[140ms] ease-[var(--ease-enter)] ${open ? "rotate-180" : ""}`}
          fill="none"
          height="14"
          stroke={disabled ? "var(--color-ink-ghost)" : "var(--color-copper)"}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
          viewBox="0 0 24 24"
          width="14"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <ul
        aria-activedescendant={
          open && options.length > 0 ? optionId(activeIndex) : undefined
        }
        aria-label={label}
        className={`absolute top-[calc(100%+4px)] right-0 left-0 z-20 origin-top border border-rule-warm bg-paper-raised p-1 shadow-menu transition-[opacity,transform,visibility] ${
          open
            ? "visible translate-y-0 scale-100 opacity-100 duration-[140ms] ease-[var(--ease-enter)]"
            : "invisible -translate-y-1.5 scale-[0.97] opacity-0 duration-[90ms] ease-[var(--ease-exit)]"
        }`}
        id={`${baseId}-list`}
        onKeyDown={onListKeyDown}
        ref={listRef}
        role="listbox"
        tabIndex={-1}
      >
        {options.map((option, index) => (
          <li
            aria-selected={option.value === value}
            className={`flex cursor-pointer items-center gap-2.5 px-3 py-2.5 text-[15px] ${
              index === activeIndex ? "bg-copper-pale" : ""
            }`}
            id={optionId(index)}
            key={option.value}
            onClick={() => commit(index)}
            onMouseEnter={() => setActiveIndex(index)}
            role="option"
          >
            <span
              aria-hidden="true"
              className={`inline-block size-[5px] ${option.value === value ? "bg-copper" : "bg-transparent"}`}
            />
            {option.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
