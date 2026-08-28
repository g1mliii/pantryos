import { useEffect, useState } from "react";
import {
  PANTRY_TOOL_COUNT,
  registerPantryTools,
  type PantryToolsStatus,
} from "./register-tools";

export function usePantryToolsStatus(enabled: boolean): PantryToolsStatus {
  const [status, setStatus] = useState<PantryToolsStatus>({
    state: "registering",
    registeredCount: 0,
    total: PANTRY_TOOL_COUNT,
  });

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();

    void registerPantryTools(controller.signal).then((next) => {
      if (!controller.signal.aborted) setStatus(next);
    });

    return () => controller.abort();
  }, [enabled]);

  return status;
}
