import { describe, expect, it, vi } from "vitest";
import { getModelContext, type CompatibleModelContext } from "./model-context";

function context(
  overrides: Partial<CompatibleModelContext> = {},
): CompatibleModelContext {
  return {
    registerTool: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("WebMCP modelContext compatibility boundary", () => {
  it("prefers document.modelContext and isolates the navigator fallback", () => {
    const primary = context();
    const fallback = context();

    expect(
      getModelContext(
        { modelContext: primary } as Document,
        { modelContext: fallback } as unknown as Navigator,
      )?.source,
    ).toBe("document");
    expect(
      getModelContext(
        {} as Document,
        { modelContext: fallback } as unknown as Navigator,
      ),
    ).toEqual({ context: fallback, source: "navigator" });
  });

  it("keeps native methods bound to their real ModelContext receiver", async () => {
    const tools = [{ name: "example", description: "Example" }];
    const native: CompatibleModelContext = {
      registerTool: vi.fn(function (this: CompatibleModelContext) {
        if (this !== native) throw new TypeError("Illegal invocation");
        return Promise.resolve();
      }),
      getTools: vi.fn(function (this: CompatibleModelContext) {
        if (this !== native) throw new TypeError("Illegal invocation");
        return Promise.resolve(tools);
      }),
      executeTool: vi.fn(function (this: CompatibleModelContext) {
        if (this !== native) throw new TypeError("Illegal invocation");
        return Promise.resolve('{"ok":true}');
      }),
    };
    const reference = getModelContext({ modelContext: native } as Document);
    const tool = {
      name: "example",
      description: "Example",
      execute: () => undefined,
    };

    await expect(
      reference?.context.registerTool(tool),
    ).resolves.toBeUndefined();
    await expect(reference?.context.getTools?.()).resolves.toEqual(tools);
    await expect(
      reference?.context.executeTool?.(tools[0]!, { value: 1 }),
    ).resolves.toBe('{"ok":true}');
    expect(native.executeTool).toHaveBeenCalledWith(
      tools[0],
      '{"value":1}',
      undefined,
    );
  });

  it("falls back to object input only when a build explicitly requires it", async () => {
    const tool = { name: "example", description: "Example" };
    const executeTool = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Requires an object input"))
      .mockResolvedValueOnce('{"ok":true}');
    const reference = getModelContext({
      modelContext: context({ executeTool }),
    } as Document);

    await expect(
      reference?.context.executeTool?.(tool, { value: 1 }),
    ).resolves.toBe('{"ok":true}');
    expect(executeTool).toHaveBeenNthCalledWith(
      1,
      tool,
      '{"value":1}',
      undefined,
    );
    expect(executeTool).toHaveBeenNthCalledWith(
      2,
      tool,
      { value: 1 },
      undefined,
    );
  });
});
