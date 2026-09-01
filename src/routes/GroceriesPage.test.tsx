import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { kitchenStore } from "../stores/kitchen-store";
import { GroceriesPage } from "./GroceriesPage";

beforeEach(() => kitchenStore.getState().resetDemo());

describe("GroceriesPage", () => {
  it("manually adds, checks, unchecks, and removes an item", () => {
    render(
      <MemoryRouter>
        <GroceriesPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add an item" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Item" }), {
      target: { value: "Bananas" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add to list" }));

    const checkbox = screen.getByRole("checkbox", { name: "Bananas" });
    expect(kitchenStore.getState().groceries).toHaveLength(1);
    fireEvent.click(checkbox);
    expect(kitchenStore.getState().groceries[0]?.checked).toBe(true);
    fireEvent.click(checkbox);
    expect(kitchenStore.getState().groceries[0]?.checked).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Remove Bananas" }));
    expect(kitchenStore.getState().groceries).toEqual([]);
  });

  it("suggests a meal and adds only its missing ingredients", () => {
    render(
      <MemoryRouter>
        <GroceriesPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Add 2 items" })[0]!);

    expect(
      kitchenStore.getState().groceries.map((item) => item.normalizedName),
    ).toEqual(["ginger", "fresh tomato"]);
    expect(screen.getByText(/Added ginger and fresh tomato/)).toBeTruthy();
  });
});
