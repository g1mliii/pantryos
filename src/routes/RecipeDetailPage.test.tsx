import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { kitchenStore } from "../stores/kitchen-store";
import { RecipeDetailPage } from "./RecipeDetailPage";

beforeEach(() => kitchenStore.getState().resetDemo());

describe("RecipeDetailPage", () => {
  it("shows the Chicken Saag acceptance state and deduplicates Add Missing", () => {
    render(
      <MemoryRouter initialEntries={["/recipes/chicken-saag"]}>
        <Routes>
          <Route element={<RecipeDetailPage />} path="/recipes/:recipeId" />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/you have 5 of the 7/i)).toBeTruthy();
    expect(screen.getByText(/uses 3 things going off/i)).toBeTruthy();
    expect(screen.getAllByText("ginger")).toHaveLength(1);
    expect(screen.getAllByText("fresh tomato")).toHaveLength(1);

    const addMissing = screen.getByRole("button", {
      name: "Put both on the list",
    });
    fireEvent.click(addMissing);
    expect(
      kitchenStore.getState().groceries.map((item) => item.normalizedName),
    ).toEqual(["ginger", "fresh tomato"]);
    expect(screen.getByText(/Added ginger and fresh tomato/i)).toBeTruthy();

    fireEvent.click(addMissing);
    expect(kitchenStore.getState().groceries).toHaveLength(2);
    expect(screen.getByText(/already on the list/i)).toBeTruthy();
  });

  it("labels and adds more than two missing ingredients accurately", () => {
    for (const item of kitchenStore.getState().inventory) {
      kitchenStore.getState().removeInventory(item.id);
    }

    render(
      <MemoryRouter initialEntries={["/recipes/chicken-saag"]}>
        <Routes>
          <Route element={<RecipeDetailPage />} path="/recipes/:recipeId" />
        </Routes>
      </MemoryRouter>,
    );

    const addMissing = screen.getByRole("button", {
      name: "Put all seven on the list",
    });
    fireEvent.click(addMissing);

    expect(kitchenStore.getState().groceries).toHaveLength(7);
  });
});
