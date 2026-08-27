import { useEffect, useState } from "react";
import {
  registerFoundationSmokeTool,
  type SmokeRegistrationStatus,
} from "./foundation-smoke";

/**
 * Registers the Phase 0 smoke tool for the lifetime of the calling component.
 * The registration is released by its `AbortController`, which is also what
 * serialises StrictMode's double mount inside `registerFoundationSmokeTool`.
 */
export function useFoundationSmokeStatus(): SmokeRegistrationStatus {
  const [status, setStatus] = useState<SmokeRegistrationStatus>({
    state: "registering",
  });

  useEffect(() => {
    const controller = new AbortController();

    void registerFoundationSmokeTool(controller.signal).then((next) => {
      if (!controller.signal.aborted) setStatus(next);
    });

    return () => controller.abort();
  }, []);

  return status;
}
