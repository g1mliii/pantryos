import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WebMcpSmokeInspector } from "./WebMcpSmokeInspector";
import * as foundationSmoke from "../../webmcp/foundation-smoke";

describe("WebMcpSmokeInspector", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows a non-JSON tool result verbatim instead of a parse error", async () => {
    vi.spyOn(
      foundationSmoke,
      "inspectAndExecuteFoundationSmokeTool",
    ).mockResolvedValue({
      result: "Tool executed successfully.",
      source: "document",
      tool: { description: "smoke", name: "pantryos_foundation_smoke" },
    });

    render(
      <WebMcpSmokeInspector
        registrationStatus={{ state: "ready", source: "document" }}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Inspect and run smoke tool" }),
    );

    await waitFor(() => {
      const output = screen.getByText(/Tool executed successfully/);
      expect(output.textContent).toContain("Tool executed successfully.");
      expect(output.textContent).not.toContain("not valid JSON");
    });
  });
  it("shows the captured registration error", () => {
    render(
      <WebMcpSmokeInspector
        registrationStatus={{
          state: "error",
          message: "A tool with this name is already registered.",
        }}
      />,
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "A tool with this name is already registered.",
    );
    expect(
      (
        screen.getByRole("button", {
          name: "Inspect and run smoke tool",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});
