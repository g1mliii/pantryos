import { ToolDebugInspector } from "../components/agent/ToolDebugInspector";
import { PageIntro, SectionHeading } from "../components/ui";
import { describeToolAnnotations } from "../webmcp/tool-utils";
import { PANTRY_TOOLS } from "../webmcp/tools";
import type { PantryToolsStatus } from "../webmcp/register-tools";

interface DebugPageProps {
  webMcpStatus: PantryToolsStatus;
}

export function DebugPage({ webMcpStatus }: DebugPageProps) {
  return (
    <>
      <PageIntro
        description={`This development-only view shows all ${webMcpStatus.total} tool contracts and runs them through document.modelContext, the path an agent uses. Registration is ${webMcpStatus.state}.`}
        eyebrow="Debug"
        title="Inspect the tool surface."
      />
      <section className="mt-12">
        <SectionHeading meta={`${PANTRY_TOOLS.length} tools`}>
          The registry
        </SectionHeading>
        <div className="grid gap-x-10 sm:grid-cols-2 xl:grid-cols-3">
          {PANTRY_TOOLS.map((tool) => (
            <article className="border-b border-rule-soft py-4" key={tool.name}>
              <h3 className="font-mono text-[13px] text-copper-deep">
                {tool.name}
              </h3>
              <p className="mt-1 text-xs text-ink-faint">
                {describeToolAnnotations(tool.annotations)}
              </p>
            </article>
          ))}
        </div>
      </section>
      <ToolDebugInspector />
    </>
  );
}
