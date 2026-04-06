import type { ReactElement } from "react";
import { lazy, Suspense } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { ThemeToggle } from "./components/ThemeToggle";
import { HomePage } from "./pages/HomePage";

const PlotlyPage = lazy(async () => ({
  default: (await import("./pages/PlotlyPage")).PlotlyPage,
}));
const AnalogPage = lazy(async () => ({
  default: (await import("./pages/AnalogPage")).AnalogPage,
}));

export default function App(): ReactElement {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__titles">
          <h1>Design Analytics</h1>
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
        <NavLink
          to="/analog"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Analog Circuits
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
            <Route path="/analog" element={<AnalogPage />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
