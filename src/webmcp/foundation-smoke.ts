import { z } from "zod";
import {
  getModelContext,
  type CompatibleRegisteredTool,
  type ModelContextReference,
  type ModelContextSource,
} from "./model-context";

export const FOUNDATION_SMOKE_TOOL_NAME = "pantryos_foundation_smoke";

const smokeInputSchema = z.object({}).strict();

export const foundationSmokeTool: WebMCP.ModelContextTool = {
  name: FOUNDATION_SMOKE_TOOL_NAME,
  title: "Check PantryOS foundation",
  description:
    "Use only to verify that this PantryOS page can register and execute a WebMCP tool. It does not read or change kitchen data.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  annotations: {
    readOnlyHint: true,
    untrustedContentHint: false,
  },
  execute: (input, options) => {
    // Some current inspector surfaces omit the draft's execution options.
    // Honour cancellation whenever a conforming caller supplies the signal.
    if (options?.signal?.aborted) {
      throw new DOMException("The smoke check was cancelled.", "AbortError");
    }

    const parsed = smokeInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        summary: "The foundation smoke tool accepts no arguments.",
        error: "invalid_input",
        details: parsed.error.flatten(),
      };
    }

    return {
      ok: true,
      summary: "PantryOS WebMCP foundation is available.",
      data: { phase: 0 },
    };
  },
};

export type SmokeRegistrationStatus =
  | { state: "registering" }
  | { state: "unavailable" }
  | { state: "ready"; source: ModelContextSource }
  | { state: "error"; message: string };

/**
 * StrictMode mounts, cleans up and remounts in a single commit, so the second
 * `registerTool` would otherwise be issued for the same tool name while the
 * first is still in flight. Registrations are released by their signal, so
 * chain the calls: each one starts only once the previous has settled and let
 * go of the name.
 */
let registrationChain: Promise<unknown> = Promise.resolve();

async function registerOnce(
  signal: AbortSignal,
  reference: ModelContextReference,
): Promise<SmokeRegistrationStatus> {
  // Aborted while queued behind an earlier registration — never claim the name.
  if (signal.aborted) return { state: "registering" };

  try {
    await reference.context.registerTool(foundationSmokeTool, { signal });
    return signal.aborted
      ? { state: "registering" }
      : { state: "ready", source: reference.source };
  } catch (error) {
    if (signal.aborted) return { state: "registering" };
    return {
      state: "error",
      message: error instanceof Error ? error.message : "Registration failed.",
    };
  }
}

export function registerFoundationSmokeTool(
  signal: AbortSignal,
  reference = getModelContext(),
): Promise<SmokeRegistrationStatus> {
  if (!reference) return Promise.resolve({ state: "unavailable" });

  const run = registrationChain.then(() => registerOnce(signal, reference));
  registrationChain = run.catch(() => undefined);
  return run;
}

export interface SmokeInspection {
  result: string | null;
  source: ModelContextSource;
  tool: CompatibleRegisteredTool;
}

export async function inspectAndExecuteFoundationSmokeTool(
  reference = getModelContext(),
): Promise<SmokeInspection> {
  if (!reference) throw new Error("WebMCP is unavailable in this browser.");

  const { context } = reference;
  if (!context.getTools || !context.executeTool) {
    throw new Error(
      "This WebMCP build cannot inspect and execute registered tools from the page.",
    );
  }

  const tools = await context.getTools();
  const tool = tools.find(({ name }) => name === FOUNDATION_SMOKE_TOOL_NAME);
  if (!tool) throw new Error("The foundation smoke tool is not registered.");

  // `getModelContext` already normalises the two argument forms.
  const result = await context.executeTool(tool, {});
  return { result, source: reference.source, tool };
}
