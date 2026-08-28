import { afterEach, describe, expect, it } from "vitest";
import {
  agentActivityStore,
  beginAgentActivity,
  clearAgentActivity,
  finishAgentActivity,
  redactActivityInput,
} from "./agent-activity-store";

afterEach(clearAgentActivity);

describe("agent activity store", () => {
  it("records bounded, timed activity without persisting sensitive values", () => {
    const id = beginAgentActivity(
      "add_inventory_item",
      {
        name: "a".repeat(120),
        password: "not-for-the-rail",
        nested: { token: "also-private" },
      },
      new Date("2026-08-28T12:00:00.000Z"),
    );
    finishAgentActivity(
      id,
      "success",
      "Added one item.",
      new Date("2026-08-28T12:00:00.007Z"),
    );

    expect(agentActivityStore.getState().entries[0]).toMatchObject({
      durationMs: 7,
      status: "success",
      summary: "Added one item.",
    });
    expect(agentActivityStore.getState().entries[0]?.input).toEqual({
      name: `${"a".repeat(79)}…`,
      nested: { token: "[redacted]" },
      password: "[redacted]",
    });
  });

  it("caps the visible history at ten newest entries", () => {
    for (let index = 0; index < 12; index += 1) {
      beginAgentActivity(`tool_${index}`, {});
    }

    expect(agentActivityStore.getState().entries).toHaveLength(10);
    expect(agentActivityStore.getState().entries[0]?.toolName).toBe("tool_11");
    expect(agentActivityStore.getState().entries.at(-1)?.toolName).toBe(
      "tool_2",
    );
  });

  it("returns an empty object for non-object input", () => {
    expect(redactActivityInput("plain text")).toEqual({});
  });
});
