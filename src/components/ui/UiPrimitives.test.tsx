import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  Button,
  CoverageBar,
  FreshnessMarker,
  PageIntro,
  SectionHeading,
  Select,
  TickBox,
} from ".";

describe("PantryOS UI primitives", () => {
  it("render together from the shared barrel", () => {
    render(
      <>
        <PageIntro eyebrow="Foundation" title="Shared primitives" />
        <SectionHeading meta="Ready">Components</SectionHeading>
        <Button>Continue</Button>
        <Select
          label="Location"
          onChange={vi.fn()}
          options={[{ label: "Fridge", value: "fridge" }]}
          value="fridge"
        />
        <FreshnessMarker label="Today" status="today" />
        <CoverageBar have={5} total={7} />
        <TickBox checked={false} onChange={vi.fn()}>
          Ginger
        </TickBox>
      </>,
    );

    expect(
      screen.getByRole("heading", { name: "Shared primitives" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Continue" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Location" })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Ginger" })).toBeTruthy();
    expect(screen.getByText("TODAY")).toBeTruthy();
  });
});
