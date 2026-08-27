import { WebMcpSmokeInspector } from "../components/agent/WebMcpSmokeInspector";
import { PageIntro } from "../components/ui";
import type { SmokeRegistrationStatus } from "../webmcp/foundation-smoke";

interface DebugPageProps {
  webMcpStatus: SmokeRegistrationStatus;
}

export function DebugPage({ webMcpStatus }: DebugPageProps) {
  return (
    <>
      <PageIntro
        description="This development-only check uses document.modelContext.getTools() and executeTool() to prove the one-tool Phase 0 surface."
        eyebrow="Debug"
        title="Inspect the tool surface."
      />
      <WebMcpSmokeInspector registrationStatus={webMcpStatus} />
    </>
  );
}
