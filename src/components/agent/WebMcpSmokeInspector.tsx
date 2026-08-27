import { useState } from "react";
import { Button, Callout } from "../ui";
import {
  inspectAndExecuteFoundationSmokeTool,
  type SmokeRegistrationStatus,
} from "../../webmcp/foundation-smoke";

interface WebMcpSmokeInspectorProps {
  registrationStatus: SmokeRegistrationStatus;
}

/**
 * `executeTool` resolves to an arbitrary string, so a non-JSON payload is a
 * successful run — not a failure. Show it verbatim rather than letting the
 * parse error escape and read as a broken tool.
 */
function parseResult(result: string | null | undefined): unknown {
  if (!result) return result;
  try {
    return JSON.parse(result);
  } catch {
    return result;
  }
}

export function WebMcpSmokeInspector({
  registrationStatus,
}: WebMcpSmokeInspectorProps) {
  const [output, setOutput] = useState(
    "Run the check to inspect and execute the registered smoke tool.",
  );
  const [running, setRunning] = useState(false);

  async function runInspection() {
    setRunning(true);
    try {
      const inspection = await inspectAndExecuteFoundationSmokeTool();
      setOutput(
        JSON.stringify(
          {
            source: inspection.source,
            tool: inspection.tool.name,
            result: parseResult(inspection.result),
          },
          null,
          2,
        ),
      );
    } catch (error) {
      setOutput(error instanceof Error ? error.message : "Inspection failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="mt-10 max-w-2xl border-t border-rule pt-7">
      <p className="mb-4 text-sm leading-6 text-ink-muted">
        Registration state: <strong>{registrationStatus.state}</strong>
      </p>
      {registrationStatus.state === "error" ? (
        <p className="mb-4 text-sm leading-6 text-urgent-deep" role="alert">
          Registration error: {registrationStatus.message}
        </p>
      ) : null}
      <Button
        disabled={registrationStatus.state !== "ready" || running}
        onClick={() => void runInspection()}
      >
        {running ? "Checking…" : "Inspect and run smoke tool"}
      </Button>
      <Callout
        aria-live="polite"
        as="pre"
        className="mt-5 overflow-x-auto font-mono text-xs leading-6 whitespace-pre-wrap text-ink-soft"
        padding="compact"
      >
        {output}
      </Callout>
    </section>
  );
}
