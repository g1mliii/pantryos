import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { kitchenStore } from "../stores/kitchen-store";
import { RecipesPage } from "./RecipesPage";

beforeEach(() => kitchenStore.getState().resetDemo());

describe("RecipesPage", () => {
  it("shows Chicken Saag first and applies human-facing filters", () => {
    render(
      <MemoryRouter>
        <RecipesPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole("heading", { level: 2 })[0]?.textContent).toBe(
      "Chicken Saag",
    );
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "P" && element.textContent === "5/7",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Five shown of six matches")).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(5);
    expect(screen.getByText("Uses 3 expiring")).toBeTruthy();
    expect(screen.queryByText("Clears all three")).toBeNull();

    fireEvent.change(
      screen.getByRole("searchbox", {
        name: "Search recipes or ingredients",
      }),
      { target: { value: "dal" } },
    );
    expect(screen.getByRole("heading", { name: "Dal" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Chicken Saag" })).toBeNull();
  });

  it("applies maximum time and missing ingredient controls", () => {
    render(
      <MemoryRouter>
        <RecipesPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Maximum time" }));
    fireEvent.click(screen.getByRole("option", { name: "15 minutes" }));
    expect(
      screen.getByRole("heading", { name: "Spinach Omelette" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Egg Fried Rice" }),
    ).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Chicken Saag" })).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "Maximum missing ingredients" }),
    );
    fireEvent.click(screen.getByRole("option", { name: "Nothing missing" }));
    expect(
      screen.queryByRole("heading", { name: "Egg Fried Rice" }),
    ).toBeNull();
  });

  it("saves a personal recipe into the local recipe collection", () => {
    render(
      <MemoryRouter>
        <RecipesPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add a recipe" }));
    expect(screen.queryByRole("button", { name: "Choose File" })).toBeNull();
    fireEvent.change(screen.getByRole("textbox", { name: "Recipe name" }), {
      target: { value: "Tomato Toast" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "Short description" }),
      { target: { value: "A quick lunch." } },
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Ingredients" }), {
      target: { value: "2 tomatoes\n2 bread" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Directions" }), {
      target: { value: "Toast the bread.\nAdd the tomatoes." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save recipe" }));

    expect(kitchenStore.getState().customRecipes).toMatchObject([
      { id: "custom-tomato-toast", title: "Tomato Toast" },
    ]);
  });
});
