import { useEffect, useState } from "react";
import {
  registerFoundationSmokeTool,
  type SmokeRegistrationStatus,
} from "./foundation-smoke";

/**
 * Registers the Phase 0 smoke tool for the lifetime of the calling component.
 * The registration is released by its `AbortController`, which is also what
 * serialises StrictMode's double mount inside `registerFoundationSmokeTool`.
 *
 * `enabled` is the plan §4 gate: tools register only once the store has
 * hydrated and first-run initialization has finished, so an agent never sees
 * an empty kitchen mid-boot. While it is false the status stays `registering`.
 */
export function useFoundationSmokeStatus(
  enabled = true,
): SmokeRegistrationStatus {
  const [status, setStatus] = useState<SmokeRegistrationStatus>({
    state: "registering",
  });

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();

    void registerFoundationSmokeTool(controller.signal).then((next) => {
      if (!controller.signal.aborted) setStatus(next);
    });

    return () => controller.abort();
  }, [enabled]);

  return status;
}
