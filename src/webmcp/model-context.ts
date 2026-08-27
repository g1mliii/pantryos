export type ModelContextSource = "document" | "navigator";

export interface CompatibleRegisteredTool {
  annotations?: WebMCP.ToolAnnotations;
  description: string;
  inputSchema?: object | string;
  name: string;
  origin?: string;
  title?: string;
  window?: Window;
}

export interface CompatibleModelContext {
  executeTool?: (
    tool: CompatibleRegisteredTool,
    inputArguments: Record<string, unknown> | string,
    options?: { signal?: AbortSignal },
  ) => Promise<string | null>;
  getTools?: (options?: {
    fromOrigins?: string[];
  }) => Promise<CompatibleRegisteredTool[]>;
  registerTool: (
    tool: WebMCP.ModelContextTool,
    options?: WebMCP.ModelContextRegisterToolOptions,
  ) => Promise<void>;
}

export interface ModelContextReference {
  context: CompatibleModelContext;
  source: ModelContextSource;
}

/**
 * The only compatibility boundary in PantryOS. The current API lives on
 * `document`; the navigator branch is retained only for older trial builds.
 */
export function getModelContext(
  currentDocument: Document = document,
  currentNavigator: Navigator = navigator,
): ModelContextReference | null {
  const read = (host: object) =>
    (host as { readonly modelContext?: CompatibleModelContext }).modelContext;

  const primary = read(currentDocument);
  if (primary) return { context: normalize(primary), source: "document" };

  const legacy = read(currentNavigator);
  if (legacy) return { context: normalize(legacy), source: "navigator" };

  return null;
}

/**
 * Builds disagree on `executeTool`'s argument form: Chrome's current IDL takes
 * a JSON string, the in-app browser takes the draft's object. Normalising here
 * keeps that the only place any caller has to care.
 */
function normalize(context: CompatibleModelContext): CompatibleModelContext {
  const { executeTool } = context;
  if (!executeTool) return context;

  return {
    ...context,
    executeTool: async (tool, inputArguments, options) => {
      try {
        return await executeTool.call(
          context,
          tool,
          typeof inputArguments === "string"
            ? inputArguments
            : JSON.stringify(inputArguments),
          options,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!/requires an object input/i.test(message)) throw error;

        return await executeTool.call(
          context,
          tool,
          typeof inputArguments === "string"
            ? (JSON.parse(inputArguments) as Record<string, unknown>)
            : inputArguments,
          options,
        );
      }
    },
  };
}
