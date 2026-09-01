import { GuidedDisclosure, SectionHeading } from "../ui";
import { useAgentActivityStore } from "../../stores/agent-activity-store";
import type { PantryToolsStatus } from "../../webmcp/register-tools";

function statusCopy(status: PantryToolsStatus) {
  switch (status.state) {
    case "ready":
      return {
        label: "AI assistant ready",
        message:
          "Ask it to check your food, suggest a meal, or update your grocery list.",
        tone: "ready" as const,
      };
    case "unavailable":
      return {
        label: "Connect an AI assistant",
        message:
          "PantryOS works on its own. Use a WebMCP-compatible AI browser when you want help planning or updating your kitchen.",
        tone: "muted" as const,
      };
    case "error": {
      const failed = status.total - status.registeredCount;
      return {
        label: `${failed} ${failed === 1 ? "tool" : "tools"} did not load`,
        message: `${status.registeredCount} of ${status.total} registered. Reload to try the rest again.`,
        tone: "error" as const,
      };
    }
    case "registering":
      return {
        label: "Connecting your AI assistant",
        message: "Getting your kitchen ready for AI help…",
        tone: "muted" as const,
      };
  }
}

/** One row per tone keeps the banner's three surfaces from drifting apart. */
const TONE_CLASS = {
  ready: {
    section: "border-copper bg-paper-sunk",
    dot: "bg-copper",
    label: "text-copper-deep",
  },
  muted: {
    section: "border-rule bg-paper-deep",
    dot: "bg-ink-ghost",
    label: "text-ink-faint",
  },
  error: {
    section: "border-rule bg-paper-deep",
    dot: "bg-urgent",
    label: "text-urgent",
  },
} as const;

const FRIENDLY_ACTION = {
  get_inventory: "Checked your kitchen",
  get_expiring_items: "Checked what to use soon",
  add_inventory_item: "Added food to your kitchen",
  consume_inventory_item: "Updated an amount",
  remove_inventory_item: "Removed food from your kitchen",
  find_recipes: "Looked for a meal",
  get_recipe: "Opened a recipe",
  add_recipe: "Saved a recipe",
  update_recipe: "Edited a recipe",
  remove_recipe: "Deleted a recipe",
  add_grocery_item: "Added a grocery item",
  add_recipe_to_grocery_list: "Planned shopping for a meal",
  get_grocery_list: "Checked your grocery list",
} as const;

function friendlyAction(toolName: string) {
  return (
    FRIENDLY_ACTION[toolName as keyof typeof FRIENDLY_ACTION] ??
    "Helped with your kitchen"
  );
}

const STATUS_CLASS = {
  cancelled: "text-ink-faint",
  declined: "text-ink-faint",
  error: "text-urgent",
  running: "text-copper-deep",
  success: "text-ink",
} as const;

export function AgentActivityPanel({ status }: { status: PantryToolsStatus }) {
  const entries = useAgentActivityStore((state) => state.entries);
  const copy = statusCopy(status);
  const tone = TONE_CLASS[copy.tone];

  return (
    <aside
      aria-label="Agent activity"
      className="mt-14 border-t border-rule pt-10 lg:mt-0 lg:w-[274px] lg:border-t-0 lg:border-l lg:pt-0 lg:pl-[34px]"
    >
      <section
        aria-live="polite"
        className={`border-t-[3px] px-[18px] py-4 ${tone.section}`}
      >
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className={`size-[7px] ${tone.dot}`} />
          <h2
            className={`text-xs font-semibold tracking-[0.14em] uppercase ${tone.label}`}
          >
            {copy.label}
          </h2>
        </div>
        <p className="mt-2.5 text-[13px] leading-[21px] text-ink-muted">
          {copy.message}
        </p>
        {status.state === "unavailable" ? (
          <GuidedDisclosure label="How to connect — 5 steps">
            <ol className="list-decimal space-y-2 pl-4">
              <li>
                Open PantryOS in an AI browser that supports website tools.
              </li>
              <li>
                In a Chrome WebMCP testing build, enable WebMCP testing and
                reload this page.
              </li>
              <li>Keep PantryOS open while you start your AI conversation.</li>
              <li>Ask something simple, such as “What should I use first?”</li>
              <li>
                Review the result here. PantryOS will ask before removing food.
              </li>
            </ol>
          </GuidedDisclosure>
        ) : null}
      </section>

      <section className="mt-9">
        <SectionHeading>Recent AI help</SectionHeading>
        {entries.length === 0 ? (
          <p className="border-b border-rule-faint py-4 text-[13px] leading-5 text-ink-faint">
            When an AI helps with this kitchen, its recent actions will appear
            here.
          </p>
        ) : (
          <ol aria-live="polite">
            {entries.slice(0, 5).map((entry) => (
              <li
                className={`border-b border-rule-faint py-3.5 pl-3 ${
                  entry.status === "running"
                    ? "border-l-2 border-l-copper"
                    : "border-l-2 border-l-rule-warm"
                }`}
                key={entry.id}
              >
                <p
                  className={`text-sm font-medium ${STATUS_CLASS[entry.status]}`}
                >
                  {friendlyAction(entry.toolName)}
                  {entry.status === "running" ? " · working" : ""}
                </p>
                <p
                  className={`mt-1 text-[13px] leading-5 ${
                    entry.status === "error" ? "text-urgent" : "text-ink-muted"
                  }`}
                >
                  {entry.summary}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </aside>
  );
}
