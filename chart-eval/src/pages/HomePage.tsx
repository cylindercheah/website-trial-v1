export function HomePage(): JSX.Element {
  return (
    <div>
      <div className="chart-card">
        <h2>Why this demo</h2>
        <p className="hint" style={{ marginBottom: "0.75rem" }}>
          Compare <strong>Plotly.js</strong> (full bundle) and <strong>ECharts</strong> on
          the same synthetic PPA set: classic Cartesian charts plus analytics-style views
          (3D scatter, treemap, sankey, parcoords on Plotly; sunburst, treemap, radar,
          funnel, boxplot on ECharts). Built with <strong>Vite + React</strong> for
          GitHub Pages.
        </p>
        <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "var(--text-secondary)" }}>
          <li>
            <strong>HashRouter</strong> (<code>#/plotly</code>) works on GitHub Project
            Pages without server rewrite rules.
          </li>
          <li>
            <strong>Plotly</strong>: mode bar (zoom, pan, autoscale, PNG) + x-axis{" "}
            <strong>rangeslider</strong> on wide layouts for scatter/line.{" "}
            <strong>ECharts</strong>: <code>toolbox</code> (rect zoom, reset, PNG),{" "}
            <code>dataZoom</code>, <code>visualMap</code> on heatmap, <code>magicType</code>{" "}
            on bar.
          </li>
          <li>
            Chart containers use <strong>min-height</strong> and{" "}
            <strong>viewport units</strong> so phones get usable plot area.
          </li>
        </ul>
      </div>
      <p className="note">
        <strong>Mobile:</strong> Both libraries support touch (pan/zoom). ECharts tends
        to feel snappier on low-end phones if you enable{" "}
        <code>dataZoom</code> sliders; the full <code>plotly.js</code> bundle is larger
        (slower first load) than <code>echarts</code>.
        Try both routes on a real device.
      </p>
    </div>
  );
}
