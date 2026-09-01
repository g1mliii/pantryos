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
  it("shows a ready thirteen-tool status and the latest completed call", () => {
    const id = beginAgentActivity("get_expiring_items", {});
    finishAgentActivity(id, "success", "Found three things.");

    render(
      <AgentActivityPanel
        status={{
          state: "ready",
          registeredCount: 13,
          source: "document",
          total: 13,
        }}
      />,
    );

    expect(screen.getByText("AI assistant ready")).toBeTruthy();
    expect(screen.getByText(/suggest a meal/i)).toBeTruthy();
    expect(screen.getByText("Checked what to use soon")).toBeTruthy();
    expect(screen.getByText("Found three things.")).toBeTruthy();
  });

  it("names saved-recipe edits and deletions in recent activity", () => {
    const updateId = beginAgentActivity("update_recipe", {});
    finishAgentActivity(updateId, "success", "Updated Herby Toast.");
    const removeId = beginAgentActivity("remove_recipe", {});
    finishAgentActivity(removeId, "success", "Deleted Herby Toast.");

    render(
      <AgentActivityPanel
        status={{
          state: "ready",
          registeredCount: 13,
          source: "document",
          total: 13,
        }}
      />,
    );

    expect(screen.getByText("Edited a recipe")).toBeTruthy();
    expect(screen.getByText("Deleted a recipe")).toBeTruthy();
    expect(screen.getByText("Updated Herby Toast.")).toBeTruthy();
    expect(screen.getByText("Deleted Herby Toast.")).toBeTruthy();
  });

  it("explains the normal no-WebMCP fallback", () => {
    render(
      <AgentActivityPanel
        status={{
          state: "unavailable",
          registeredCount: 0,
          total: 13,
        }}
      />,
    );

    expect(screen.getByText("Connect an AI agent")).toBeTruthy();
    expect(screen.getByText(/PantryOS works on its own/i)).toBeTruthy();
    expect(
      screen.getByText(
        /^PantryOS works on its own\. Open it in an AI agent desktop application/i,
      ),
    ).toBeTruthy();
    expect(screen.getByText("Connect in 3 steps")).toBeTruthy();
    expect(
      screen.getByText(/pantryos\.pressplay-subai\.workers\.dev/i),
    ).toBeTruthy();
    expect(screen.getByText(/Site-tool support varies/i)).toBeTruthy();
    expect(screen.getByText(/enable-webmcp-testing/i)).toBeTruthy();
  });
});
