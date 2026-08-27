import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Select } from "./Select";

const OPTIONS = [
  { label: "Fridge", value: "fridge" },
  { label: "Freezer", value: "freezer" },
  { label: "Pantry", value: "pantry" },
];

function renderSelect(value = "fridge") {
  const onChange = vi.fn();
  render(
    <Select
      label="Location"
      onChange={onChange}
      options={OPTIONS}
      value={value}
    />,
  );
  return {
    onChange,
    trigger: screen.getByRole("button", { name: "Location" }),
  };
}

describe("Select", () => {
  it("shows the selected option and starts closed", () => {
    const { trigger } = renderSelect();

    expect(trigger.textContent).toContain("Fridge");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("opens on click", () => {
    const { trigger } = renderSelect();

    fireEvent.click(trigger);

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("commits the option that is clicked", () => {
    const { onChange, trigger } = renderSelect();

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("option", { name: /pantry/i }));

    expect(onChange).toHaveBeenCalledWith("pantry");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("moves with the arrow keys and commits on Enter", () => {
    const { onChange, trigger } = renderSelect();

    fireEvent.click(trigger);
    const list = screen.getByRole("listbox");
    fireEvent.keyDown(list, { key: "ArrowDown" });
    fireEvent.keyDown(list, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("freezer");
  });

  it("jumps to a match when you type a letter", () => {
    const { onChange, trigger } = renderSelect();

    fireEvent.click(trigger);
    const list = screen.getByRole("listbox");
    fireEvent.keyDown(list, { key: "p" });
    fireEvent.keyDown(list, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("pantry");
  });

  it("closes on Escape without committing", () => {
    const { onChange, trigger } = renderSelect();

    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("returns focus to the trigger when dismissed by an outside press", () => {
    const { trigger } = renderSelect();

    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  it("survives arrow and commit keys with no options", () => {
    const onChange = vi.fn();
    render(
      <Select label="Location" onChange={onChange} options={[]} value="" />,
    );

    const trigger = screen.getByRole("button", { name: "Location" });
    fireEvent.click(trigger);

    const list = screen.getByRole("listbox");
    expect(list.getAttribute("aria-activedescendant")).toBeNull();

    fireEvent.keyDown(list, { key: "ArrowDown" });
    fireEvent.keyDown(list, { key: "End" });
    fireEvent.keyDown(list, { key: "Enter" });

    expect(list.getAttribute("aria-activedescendant")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("cannot be opened when disabled", () => {
    render(
      <Select
        disabled
        label="Location"
        onChange={vi.fn()}
        options={OPTIONS}
        value="fridge"
      />,
    );

    const trigger = screen.getByRole("button", { name: "Location" });
    fireEvent.click(trigger);

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });
});
