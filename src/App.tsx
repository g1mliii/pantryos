import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { DashboardPage } from "./routes/DashboardPage";
import { DebugPage } from "./routes/DebugPage";
import { GroceriesPage } from "./routes/GroceriesPage";
import { KitchenPage } from "./routes/KitchenPage";
import { RecipeDetailPage } from "./routes/RecipeDetailPage";
import { RecipesPage } from "./routes/RecipesPage";

const navigation = [
  ["/", "Dashboard"],
  ["/kitchen", "Kitchen"],
  ["/recipes", "Recipes"],
  ["/groceries", "Groceries"],
] as const;

export default function App() {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="border-b border-white/10 bg-stone-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <NavLink className="text-xl font-semibold tracking-tight" to="/">
            Pantry<span className="text-lime-400">OS</span>
          </NavLink>
          <nav aria-label="Primary" className="flex flex-wrap gap-1">
            {navigation.map(([to, label]) => (
              <NavLink
                className={({ isActive }) =>
                  `rounded-full px-3 py-2 text-sm transition ${
                    isActive
                      ? "bg-lime-400 text-stone-950"
                      : "text-stone-300 hover:bg-white/10 hover:text-white"
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

      <main className="mx-auto max-w-6xl px-5 py-10">
        <Routes>
          <Route element={<DashboardPage />} path="/" />
          <Route element={<KitchenPage />} path="/kitchen" />
          <Route element={<RecipesPage />} path="/recipes" />
          <Route element={<RecipeDetailPage />} path="/recipes/:recipeId" />
          <Route element={<GroceriesPage />} path="/groceries" />
          <Route
            element={
              import.meta.env.DEV ? <DebugPage /> : <Navigate replace to="/" />
            }
            path="/debug"
          />
          <Route element={<Navigate replace to="/" />} path="*" />
        </Routes>
      </main>
    </div>
  );
}
