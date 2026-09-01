import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { AgentActivityPanel } from "./components/agent/AgentActivityPanel";
import { ConfirmationDialog, MAIN_REGION_ID } from "./components/ui";
import { DashboardPage } from "./routes/DashboardPage";
import { DebugPage } from "./routes/DebugPage";
import { GroceriesPage } from "./routes/GroceriesPage";
import { KitchenPage } from "./routes/KitchenPage";
import { RecipeDetailPage } from "./routes/RecipeDetailPage";
import { RecipesPage } from "./routes/RecipesPage";
import { useKitchenStore } from "./stores/kitchen-store";
import { usePantryToolsStatus } from "./webmcp/use-pantry-tools";

const navigation = [
  ["/", "Dashboard"],
  ["/kitchen", "Kitchen"],
  ["/recipes", "Recipes"],
  ["/groceries", "Groceries"],
] as const;

export default function App() {
  const kitchenReady = useKitchenStore(
    (state) => state.hasHydrated && state.hasInitialized,
  );
  const webMcpStatus = usePantryToolsStatus(kitchenReady);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <ConfirmationDialog />
      <div aria-hidden="true" className="h-[5px] bg-copper" />

      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-[1240px] flex-col items-start gap-5 px-10 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
          <NavLink className="font-serif text-[25px] tracking-[0.01em]" to="/">
            Pantry<span className="text-copper">OS</span>
          </NavLink>
          <nav
            aria-label="Primary"
            className="grid w-full grid-cols-2 gap-x-8 gap-y-4 sm:flex sm:w-auto sm:flex-wrap sm:gap-[34px]"
          >
            {navigation.map(([to, label]) => (
              <NavLink
                className={({ isActive }) =>
                  `pb-[3px] text-sm tracking-[0.02em] ${
                    isActive
                      ? "border-b-[3px] border-copper text-ink"
                      : "text-ink-muted hover:text-copper-deep"
                  }`
                }
                end={to === "/"}
                key={to}
                to={to}
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* id and tabIndex give ConfirmationDialog somewhere to return focus
          when the element that opened it has since been removed. */}
      <main
        className="mx-auto grid max-w-[1240px] gap-14 px-10 py-13 outline-none lg:grid-cols-[minmax(0,1fr)_274px]"
        id={MAIN_REGION_ID}
        tabIndex={-1}
      >
        <div className="min-w-0">
          {kitchenReady ? (
            <Routes>
              <Route element={<DashboardPage />} path="/" />
              <Route element={<KitchenPage />} path="/kitchen" />
              <Route element={<RecipesPage />} path="/recipes" />
              <Route element={<RecipeDetailPage />} path="/recipes/:recipeId" />
              <Route element={<GroceriesPage />} path="/groceries" />
              <Route
                element={
                  import.meta.env.DEV ? (
                    <DebugPage webMcpStatus={webMcpStatus} />
                  ) : (
                    <Navigate replace to="/" />
                  )
                }
                path="/debug"
              />
              <Route element={<Navigate replace to="/" />} path="*" />
            </Routes>
          ) : (
            <p className="font-serif text-2xl">Preparing your kitchen…</p>
          )}
        </div>
        <AgentActivityPanel status={webMcpStatus} />
      </main>
    </div>
  );
}
