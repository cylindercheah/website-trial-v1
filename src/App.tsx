import type { ReactElement } from "react";
import { lazy, Suspense } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { ThemeToggle } from "./components/ThemeToggle";
import { HomePage } from "./pages/HomePage";

const PlotlyPage = lazy(async () => ({
  default: (await import("./pages/PlotlyPage")).PlotlyPage,
}));

export default function App(): ReactElement {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__titles">
          <h1>Design Analytics</h1>
          <p>Vite + React · analytics gallery · touch-friendly defaults</p>
        </div>
        <ThemeToggle />
      </header>
      <nav>
        <NavLink
          to="/"
          end
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Home
        </NavLink>
        <NavLink
          to="/plotly"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Digital Circuits
        </NavLink>
      </nav>
      <main>
        <Suspense
          fallback={
            <div className="chart-card">
              <p className="hint">Loading chart library…</p>
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/plotly" element={<PlotlyPage />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
