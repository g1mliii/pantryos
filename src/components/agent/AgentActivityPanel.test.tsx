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
  it("shows a ready eleven-tool status and the latest completed call", () => {
    const id = beginAgentActivity("get_expiring_items", {});
    finishAgentActivity(id, "success", "Found three things.");

    render(
      <AgentActivityPanel
        status={{
          state: "ready",
          registeredCount: 11,
          source: "document",
          total: 11,
        }}
      />,
    );

    expect(screen.getByText("AI assistant ready")).toBeTruthy();
    expect(screen.getByText(/suggest a meal/i)).toBeTruthy();
    expect(screen.getByText("Checked what to use soon")).toBeTruthy();
    expect(screen.getByText("Found three things.")).toBeTruthy();
  });

  it("explains the normal no-WebMCP fallback", () => {
    render(
      <AgentActivityPanel
        status={{
          state: "unavailable",
          registeredCount: 0,
          total: 11,
        }}
      />,
    );

    expect(screen.getByText("Connect an AI assistant")).toBeTruthy();
    expect(screen.getByText(/PantryOS works on its own/i)).toBeTruthy();
    expect(screen.getByText("How to connect — 5 steps")).toBeTruthy();
  });
});
