import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearAgentActivity } from "../../stores/agent-activity-store";
import { ToolDebugInspector } from "./ToolDebugInspector";

afterEach(() => {
  Reflect.deleteProperty(document, "modelContext");
  clearAgentActivity();
  localStorage.clear();
});

function stubPageApi(
  execute: ReturnType<typeof vi.fn>,
  tools = [{ name: "get_inventory", description: "Read kitchen inventory" }],
) {
  Object.defineProperty(document, "modelContext", {
    configurable: true,
    value: {
      registerTool: vi.fn().mockResolvedValue(undefined),
      getTools: vi.fn().mockResolvedValue(tools),
      executeTool: execute,
    },
  });
}

describe("ToolDebugInspector", () => {
  it("runs the selected tool through the page API when one is present", async () => {
    const executeTool = vi
      .fn()
      .mockResolvedValue(JSON.stringify({ ok: true, summary: "Found 13." }));
    stubPageApi(executeTool);
    render(<ToolDebugInspector />);

    fireEvent.click(screen.getByRole("button", { name: "Run tool" }));

    await waitFor(() =>
      expect(
        screen.getByText(/document\.modelContext\.executeTool/),
      ).toBeTruthy(),
    );
    // The adapter hands Chrome a JSON string, not the parsed object.
    expect(executeTool).toHaveBeenCalledWith(
      expect.objectContaining({ name: "get_inventory" }),
      "{}",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(screen.getByText(/"summary": "Found 13\."/)).toBeTruthy();
  });

  it("falls back to the registered callback without a page API", async () => {
    render(<ToolDebugInspector />);

    fireEvent.click(screen.getByRole("button", { name: "Run tool" }));

    await waitFor(() =>
      expect(screen.getByText(/no page API in this browser/)).toBeTruthy(),
    );
    expect(screen.getByText(/"ok": true/)).toBeTruthy();
  });

  it("reports a missing registration instead of running the local callback", async () => {
    const executeTool = vi.fn();
    stubPageApi(executeTool, []);
    render(<ToolDebugInspector />);

    fireEvent.click(screen.getByRole("button", { name: "Run tool" }));

    await waitFor(() =>
      expect(screen.getByText(/get_inventory is not registered/)).toBeTruthy(),
    );
    expect(executeTool).not.toHaveBeenCalled();
    expect(screen.queryByText(/no page API in this browser/)).toBeNull();
  });
});
