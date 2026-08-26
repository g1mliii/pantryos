import { Link } from "react-router-dom";
import { PageIntro } from "../components/ui/PageIntro";

const features = [
  ["Kitchen", "Track local inventory and expiry dates.", "/kitchen"],
  ["Recipes", "Match meals to what should be used first.", "/recipes"],
  [
    "Groceries",
    "Collect missing ingredients without duplicates.",
    "/groceries",
  ],
] as const;

export function DashboardPage() {
  return (
    <>
      <PageIntro
        description="A local-first kitchen that people and browser-aware agents can operate together through the same domain actions."
        eyebrow="Foundation ready"
        title="Give your kitchen a precise agent interface."
      />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {features.map(([title, description, to]) => (
          <Link
            className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-0.5 hover:border-lime-400/50 hover:bg-white/10"
            key={to}
            to={to}
          >
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-2 leading-7 text-stone-400">{description}</p>
          </Link>
        ))}
      </div>
      <aside className="mt-10 rounded-3xl border border-lime-400/20 bg-lime-400/10 p-6">
        <p className="text-sm font-medium text-lime-300">WebMCP status</p>
        <p className="mt-2 text-stone-300">
          Product tools are intentionally not registered in the foundation
          scaffold yet.
        </p>
      </aside>
    </>
  );
}
