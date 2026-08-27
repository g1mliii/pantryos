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
      screen.getByRole("heading", { name: /things want using/i }),
    ).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeTruthy();
    expect(screen.getByText("“What's expiring soon?”")).toBeTruthy();
    expect(
      screen.getByText(
        "“Find dinner under 30 minutes using what expires first.”",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText("“Add what I'm missing to groceries.”"),
    ).toBeTruthy();
  });

  it.each([
    ["/kitchen", /the kitchen/i],
    ["/recipes", /cook what matters first/i],
    ["/recipes/chicken-saag", /chicken-saag/i],
    ["/groceries", /only buy what is missing/i],
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
      screen.getByRole("heading", { name: /things want using/i }),
    ).toBeTruthy();
  });
});
