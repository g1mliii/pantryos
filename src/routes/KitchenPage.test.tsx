import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConfirmationDialog } from "../components/ui";
import { cancelConfirmation } from "../stores/confirmation-store";
import { kitchenStore } from "../stores/kitchen-store";
import { KitchenPage } from "./KitchenPage";

beforeEach(() => kitchenStore.getState().resetDemo());
afterEach(() => {
  cancelConfirmation();
  kitchenStore.getState().resetDemo();
});

describe("KitchenPage removal", () => {
  it("keeps inventory on decline and removes it only after confirmation", async () => {
    render(
      <>
        <ConfirmationDialog />
        <KitchenPage />
      </>,
    );

    const spinachRow = screen
      .getByRole("heading", { name: "Spinach" })
      .closest("article");
    if (!spinachRow) throw new Error("Missing spinach row");

    fireEvent.click(within(spinachRow).getByRole("button", { name: "toss" }));
    expect(
      screen.getByRole("heading", { name: "Throw out Spinach?" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Keep it" }));
    expect(kitchenStore.getState().inventory).toHaveLength(13);

    fireEvent.click(within(spinachRow).getByRole("button", { name: "toss" }));
    fireEvent.click(screen.getByRole("button", { name: "Throw it out" }));
    await waitFor(() => {
      expect(kitchenStore.getState().inventory).toHaveLength(12);
      expect(
        kitchenStore.getState().inventory.some((item) => item.id === "spinach"),
      ).toBe(false);
    });
  });
});
