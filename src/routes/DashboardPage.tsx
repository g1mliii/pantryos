import { Link } from "react-router-dom";
import { Callout, PageIntro, SectionHeading } from "../components/ui";
import type { SmokeRegistrationStatus } from "../webmcp/foundation-smoke";

const features = [
  ["Kitchen", "Track what is here and what goes off first.", "/kitchen"],
  ["Recipes", "Match meals against what should be used up.", "/recipes"],
  ["Groceries", "Collect what is missing, without duplicates.", "/groceries"],
] as const;

interface DashboardPageProps {
  webMcpStatus: SmokeRegistrationStatus;
}

const statusCopy: Record<SmokeRegistrationStatus["state"], [string, string]> = {
  registering: [
    "Checking WebMCP…",
    "PantryOS is asking this browser whether the foundation smoke tool can register.",
  ],
  ready: [
    "Foundation smoke tool ready.",
    "A single read-only tool is registered for Phase 0 inspection. Product tools remain out of scope.",
  ],
  unavailable: [
    "No WebMCP in this browser.",
    "The app still works normally. Enable a compatible browser build to inspect the foundation smoke tool.",
  ],
  error: [
    "WebMCP registration failed.",
    "The app remains usable; open the development debug route for the reported registration state.",
  ],
};

export function DashboardPage({ webMcpStatus }: DashboardPageProps) {
  const [statusTitle, statusDescription] = statusCopy[webMcpStatus.state];

  return (
    <>
      <PageIntro
        description="A local-first kitchen that people and browser-aware agents operate together, through the same domain actions."
        eyebrow="Foundation ready"
        title="Give your kitchen a precise agent interface."
      />

      <div className="mt-14">
        <SectionHeading meta="3 sections">Where things live</SectionHeading>
        <div className="mt-1">
          {features.map(([title, description, to]) => (
            <Link
              className="flex items-baseline justify-between gap-8 border-b border-rule-soft py-[26px] hover:text-copper-deep"
              key={to}
              to={to}
            >
              <h3 className="font-serif text-[28px] leading-8">{title}</h3>
              <p className="grow text-[15px] leading-[25px] text-ink-muted">
                {description}
              </p>
            </Link>
          ))}
        </div>
      </div>

      <Callout className="mt-14 max-w-xl">
        <p className="font-serif text-xl">{statusTitle}</p>
        <p className="mt-2 text-[15px] leading-[26px] text-ink-muted">
          {statusDescription}
        </p>
      </Callout>
    </>
  );
}
