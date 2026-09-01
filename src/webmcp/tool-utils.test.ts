import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  agentActivityStore,
  clearAgentActivity,
} from "../stores/agent-activity-store";
import { createToolExecutor, toolSuccess } from "./tool-utils";

const inputSchema = z.object({ value: z.string() }).strict();

afterEach(() => clearAgentActivity());

describe("WebMCP tool execution wrapper", () => {
  it("cancels before validation or mutation when the signal is already aborted", async () => {
    const handler = vi.fn(() => toolSuccess("done", {}));
    const execute = createToolExecutor("test_tool", inputSchema, handler);
    const controller = new AbortController();
    controller.abort();

    await expect(
      execute({ value: "ok" }, { signal: controller.signal }),
    ).resolves.toMatchObject({ ok: false, error: "cancelled" });
    expect(handler).not.toHaveBeenCalled();
    expect(agentActivityStore.getState().entries[0]).toMatchObject({
      status: "cancelled",
    });
  });

  it("returns a redacted unexpected error instead of leaking an exception", async () => {
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const execute = createToolExecutor("test_tool", inputSchema, () => {
      throw new Error("private implementation detail");
    });

    const result = await execute(
      { value: "ok" },
      { signal: new AbortController().signal },
    );

    expect(result).toMatchObject({ ok: false, error: "unexpected_error" });
    expect(JSON.stringify(result)).not.toContain(
      "private implementation detail",
    );
    expect(agentActivityStore.getState().entries[0]).toMatchObject({
      status: "error",
    });
    error.mockRestore();
  });

  it("reports cancellation when execution aborts before an exception escapes", async () => {
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const controller = new AbortController();
    const execute = createToolExecutor("test_tool", inputSchema, () => {
      controller.abort();
      throw new Error("late failure");
    });

    await expect(
      execute({ value: "ok" }, { signal: controller.signal }),
    ).resolves.toMatchObject({ ok: false, error: "cancelled" });
    expect(agentActivityStore.getState().entries[0]).toMatchObject({
      status: "cancelled",
    });
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
