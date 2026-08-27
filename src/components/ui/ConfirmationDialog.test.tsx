import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  cancelConfirmation,
  requestConfirmation,
} from "../../stores/confirmation-store";
import { ConfirmationDialog, MAIN_REGION_ID } from "./ConfirmationDialog";

afterEach(cancelConfirmation);

describe("ConfirmationDialog", () => {
  it("does not confirm until the destructive button is chosen", async () => {
    const decision = requestConfirmation({
      confirmLabel: "Throw it out",
      description: "That is the last 200 g. It cannot be undone.",
      eyebrow: "Before anything is thrown away",
      title: "Throw out the spinach?",
    });
    render(<ConfirmationDialog />);

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: /throw out/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Keep it" }));

    await expect(decision).resolves.toBe("declined");
  });

  it("returns a confirmed decision from the destructive button", async () => {
    const decision = requestConfirmation({
      confirmLabel: "Throw it out",
      description: "That is the last 200 g. It cannot be undone.",
      title: "Throw out the spinach?",
    });
    render(<ConfirmationDialog />);

    fireEvent.click(screen.getByRole("button", { name: "Throw it out" }));

    await expect(decision).resolves.toBe("confirmed");
  });

  it("sends focus to the page region when the trigger has gone", async () => {
    const main = document.createElement("main");
    main.id = MAIN_REGION_ID;
    main.tabIndex = -1;
    const trigger = document.createElement("button");
    main.append(trigger);
    document.body.append(main);
    trigger.focus();

    const decision = requestConfirmation({
      description: "That is the last 200 g. It cannot be undone.",
      title: "Throw out the spinach?",
    });
    render(<ConfirmationDialog />);

    // Confirming a removal unmounts the row that opened the dialog, so the
    // saved element is detached by the time focus goes back to it.
    trigger.remove();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await expect(decision).resolves.toBe("confirmed");

    expect(document.activeElement).toBe(main);
    main.remove();
  });

  it("treats Escape as a safe decline", async () => {
    const decision = requestConfirmation({
      description: "That is the last 200 g. It cannot be undone.",
      title: "Throw out the spinach?",
    });
    render(<ConfirmationDialog />);

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    await expect(decision).resolves.toBe("declined");
  });
});
