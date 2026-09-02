import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { kitchenStore } from "./stores/kitchen-store";
import App from "./App";

afterEach(() => {
  delete (document as Document & { modelContext?: unknown }).modelContext;
  kitchenStore.getState().resetDemo();
});

describe("PantryOS app shell", () => {
  it("renders the dashboard and primary navigation", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        name: /use these three ingredients soon/i,
      }),
    ).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeTruthy();
    expect(screen.getByText("“What should I use first?”")).toBeTruthy();
    expect(
      screen.getByText("“Find a quick dinner that uses food expiring soon.”"),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "“Add the missing ingredients for that meal to my list.”",
      ),
    ).toBeTruthy();
  });

  it.each([
    ["/kitchen", /the kitchen/i],
    ["/recipes", /find your next meal/i],
    ["/recipes/chicken-saag", /chicken saag/i],
    ["/groceries", /your grocery list/i],
    ["/debug", /inspect the tool surface/i],
  ])("loads the %s route", (path, heading) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: heading })).toBeTruthy();
  });

  it("redirects unknown routes to the dashboard", () => {
    render(
      <MemoryRouter initialEntries={["/not-a-route"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        name: /use these three ingredients soon/i,
      }),
    ).toBeTruthy();
  });

  it("wires registered tools to app navigation after a recipe save", async () => {
    const registerTool = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: { registerTool },
    });

    render(
      <MemoryRouter initialEntries={["/recipes"]}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => expect(registerTool).toHaveBeenCalledTimes(14));
    const registrationSignal = (
      registerTool.mock.calls[0]?.[1] as
        WebMCP.ModelContextRegisterToolOptions | undefined
    )?.signal;
    expect(registrationSignal?.aborted).toBe(false);
    const tools = registerTool.mock.calls.map(
      ([tool]) => tool as WebMCP.ModelContextTool,
    );
    const addRecipe = tools.find((tool) => tool.name === "add_recipe")!;
    const navigatePantry = tools.find(
      (tool) => tool.name === "navigate_pantryos",
    )!;

    let saved: unknown;
    await act(async () => {
      saved = await addRecipe.execute(
        {
          title: "Router Toast",
          description: "A recipe that opens after saving.",
          servings: 1,
          timing: { totalMinutes: 5 },
          ingredients: [{ name: "bread", quantity: 1, displayUnit: "count" }],
          steps: [{ instruction: "Toast the bread." }],
        },
        { signal: new AbortController().signal },
      );
    });
    expect(saved).toMatchObject({
      ok: true,
      data: { recipeId: "custom-router-toast", navigated: true },
    });
    expect(screen.getByRole("heading", { name: "Router Toast" })).toBeTruthy();
    expect(registerTool).toHaveBeenCalledTimes(14);
    expect(registrationSignal?.aborted).toBe(false);

    await act(async () => {
      await navigatePantry.execute(
        { destination: "groceries" },
        { signal: new AbortController().signal },
      );
    });
    expect(
      screen.getByRole("heading", { name: /your grocery list/i }),
    ).toBeTruthy();
    expect(registerTool).toHaveBeenCalledTimes(14);
    expect(registrationSignal?.aborted).toBe(false);
  });
});
