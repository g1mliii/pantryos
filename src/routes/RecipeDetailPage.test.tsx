import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { ConfirmationDialog } from "../components/ui";
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
    expect(screen.getByText(/10 min prep · 17 min cook/i)).toBeTruthy();
    expect(screen.getByText(/Cook’s note: Even ten minutes/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Increase servings" }));
    expect(screen.getByText("5 servings")).toBeTruthy();
    expect(screen.getByText("500 g")).toBeTruthy();

    const addMissing = screen.getByRole("button", {
      name: "Put both on the list",
    });
    fireEvent.click(addMissing);
    expect(
      kitchenStore.getState().groceries.map((item) => item.normalizedName),
    ).toEqual(["ginger", "fresh tomato"]);
    expect(kitchenStore.getState().groceries).toMatchObject([
      { name: "ginger", quantity: 25, displayUnit: "g" },
      { name: "fresh tomato", quantity: 2.5, displayUnit: "count" },
    ]);
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

  it("edits and deletes a saved recipe while keeping built-ins read-only", async () => {
    const saved = kitchenStore.getState().addCustomRecipe({
      title: "Tomato Toast",
      description: "A quick lunch.",
      servings: 1,
      totalMinutes: 8,
      ingredients: [{ name: "bread" }],
      steps: [{ instruction: "Toast the bread." }],
    });

    const view = render(
      <MemoryRouter initialEntries={[`/recipes/${saved.id}`]}>
        <ConfirmationDialog />
        <Routes>
          <Route element={<RecipeDetailPage />} path="/recipes/:recipeId" />
          <Route element={<p>Recipes index</p>} path="/recipes" />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit recipe" }));
    const name = screen.getByRole("textbox", { name: "Recipe name" });
    expect((name as HTMLInputElement).value).toBe("Tomato Toast");
    fireEvent.change(name, { target: { value: "Herby Tomato Toast" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(kitchenStore.getState().customRecipes[0]).toMatchObject({
      id: saved.id,
      title: "Herby Tomato Toast",
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete recipe" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Keep recipe" }),
    );
    expect(kitchenStore.getState().customRecipes).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Delete recipe" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Delete recipe",
      }),
    );
    await waitFor(() =>
      expect(kitchenStore.getState().customRecipes).toEqual([]),
    );
    expect(await screen.findByText("Recipes index")).toBeTruthy();

    view.unmount();
    render(
      <MemoryRouter initialEntries={["/recipes/chicken-saag"]}>
        <Routes>
          <Route element={<RecipeDetailPage />} path="/recipes/:recipeId" />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByRole("button", { name: "Edit recipe" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete recipe" })).toBeNull();
  });

  it("does not delete a saved recipe that changes while approval is open", async () => {
    const saved = kitchenStore.getState().addCustomRecipe({
      title: "Tomato Toast",
      description: "A quick lunch.",
      servings: 1,
      totalMinutes: 8,
      ingredients: [{ name: "bread" }],
      steps: [{ instruction: "Toast the bread." }],
    });
    render(
      <MemoryRouter initialEntries={[`/recipes/${saved.id}`]}>
        <ConfirmationDialog />
        <Routes>
          <Route element={<RecipeDetailPage />} path="/recipes/:recipeId" />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete recipe" }));
    kitchenStore.getState().editCustomRecipe(saved.id, {
      title: "Changed Tomato Toast",
      description: "Updated while the dialog was open.",
      servings: 2,
      totalMinutes: 10,
      ingredients: [{ name: "bread" }],
      steps: [{ instruction: "Toast two slices." }],
    });
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Delete recipe",
      }),
    );

    expect(
      await screen.findByText(/changed while the confirmation was open/i),
    ).toBeTruthy();
    expect(kitchenStore.getState().customRecipes).toMatchObject([
      { id: saved.id, title: "Changed Tomato Toast" },
    ]);
  });

  it("edits a long total-only recipe without forcing it into cook time", () => {
    const saved = kitchenStore.getState().addCustomRecipe({
      title: "Weekend Stock",
      description: "A long, hands-off kitchen project.",
      servings: 4,
      totalMinutes: 600,
      ingredients: [{ name: "bones" }],
      steps: [{ instruction: "Simmer slowly." }],
    });
    render(
      <MemoryRouter initialEntries={[`/recipes/${saved.id}`]}>
        <Routes>
          <Route element={<RecipeDetailPage />} path="/recipes/:recipeId" />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit recipe" }));
    const totalTime = screen.getByRole("spinbutton", {
      name: "Total time (minutes)",
    }) as HTMLInputElement;
    expect(totalTime.value).toBe("600");
    expect(totalTime.max).toBe("960");
    expect(
      screen.queryByRole("spinbutton", { name: "Cooking time (minutes)" }),
    ).toBeNull();

    fireEvent.change(screen.getByRole("textbox", { name: "Recipe name" }), {
      target: { value: "Overnight Stock" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(kitchenStore.getState().customRecipes[0]).toMatchObject({
      title: "Overnight Stock",
      totalMinutes: 600,
    });
    expect(
      kitchenStore.getState().customRecipes[0]?.prepMinutes,
    ).toBeUndefined();
    expect(
      kitchenStore.getState().customRecipes[0]?.cookMinutes,
    ).toBeUndefined();
  });
});
