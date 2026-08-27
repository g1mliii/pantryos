import { afterEach, describe, expect, it } from "vitest";
import {
  cancelConfirmation,
  confirmConfirmation,
  confirmationStore,
  declineConfirmation,
  requestConfirmation,
} from "./confirmation-store";

afterEach(cancelConfirmation);

describe("confirmation requests", () => {
  it("resolves confirmed and clears the active prompt", async () => {
    const decision = requestConfirmation({
      description: "This cannot be undone.",
      title: "Throw out the spinach?",
    });

    expect(confirmationStore.getState().prompt?.title).toBe(
      "Throw out the spinach?",
    );
    confirmConfirmation();

    await expect(decision).resolves.toBe("confirmed");
    expect(confirmationStore.getState().prompt).toBeNull();
  });

  it("distinguishes a human decline from execution cancellation", async () => {
    const declined = requestConfirmation({
      description: "This cannot be undone.",
      title: "Throw out the spinach?",
    });
    declineConfirmation();
    await expect(declined).resolves.toBe("declined");

    const controller = new AbortController();
    const cancelled = requestConfirmation(
      {
        description: "This cannot be undone.",
        title: "Throw out the milk?",
      },
      { signal: controller.signal },
    );
    controller.abort();

    await expect(cancelled).resolves.toBe("cancelled");
    expect(confirmationStore.getState().prompt).toBeNull();
  });

  it("cancels an older request before presenting a newer one", async () => {
    const older = requestConfirmation({
      description: "First request.",
      title: "First?",
    });
    const newer = requestConfirmation({
      description: "Second request.",
      title: "Second?",
    });

    await expect(older).resolves.toBe("cancelled");
    expect(confirmationStore.getState().prompt?.title).toBe("Second?");

    declineConfirmation();
    await expect(newer).resolves.toBe("declined");
  });
});
