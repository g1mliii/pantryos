import { useEffect, useState } from "react";
import { registerPantryTools, type PantryToolsStatus } from "./register-tools";
import { PANTRY_TOOLS } from "./tools";

export function usePantryToolsStatus(
  enabled: boolean,
  tools: readonly WebMCP.ModelContextTool[] = PANTRY_TOOLS,
): PantryToolsStatus {
  const [status, setStatus] = useState<PantryToolsStatus>({
    state: "registering",
    registeredCount: 0,
    total: tools.length,
  });

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();

    void registerPantryTools(controller.signal, undefined, tools).then(
      (next) => {
        if (!controller.signal.aborted) setStatus(next);
      },
    );

    return () => controller.abort();
  }, [enabled, tools]);

  return status;
}
