import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  beginAgentActivity,
  clearAgentActivity,
  finishAgentActivity,
} from "../../stores/agent-activity-store";
import { AgentActivityPanel } from "./AgentActivityPanel";

afterEach(clearAgentActivity);

describe("AgentActivityPanel", () => {
  it("shows a ready ten-tool status and the latest completed call", () => {
    const id = beginAgentActivity("get_expiring_items", {});
    finishAgentActivity(id, "success", "Found three things.");

    render(
      <AgentActivityPanel
        status={{
          state: "ready",
          registeredCount: 10,
          source: "document",
          total: 10,
        }}
      />,
    );

    expect(screen.getByText("Agent connected")).toBeTruthy();
    expect(screen.getByText(/10 tools registered/i)).toBeTruthy();
    expect(screen.getByText(/get_expiring_items/)).toBeTruthy();
    expect(screen.getByText("Found three things.")).toBeTruthy();
  });

  it("explains the normal no-WebMCP fallback", () => {
    render(
      <AgentActivityPanel
        status={{
          state: "unavailable",
          registeredCount: 0,
          total: 10,
        }}
      />,
    );

    expect(screen.getByText("No agent here")).toBeTruthy();
    expect(screen.getByText(/everything still works by hand/i)).toBeTruthy();
  });
});
