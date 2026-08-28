import { useMemo, useState } from "react";
import { Button, Callout, FieldCaption, Select, TextField } from "../ui";
import { getModelContext } from "../../webmcp/model-context";
import { describeToolAnnotations } from "../../webmcp/tool-utils";
import { PANTRY_TOOLS } from "../../webmcp/tools";

interface ToolRun {
  route: string;
  output: string;
}

function prettyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

/**
 * Runs the tool the way an agent does: `getTools()` to find the registered
 * tool, then `executeTool()` through the page API. That is the only live
 * caller of the compatibility adapter's argument shim, so this view is where a
 * real browser proves it works. Returns null only when the browser has no page
 * API; a missing registration is a failed inspection and must stay visible.
 */
async function runThroughPageApi(
  name: string,
  args: Record<string, unknown>,
  signal: AbortSignal,
): Promise<ToolRun | null> {
  const reference = getModelContext();
  const context = reference?.context;
  if (!reference || !context?.getTools || !context.executeTool) return null;

  const registered = (await context.getTools()).find(
    (candidate) => candidate.name === name,
  );
  if (!registered) {
    throw new Error(
      `${name} is not registered in ${reference.source}.modelContext. Check the registration status before retrying.`,
    );
  }

  const result = await context.executeTool(registered, args, { signal });
  if (result === null) {
    return { route: reference.source, output: "The tool returned no content." };
  }
  try {
    return { route: reference.source, output: prettyJson(JSON.parse(result)) };
  } catch {
    return { route: reference.source, output: result };
  }
}

export function ToolDebugInspector() {
  const [toolName, setToolName] = useState(PANTRY_TOOLS[0]?.name ?? "");
  const [input, setInput] = useState("{}");
  const [output, setOutput] = useState(
    "Choose a registered tool and run it the way an agent would.",
  );
  const [route, setRoute] = useState("");
  const [running, setRunning] = useState(false);
  const tool = useMemo(
    () => PANTRY_TOOLS.find((candidate) => candidate.name === toolName),
    [toolName],
  );

  async function runTool() {
    if (!tool) return;
    setRunning(true);
    try {
      const parsed = JSON.parse(input) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Input must be one JSON object.");
      }
      const args = parsed as Record<string, unknown>;
      const signal = new AbortController().signal;
      const viaPageApi = await runThroughPageApi(tool.name, args, signal);
      if (viaPageApi) {
        setRoute(`ran through ${viaPageApi.route}.modelContext.executeTool`);
        setOutput(viaPageApi.output);
        return;
      }
      setRoute("ran the registered callback; no page API in this browser");
      setOutput(prettyJson(await tool.execute(args, { signal })));
    } catch (caught) {
      setRoute("");
      setOutput(
        caught instanceof Error ? caught.message : "Tool execution failed.",
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="mt-12">
      <div className="grid gap-5 md:grid-cols-[240px_1fr] md:items-end">
        <label className="block text-sm text-ink-soft">
          <FieldCaption>Tool</FieldCaption>
          <Select
            label="Tool to call"
            onChange={setToolName}
            options={PANTRY_TOOLS.map((candidate) => ({
              label: candidate.name,
              value: candidate.name,
            }))}
            value={toolName}
          />
        </label>
        <TextField
          label="JSON input"
          onChange={(event) => setInput(event.target.value)}
          spellCheck={false}
          value={input}
        />
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-5">
        <Button disabled={running || !tool} onClick={() => void runTool()}>
          {running ? "Running…" : "Run tool"}
        </Button>
        {tool ? (
          <p className="text-[13px] text-ink-faint">
            {describeToolAnnotations(tool.annotations)}
            {route ? ` · ${route}` : ""}
          </p>
        ) : null}
      </div>
      <Callout
        aria-live="polite"
        as="pre"
        className="mt-6 overflow-x-auto font-mono text-xs leading-6 whitespace-pre-wrap text-ink-soft"
        padding="compact"
      >
        {output}
      </Callout>
    </section>
  );
}
