export function HomePage(): JSX.Element {
  return (
    <div>
      <div className="chart-card">
        <h2>Overview</h2>
        <p className="hint" style={{ marginBottom: "0.75rem" }}>
          A synthetic <strong>design-metrics</strong> dataset rendered with{" "}
          <strong>Plotly.js</strong> (<code>plotly.js-dist-min</code>): Cartesian charts plus
          analytics views (3D scatter, treemap). Built with{" "}
          <strong>Vite + React</strong> for GitHub Pages.
        </p>
        <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "var(--text-secondary)" }}>
          <li>
            <strong>HashRouter</strong> (<code>#/plotly</code>) works on GitHub Project Pages
            without server rewrite rules.
          </li>
          <li>
            <strong>Plotly</strong> mode bar: zoom, pan, autoscale, PNG export; pinch/drag on
            touch devices.
          </li>
          <li>
            Chart containers use <strong>min-height</strong> and <strong>viewport units</strong> so
            phones get usable plot area.
          </li>
        </ul>
      </div>
      <p className="note">
        <strong>Mobile:</strong> Plotly supports touch (pan/zoom). The full browser bundle is
        large on first load; the route is lazy-loaded so the home page stays light.
      </p>
    </div>
  );
}
