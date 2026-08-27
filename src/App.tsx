import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { DashboardPage } from "./routes/DashboardPage";
import { DebugPage } from "./routes/DebugPage";
import { GroceriesPage } from "./routes/GroceriesPage";
import { KitchenPage } from "./routes/KitchenPage";
import { RecipeDetailPage } from "./routes/RecipeDetailPage";
import { RecipesPage } from "./routes/RecipesPage";
import { useFoundationSmokeStatus } from "./webmcp/use-foundation-smoke";

const navigation = [
  ["/", "Dashboard"],
  ["/kitchen", "Kitchen"],
  ["/recipes", "Recipes"],
  ["/groceries", "Groceries"],
] as const;

export default function App() {
  const webMcpStatus = useFoundationSmokeStatus();

  return (
    <div className="min-h-screen bg-paper text-ink">
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
      </main>
    </div>
  );
}
