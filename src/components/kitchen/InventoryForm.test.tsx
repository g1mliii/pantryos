import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InventoryForm } from "./InventoryForm";

function renderAddForm() {
  render(<InventoryForm mode="add" onClose={() => undefined} />);
  const quantity = screen.getByLabelText("Quantity");
  if (!(quantity instanceof HTMLInputElement)) {
    throw new Error("Missing quantity field");
  }
  return { quantity };
}

function chooseUnit(name: RegExp) {
  fireEvent.click(screen.getByRole("button", { name: "Unit" }));
  fireEvent.click(screen.getByRole("option", { name }));
}

describe("InventoryForm", () => {
  it("carries the amount across a compatible unit change", () => {
    const { quantity } = renderAddForm();
    fireEvent.change(quantity, { target: { value: "600" } });

    chooseUnit(/kilograms/i);

    // Without the conversion this submits 600 kg — a silent thousandfold jump.
    expect(quantity.value).toBe("0.6");
  });

  it("leaves the amount alone when the new unit measures something else", () => {
    const { quantity } = renderAddForm();
    fireEvent.change(quantity, { target: { value: "600" } });

    chooseUnit(/^count$/i);

    expect(quantity.value).toBe("600");
  });

  it("reports a readable message instead of a validation dump", () => {
    const { quantity } = renderAddForm();
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "   " },
    });
    fireEvent.change(quantity, { target: { value: "2" } });

    const form = quantity.closest("form");
    if (!form) throw new Error("Missing form");
    fireEvent.submit(form);

    expect(screen.getByText("Give the item a name")).toBeTruthy();
  });
});
