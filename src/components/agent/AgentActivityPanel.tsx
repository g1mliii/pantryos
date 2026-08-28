import { SectionHeading } from "../ui";
import { useAgentActivityStore } from "../../stores/agent-activity-store";
import type { PantryToolsStatus } from "../../webmcp/register-tools";

function statusCopy(status: PantryToolsStatus) {
  switch (status.state) {
    case "ready":
      return {
        label: "Agent connected",
        message: `${status.total} tools registered. Your kitchen is stored in this browser, not on a server.`,
        tone: "ready" as const,
      };
    case "unavailable":
      return {
        label: "No agent here",
        message:
          "This browser cannot talk to tools. Everything still works by hand.",
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
        label: "Connecting agent",
        message: `Registering ${status.total} kitchen tools…`,
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
          <span
            aria-hidden="true"
            className={`size-[7px] rounded-full ${tone.dot}`}
          />
          <h2
            className={`text-xs font-semibold tracking-[0.14em] uppercase ${tone.label}`}
          >
            {copy.label}
          </h2>
        </div>
        <p className="mt-2.5 text-[13px] leading-[21px] text-ink-muted">
          {copy.message}
        </p>
      </section>

      <section className="mt-9">
        <SectionHeading>What it just did</SectionHeading>
        {entries.length === 0 ? (
          <p className="border-b border-rule-faint py-4 text-[13px] leading-5 text-ink-faint">
            Agent tool calls will appear here.
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
                  className={`font-mono text-xs ${STATUS_CLASS[entry.status]}`}
                >
                  {entry.toolName}
                  {entry.status === "running"
                    ? " · working"
                    : entry.durationMs === undefined
                      ? ""
                      : ` · ${entry.durationMs}ms`}
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
