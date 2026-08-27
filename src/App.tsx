import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { ConfirmationDialog } from "./components/ui";
import { DashboardPage } from "./routes/DashboardPage";
import { DebugPage } from "./routes/DebugPage";
import { GroceriesPage } from "./routes/GroceriesPage";
import { KitchenPage } from "./routes/KitchenPage";
import { RecipeDetailPage } from "./routes/RecipeDetailPage";
import { RecipesPage } from "./routes/RecipesPage";
import { useKitchenStore } from "./stores/kitchen-store";
import { useFoundationSmokeStatus } from "./webmcp/use-foundation-smoke";

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
  const webMcpStatus = useFoundationSmokeStatus(kitchenReady);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <ConfirmationDialog />
      <div aria-hidden="true" className="h-[5px] bg-copper" />

      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-baseline justify-between gap-6 px-10 py-5">
          <NavLink className="font-serif text-[25px] tracking-[0.01em]" to="/">
            Pantry<span className="text-copper">OS</span>
          </NavLink>
          <nav aria-label="Primary" className="flex flex-wrap gap-[34px]">
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

      <main className="mx-auto max-w-[1240px] px-10 py-13">
        {kitchenReady ? (
          <Routes>
            <Route
              element={<DashboardPage webMcpStatus={webMcpStatus} />}
              path="/"
            />
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
      </main>
    </div>
  );
}
