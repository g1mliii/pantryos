import { z } from "zod";
import {
  beginAgentActivity,
  finishAgentActivity,
  type AgentActivityStatus,
} from "../stores/agent-activity-store";

export type ToolResult<T> =
  | { ok: true; summary: string; data: T }
  | {
      ok: false;
      summary: string;
      error: string;
      details?: unknown;
    };

export const toolSuccess = <T>(summary: string, data: T): ToolResult<T> => ({
  ok: true,
  summary,
  data,
});

export const toolFailure = (
  summary: string,
  error: string,
  details?: unknown,
): ToolResult<never> => ({
  ok: false,
  summary,
  error,
  ...(details === undefined ? {} : { details }),
});

function activityStatus(
  result: ToolResult<unknown>,
): Exclude<AgentActivityStatus, "running"> {
  if (result.ok) return "success";
  if (result.error === "declined") return "declined";
  if (result.error === "cancelled") return "cancelled";
  return "error";
}

export function createToolExecutor<TInput extends Record<string, unknown>>(
  toolName: string,
  schema: z.ZodType<TInput>,
  handler: (
    input: TInput,
    options: WebMCP.ToolExecuteCallbackOptions,
  ) => Promise<ToolResult<unknown>> | ToolResult<unknown>,
): WebMCP.ToolExecuteCallback {
  return async (input, options) => {
    const activityId = beginAgentActivity(toolName, input);
    if (options?.signal?.aborted) {
      const result = toolFailure(
        "The tool call was cancelled before it started.",
        "cancelled",
      );
      finishAgentActivity(activityId, "cancelled", result.summary);
      return result;
    }

    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      const result = toolFailure(
        "The tool input was not valid. Correct the returned fields and try again.",
        "invalid_input",
        parsed.error.flatten(),
      );
      finishAgentActivity(activityId, "error", result.summary);
      return result;
    }

    try {
      const result = await handler(parsed.data, options);
      finishAgentActivity(activityId, activityStatus(result), result.summary);
      return result;
    } catch (caught) {
      if (options?.signal?.aborted) {
        const result = toolFailure(
          "The tool call was cancelled. Nothing else was changed.",
          "cancelled",
        );
        finishAgentActivity(activityId, "cancelled", result.summary);
        return result;
      }
      const result = toolFailure(
        "PantryOS could not complete that tool call. Check the current kitchen state and try again.",
        "unexpected_error",
      );
      finishAgentActivity(activityId, "error", result.summary);
      // Do not leak arbitrary exceptions to an agent result or the activity rail.
      if (import.meta.env.DEV) console.error("PantryOS tool failure", caught);
      return result;
    }
  };
}

/** One wording for a tool's contract, shared by every debug surface. */
export function describeToolAnnotations(annotations?: WebMCP.ToolAnnotations) {
  return `${annotations?.readOnlyHint ? "reads" : "writes"} · ${
    annotations?.untrustedContentHint ? "may echo your words" : "curated output"
  }`;
}

export function toToolJsonSchema<TInput extends Record<string, unknown>>(
  schema: z.ZodType<TInput>,
  constraints: Record<string, unknown> = {},
) {
  const generated = z.toJSONSchema(schema) as Record<string, unknown>;
  delete generated.$schema;
  return { ...generated, ...constraints };
}
