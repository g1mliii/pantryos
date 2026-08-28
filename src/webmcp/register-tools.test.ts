import { describe, expect, it, vi } from "vitest";
import type { CompatibleModelContext } from "./model-context";
import { registerPantryTools } from "./register-tools";

const tools: WebMCP.ModelContextTool[] = [
  {
    name: "first",
    description: "First test tool",
    execute: () => ({ ok: true }),
  },
  {
    name: "second",
    description: "Second test tool",
    execute: () => ({ ok: true }),
  },
];

function reference(registerTool = vi.fn().mockResolvedValue(undefined)) {
  return {
    context: { registerTool } as CompatibleModelContext,
    source: "document" as const,
  };
}

describe("PantryOS WebMCP registration", () => {
  it("keeps the app available when modelContext is absent", async () => {
    await expect(
      registerPantryTools(new AbortController().signal, null, tools),
    ).resolves.toEqual({
      state: "unavailable",
      registeredCount: 0,
      total: 2,
    });
  });

  it("awaits every tool with one abort-owned lifetime", async () => {
    const registerTool = vi.fn().mockResolvedValue(undefined);
    const controller = new AbortController();

    await expect(
      registerPantryTools(controller.signal, reference(registerTool), tools),
    ).resolves.toMatchObject({
      state: "ready",
      registeredCount: 2,
      total: 2,
      source: "document",
    });
    expect(registerTool).toHaveBeenNthCalledWith(1, tools[0], {
      signal: controller.signal,
    });
    expect(registerTool).toHaveBeenNthCalledWith(2, tools[1], {
      signal: controller.signal,
    });
  });

  it("reports partial registration without hiding successful tools", async () => {
    const registerTool = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("bad schema"));

    await expect(
      registerPantryTools(
        new AbortController().signal,
        reference(registerTool),
        tools,
      ),
    ).resolves.toMatchObject({
      state: "error",
      registeredCount: 1,
      total: 2,
      failedTools: ["second"],
      message: "second: bad schema",
    });
  });

  it("does not register after its lifetime is already aborted", async () => {
    const registerTool = vi.fn().mockResolvedValue(undefined);
    const controller = new AbortController();
    controller.abort();

    await expect(
      registerPantryTools(controller.signal, reference(registerTool), tools),
    ).resolves.toMatchObject({ state: "registering", registeredCount: 0 });
    expect(registerTool).not.toHaveBeenCalled();
  });

  it("serializes StrictMode remounts so a tool name is never claimed twice", async () => {
    const releases: Array<() => void> = [];
    let concurrent = 0;
    let peak = 0;
    const registerTool = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          concurrent += 1;
          peak = Math.max(peak, concurrent);
          releases.push(() => {
            concurrent -= 1;
            resolve();
          });
        }),
    );
    const oneTool = [tools[0]!];
    const first = new AbortController();
    const firstRun = registerPantryTools(
      first.signal,
      reference(registerTool),
      oneTool,
    );
    const second = new AbortController();
    const secondRun = registerPantryTools(
      second.signal,
      reference(registerTool),
      oneTool,
    );

    await vi.waitFor(() => expect(releases).toHaveLength(1));
    first.abort();
    releases[0]!();
    await expect(firstRun).resolves.toMatchObject({ state: "registering" });
    await vi.waitFor(() => expect(releases).toHaveLength(2));
    releases[1]!();
    await expect(secondRun).resolves.toMatchObject({ state: "ready" });

    expect(peak).toBe(1);
    expect(registerTool).toHaveBeenCalledTimes(2);
  });
});
