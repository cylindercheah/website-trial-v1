import { useEffect, useMemo, useRef, type RefObject } from "react";
import type { Data, Layout, Config } from "plotly.js";
import Plotly from "plotly.js-basic-dist";
import { ADDER_DEMO_ROWS, architectureColor } from "../data/samplePpa";

function usePlotlyChart(
  data: Data[],
  layout: Partial<Layout>,
  config: Partial<Config>,
): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cancelled = false;
    const plot = Plotly.newPlot(el, data, layout, config);
    void plot.then(() => {
      if (cancelled) return;
      void Plotly.Plots.resize(el);
    });

    const ro = new ResizeObserver(() => {
      if (el && !cancelled) void Plotly.Plots.resize(el);
    });
    ro.observe(el);

    return () => {
      cancelled = true;
      ro.disconnect();
      void Plotly.purge(el);
    };
  }, [data, layout, config]);

  return ref;
}

export function PlotlyPage(): JSX.Element {
  const { paretoData, paretoLayout, paretoConfig, lineData, lineLayout, lineConfig } =
    useMemo(() => {
      const byArch = new Map<string, typeof ADDER_DEMO_ROWS>();
      for (const row of ADDER_DEMO_ROWS) {
        const list = byArch.get(row.architecture) ?? [];
        list.push(row);
        byArch.set(row.architecture, list);
      }

      const paretoDataInner: Data[] = [];
      for (const [arch, rows] of byArch) {
        paretoDataInner.push({
          type: "scatter",
          mode: "markers",
          name: arch,
          x: rows.map((r) => r.fmaxMhz),
          y: rows.map((r) => r.powerMw),
          text: rows.map(
            (r) => `${arch}<br>${r.bitWidth}b<br>${r.areaUm2} µm²`,
          ),
          hoverinfo: "text+x+y",
          marker: {
            size: rows.map((r) => 8 + (r.bitWidth / 64) * 10),
            color: architectureColor(arch),
            line: { width: 1, color: "#0f1419" },
          },
        });
      }

      const ks = ADDER_DEMO_ROWS.filter((r) => r.architecture === "kogge_stone").sort(
        (a, b) => a.bitWidth - b.bitWidth,
      );
      const lineDataInner: Data[] = [
        {
          type: "scatter",
          mode: "lines+markers",
          name: "Kogge-Stone Fmax",
          x: ks.map((r) => r.bitWidth),
          y: ks.map((r) => r.fmaxMhz),
          yaxis: "y",
          line: { color: architectureColor("kogge_stone"), width: 2 },
        },
        {
          type: "scatter",
          mode: "lines+markers",
          name: "Kogge-Stone area",
          x: ks.map((r) => r.bitWidth),
          y: ks.map((r) => r.areaUm2),
          yaxis: "y2",
          line: { color: "#ff9f4a", width: 2, dash: "dot" },
        },
      ];

      const paretoLayoutInner: Partial<Layout> = {
        autosize: true,
        margin: { l: 48, r: 24, t: 32, b: 48 },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: "#e7ecf3", size: 11 },
        title: { text: "Pareto-style: Fmax vs power (demo data)", font: { size: 14 } },
        xaxis: { title: "Fmax (MHz)", gridcolor: "#2d3a4d" },
        yaxis: { title: "Power (mW)", gridcolor: "#2d3a4d" },
        legend: {
          orientation: "h",
          yanchor: "bottom",
          y: -0.28,
          x: 0.5,
          xanchor: "center",
        },
        hovermode: "closest",
      };

      const lineLayoutInner: Partial<Layout> = {
        autosize: true,
        margin: { l: 52, r: 52, t: 32, b: 72 },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: "#e7ecf3", size: 11 },
        title: { text: "Scaling: Kogge-Stone vs bit width", font: { size: 14 } },
        xaxis: { title: "Bit width", gridcolor: "#2d3a4d", dtick: 32 },
        yaxis: {
          title: "Fmax (MHz)",
          gridcolor: "#2d3a4d",
          side: "left",
        },
        yaxis2: {
          title: "Area (µm²)",
          overlaying: "y",
          side: "right",
          gridcolor: "transparent",
          showgrid: false,
        },
        legend: {
          orientation: "h",
          yanchor: "bottom",
          y: -0.32,
          x: 0.5,
          xanchor: "center",
        },
      };

      const commonConfig: Partial<Config> = {
        responsive: true,
        displayModeBar: true,
        scrollZoom: true,
        toImageButtonOptions: { format: "png" },
      };

      return {
        paretoData: paretoDataInner,
        paretoLayout: paretoLayoutInner,
        paretoConfig: commonConfig,
        lineData: lineDataInner,
        lineLayout: lineLayoutInner,
        lineConfig: {
          responsive: true,
          displayModeBar: true,
          scrollZoom: true,
        },
      };
    }, []);

  const paretoRef = usePlotlyChart(paretoData, paretoLayout, paretoConfig);
  const lineRef = usePlotlyChart(lineData, lineLayout, lineConfig);

  return (
    <div>
      <div className="chart-card">
        <h2>Pareto scatter</h2>
        <p className="hint">
          Pinch/zoom on mobile. Larger markers = wider adder (bubble-style). Uses{" "}
          <code>plotly.js-basic-dist</code> (cartesian only — smaller than full Plotly).
        </p>
        <div className="plot-host">
          <div ref={paretoRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>Dual-axis line</h2>
        <p className="hint">Fmax (left) and area (right) vs bit width.</p>
        <div className="plot-host">
          <div ref={lineRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <p className="note">
        Plotly.js: rich interactions; this demo uses the <strong>basic</strong> bundle
        (no 3D/geo). For maps/3D you need the full <code>plotly.js</code> package — larger
        download and slower builds.
      </p>
    </div>
  );
}
