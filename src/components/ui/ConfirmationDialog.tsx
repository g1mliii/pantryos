import { useEffect, useRef } from "react";
import {
  confirmConfirmation,
  declineConfirmation,
  useConfirmationStore,
} from "../../stores/confirmation-store";
import { Button } from "./Button";

function openDialog(dialog: HTMLDialogElement) {
  if (typeof dialog.showModal === "function") {
    if (!dialog.open) dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function closeDialog(dialog: HTMLDialogElement) {
  if (!dialog.open) return;
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

/** The page region focus falls back to; App puts this on its `<main>`. */
export const MAIN_REGION_ID = "pantryos-main";

/**
 * Confirming a removal unmounts the row that opened the dialog, so the saved
 * element is often detached by the time it closes and `.focus()` on it is a
 * no-op that drops the caret to `<body>`. Fall back to the page region so a
 * keyboard user keeps their place.
 */
function restoreFocus(previous: HTMLElement | null) {
  if (previous?.isConnected) {
    previous.focus();
    return;
  }
  document.getElementById(MAIN_REGION_ID)?.focus();
}

export function ConfirmationDialog() {
  const prompt = useConfirmationStore((state) => state.prompt);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (prompt) {
      if (!dialog.open) {
        previousFocusRef.current = document.activeElement as HTMLElement | null;
      }
      openDialog(dialog);
      cancelButtonRef.current?.focus();
      return;
    }

    closeDialog(dialog);
    restoreFocus(previousFocusRef.current);
    previousFocusRef.current = null;
  }, [prompt]);

  return (
    <dialog
      aria-describedby="confirmation-dialog-description"
      aria-labelledby="confirmation-dialog-title"
      className="m-auto w-[min(470px,calc(100vw-2rem))] border-0 bg-paper-raised p-0 text-ink shadow-dialog backdrop:bg-ink/45"
      onCancel={(event) => {
        event.preventDefault();
        declineConfirmation();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        declineConfirmation();
      }}
      ref={dialogRef}
    >
      {prompt ? (
        <div className="px-9 py-8">
          <p className="mb-5 text-[11px] font-semibold tracking-[0.18em] text-copper uppercase">
            {prompt.eyebrow}
          </p>
          <h2
            className="font-serif text-[32px] leading-[1.2] tracking-[-0.01em]"
            id="confirmation-dialog-title"
          >
            {prompt.title}
          </h2>
          <p
            className="mt-3.5 text-base leading-7 text-ink-muted"
            id="confirmation-dialog-description"
          >
            {prompt.description}
          </p>
          <div className="mt-7 flex items-center gap-5">
            <Button onClick={confirmConfirmation} variant="destructive">
              {prompt.confirmLabel}
            </Button>
            <Button
              onClick={declineConfirmation}
              ref={cancelButtonRef}
              variant="quiet"
            >
              {prompt.cancelLabel}
            </Button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
