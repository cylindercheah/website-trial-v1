import type { ReactElement } from "react";
import { lazy, Suspense } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";

const PlotlyPage = lazy(async () => ({
  default: (await import("./pages/PlotlyPage")).PlotlyPage,
}));
const EChartsPage = lazy(async () => ({
  default: (await import("./pages/EChartsPage")).EChartsPage,
}));

export default function App(): ReactElement {
  return (
    <div className="app-shell">
      <header>
        <h1>Plotly.js vs ECharts — evaluation demo</h1>
        <p>
          Vite + React · PPA-style scatter + line chart · touch-friendly defaults
        </p>
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
          Plotly.js
        </NavLink>
        <NavLink
          to="/echarts"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          ECharts
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
            <Route path="/echarts" element={<EChartsPage />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
