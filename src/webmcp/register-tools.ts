import {
  getModelContext,
  type ModelContextReference,
  type ModelContextSource,
} from "./model-context";
import { PANTRY_TOOLS } from "./tools";

export const PANTRY_TOOL_COUNT = PANTRY_TOOLS.length;

export type PantryToolsStatus =
  | { state: "registering"; registeredCount: number; total: number }
  | { state: "unavailable"; registeredCount: 0; total: number }
  | {
      state: "ready";
      registeredCount: number;
      source: ModelContextSource;
      total: number;
    }
  | {
      state: "error";
      failedTools: string[];
      message: string;
      registeredCount: number;
      source: ModelContextSource;
      total: number;
    };

let registrationChain: Promise<unknown> = Promise.resolve();

async function registerOnce(
  signal: AbortSignal,
  reference: ModelContextReference,
  tools: readonly WebMCP.ModelContextTool[],
): Promise<PantryToolsStatus> {
  // An aborted run leaves the status where it was: StrictMode's second pass
  // registers again, and a half-finished count is not an error.
  const stillRegistering = (registeredCount: number): PantryToolsStatus => ({
    state: "registering",
    registeredCount,
    total: tools.length,
  });
  if (signal.aborted) return stillRegistering(0);

  const failures: Array<{ name: string; message: string }> = [];
  let registeredCount = 0;
  for (const tool of tools) {
    if (signal.aborted) return stillRegistering(registeredCount);
    try {
      await reference.context.registerTool(tool, { signal });
      registeredCount += 1;
    } catch (caught) {
      if (signal.aborted) return stillRegistering(registeredCount);
      failures.push({
        name: tool.name,
        message:
          caught instanceof Error ? caught.message : "Registration failed.",
      });
    }
  }

  if (signal.aborted) return stillRegistering(registeredCount);

  if (failures.length > 0) {
    return {
      state: "error",
      registeredCount,
      total: tools.length,
      source: reference.source,
      failedTools: failures.map((failure) => failure.name),
      message: failures
        .map((failure) => `${failure.name}: ${failure.message}`)
        .join("; "),
    };
  }
  return {
    state: "ready",
    registeredCount,
    total: tools.length,
    source: reference.source,
  };
}

export function registerPantryTools(
  signal: AbortSignal,
  reference = getModelContext(),
  tools: readonly WebMCP.ModelContextTool[] = PANTRY_TOOLS,
): Promise<PantryToolsStatus> {
  if (!reference) {
    return Promise.resolve({
      state: "unavailable",
      registeredCount: 0,
      total: tools.length,
    });
  }

  const run = registrationChain.then(() =>
    registerOnce(signal, reference, tools),
  );
  registrationChain = run.catch(() => undefined);
  return run;
}
