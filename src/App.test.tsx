import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "./App";

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
});
