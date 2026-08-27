import { describe, expect, it, vi } from "vitest";
import {
  FOUNDATION_SMOKE_TOOL_NAME,
  foundationSmokeTool,
  inspectAndExecuteFoundationSmokeTool,
  registerFoundationSmokeTool,
} from "./foundation-smoke";
import { getModelContext, type CompatibleModelContext } from "./model-context";

function modelContext(
  overrides: Partial<CompatibleModelContext> = {},
): CompatibleModelContext {
  return {
    registerTool: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/** The two-field reference the registration helpers take. */
function contextRef(overrides: Partial<CompatibleModelContext> = {}) {
  return { context: modelContext(overrides), source: "document" } as const;
}

describe("WebMCP foundation smoke adapter", () => {
  it("prefers document.modelContext", () => {
    const primary = modelContext();
    const fallback = modelContext();

    expect(
      getModelContext(
        { modelContext: primary } as Document,
        { modelContext: fallback } as unknown as Navigator,
      ),
    ).toEqual({ context: primary, source: "document" });
  });

  it("isolates the legacy navigator fallback", () => {
    const fallback = modelContext();

    expect(
      getModelContext(
        {} as Document,
        {
          modelContext: fallback,
        } as unknown as Navigator,
      ),
    ).toEqual({ context: fallback, source: "navigator" });
  });

  it("keeps the app operational when WebMCP is unavailable", async () => {
    expect(getModelContext({} as Document, {} as Navigator)).toBeNull();
    await expect(
      registerFoundationSmokeTool(new AbortController().signal, null),
    ).resolves.toEqual({ state: "unavailable" });
  });

  it("registers one read-only tool with abort-owned cleanup", async () => {
    const registerTool = vi.fn().mockResolvedValue(undefined);
    const context = modelContext({ registerTool });
    const controller = new AbortController();

    await expect(
      registerFoundationSmokeTool(controller.signal, {
        context,
        source: "document",
      }),
    ).resolves.toEqual({ state: "ready", source: "document" });

    expect(registerTool).toHaveBeenCalledOnce();
    expect(registerTool).toHaveBeenCalledWith(foundationSmokeTool, {
      signal: controller.signal,
    });
    expect(foundationSmokeTool.annotations).toEqual({
      readOnlyHint: true,
      untrustedContentHint: false,
    });
  });

  it("serialises overlapping registrations so StrictMode cannot double-register", async () => {
    const inFlight: Array<() => void> = [];
    let concurrent = 0;
    let peak = 0;
    const registerTool = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          concurrent += 1;
          peak = Math.max(peak, concurrent);
          inFlight.push(() => {
            concurrent -= 1;
            resolve();
          });
        }),
    );
    const reference = contextRef({ registerTool });

    // Two lifetimes overlapping on the same tool name.
    const first = new AbortController();
    const firstRun = registerFoundationSmokeTool(first.signal, reference);
    const second = new AbortController();
    const secondRun = registerFoundationSmokeTool(second.signal, reference);

    // The second call must not reach registerTool while the first is pending.
    await vi.waitFor(() => expect(inFlight).toHaveLength(1));
    first.abort();
    inFlight[0]();
    await expect(firstRun).resolves.toEqual({ state: "registering" });

    await vi.waitFor(() => expect(inFlight).toHaveLength(2));
    inFlight[1]();
    await expect(secondRun).resolves.toEqual({
      state: "ready",
      source: "document",
    });

    expect(peak).toBe(1);
    expect(registerTool).toHaveBeenCalledTimes(2);
  });

  it("does not claim the tool name when aborted while queued", async () => {
    const registerTool = vi.fn().mockResolvedValue(undefined);
    const reference = contextRef({ registerTool });

    const blocker = new AbortController();
    const blocking = registerFoundationSmokeTool(blocker.signal, reference);

    const cancelled = new AbortController();
    cancelled.abort();
    const queued = registerFoundationSmokeTool(cancelled.signal, reference);

    await blocking;
    await expect(queued).resolves.toEqual({ state: "registering" });
    expect(registerTool).toHaveBeenCalledOnce();
  });

  it("validates the smoke input with Zod", async () => {
    const signal = new AbortController().signal;
    const valid = await foundationSmokeTool.execute({}, { signal });
    const invalid = await foundationSmokeTool.execute(
      { unexpected: true },
      { signal },
    );

    expect(valid).toMatchObject({
      ok: true,
      data: { phase: 0 },
    });
    expect(invalid).toMatchObject({
      ok: false,
      error: "invalid_input",
    });
  });

  it.each([undefined, {}])(
    "also executes in inspector builds that supply incomplete callback options",
    async (options) => {
      const result = await foundationSmokeTool.execute(
        {},
        options as unknown as WebMCP.ToolExecuteCallbackOptions,
      );

      expect(result).toMatchObject({ ok: true });
    },
  );

  it("inspects and executes the registered tool through the standard API", async () => {
    const tool = {
      name: FOUNDATION_SMOKE_TOOL_NAME,
      title: "Check PantryOS foundation",
      description: "Smoke test",
    };
    const executeTool = vi.fn().mockResolvedValue('{"ok":true}');
    const context = modelContext({
      getTools: vi.fn().mockResolvedValue([tool]),
      executeTool,
    });

    await expect(
      inspectAndExecuteFoundationSmokeTool({ context, source: "document" }),
    ).resolves.toEqual({
      result: '{"ok":true}',
      source: "document",
      tool,
    });
    expect(executeTool).toHaveBeenCalledWith(tool, {});
  });

  it("normalises both executeTool argument forms at the compatibility boundary", async () => {
    const tool = {
      name: FOUNDATION_SMOKE_TOOL_NAME,
      description: "Smoke test",
    };
    const executeTool = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Requires an object input"))
      .mockResolvedValueOnce('{"ok":true}');
    const context = modelContext({
      getTools: vi.fn().mockResolvedValue([tool]),
      executeTool,
    });

    // Only a reference built by getModelContext carries the normalisation.
    const reference = getModelContext({ modelContext: context } as Document);
    await expect(
      inspectAndExecuteFoundationSmokeTool(reference),
    ).resolves.toMatchObject({ result: '{"ok":true}' });

    // Chrome's JSON-string IDL first, then the draft object form on rejection.
    expect(executeTool).toHaveBeenNthCalledWith(1, tool, "{}", undefined);
    expect(executeTool).toHaveBeenNthCalledWith(2, tool, {}, undefined);
  });
});
