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
        label: "Connect an AI agent",
        message:
          "PantryOS works on its own. Open it in an AI agent desktop application with a WebMCP-capable built-in browser; its site tools are discovered automatically.",
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
          <GuidedDisclosure label="Connect in 3 steps">
            <ol className="list-decimal space-y-2 pl-4">
              <li>
                In your AI agent desktop application, start a chat and say:
                <span className="mt-1 block font-serif italic text-ink-soft">
                  “Open https://pantryos.pressplay-subai.workers.dev in the
                  built-in browser and use its site tools.”
                </span>
              </li>
              <li>
                Keep the PantryOS tab open and ask: “What should I use first?”
              </li>
              <li>
                Approve website access if asked, then review the result here.
                PantryOS asks again before deleting food or a saved recipe.
              </li>
            </ol>
            <p className="mt-3 text-ink-faint">
              Site-tool support varies by application and model. If PantryOS
              stays disconnected, update the desktop application and check its
              browser or site-tool permissions.
            </p>
            <p className="mt-3 text-ink-faint">
              Testing in Chrome? Enable chrome://flags/#enable-webmcp-testing,
              relaunch Chrome, and use a WebMCP-capable agent or the Model
              Context Tool Inspector.
            </p>
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
