import { useEffect, useMemo, useRef, type RefObject } from "react";
import type { Data, Layout, Config } from "plotly.js";
import Plotly from "plotly.js";
import { useNarrowScreen } from "../hooks/useNarrowScreen";
import {
  ADDER_DEMO_ROWS,
  architectureColor,
  DEMO_ARCH_ORDER,
  fmaxMhzHeatmapGrid,
  formatArchLabel,
  plotlySankeyPowerByBitwidth,
  ppaTreemapFlat,
  rowsByBitWidthOrdered,
} from "../data/samplePpa";
import { getChartPalette } from "../theme/chartPalette";
import { useTheme } from "../theme/ThemeContext";

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
  const narrow = useNarrowScreen(640);
  const { theme } = useTheme();

  const {
    paretoData,
    paretoLayout,
    paretoConfig,
    lineData,
    lineLayout,
    lineConfig,
    barData,
    barLayout,
    barConfig,
    heatmapData,
    heatmapLayout,
    heatmapConfig,
    pieData,
    pieLayout,
    pieConfig,
    scatter3dData,
    scatter3dLayout,
    scatter3dConfig,
    treemapData,
    treemapLayout,
    treemapConfig,
    parcoordsData,
    parcoordsLayout,
    parcoordsConfig,
    sankeyData,
    sankeyLayout,
    sankeyConfig,
  } = useMemo(() => {
      const palette = getChartPalette(theme);
      const mSize = (bw: number): number =>
        (narrow ? 4 : 0) + 8 + (bw / 64) * 10;

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
            size: rows.map((r) => mSize(r.bitWidth)),
            color: architectureColor(arch),
            line: { width: 1, color: palette.markerOutline },
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
          line: { color: palette.accentOrange, width: 2, dash: "dot" },
        },
      ];

      const paretoLayoutInner: Partial<Layout> = narrow
        ? {
            autosize: true,
            margin: { l: 42, r: 14, t: 20, b: 92 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { color: palette.text, size: 10 },
            title: {
              text: "Fmax vs power (demo)",
              font: { size: 12, color: palette.text },
            },
            xaxis: {
              title: { text: "Fmax (MHz)", font: { size: 10 } },
              tickfont: { size: 9, color: palette.textMuted },
              gridcolor: palette.grid,
              ...(narrow ? {} : { rangeslider: { visible: true, bordercolor: palette.gridStrong } }),
            },
            yaxis: {
              title: { text: "Power (mW)", font: { size: 10 } },
              tickfont: { size: 9, color: palette.textMuted },
              gridcolor: palette.grid,
            },
            legend: {
              orientation: "h",
              yanchor: "top",
              y: -0.15,
              x: 0.5,
              xanchor: "center",
              font: { size: 9, color: palette.textMuted },
            },
            hovermode: "closest",
          }
        : {
            autosize: true,
            margin: { l: 48, r: 24, t: 32, b: 48 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { color: palette.text, size: 11 },
            title: {
              text: "Pareto-style: Fmax vs power (demo data)",
              font: { size: 14, color: palette.text },
            },
            xaxis: {
              title: "Fmax (MHz)",
              gridcolor: palette.grid,
              tickfont: { color: palette.textMuted },
              rangeslider: { visible: true, bordercolor: palette.gridStrong },
            },
            yaxis: {
              title: "Power (mW)",
              gridcolor: palette.grid,
              tickfont: { color: palette.textMuted },
            },
            legend: {
              orientation: "h",
              yanchor: "bottom",
              y: -0.28,
              x: 0.5,
              xanchor: "center",
              font: { color: palette.textMuted, size: 11 },
            },
            hovermode: "closest",
          };

      const lineLayoutInner: Partial<Layout> = narrow
        ? {
            autosize: true,
            margin: { l: 46, r: 40, t: 20, b: 96 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { color: palette.text, size: 10 },
            title: {
              text: "Kogge-Stone scaling",
              font: { size: 12, color: palette.text },
            },
            xaxis: {
              title: { text: "Bit width", font: { size: 10 } },
              tickfont: { size: 9, color: palette.textMuted },
              gridcolor: palette.grid,
              dtick: 32,
              ...(narrow ? {} : { rangeslider: { visible: true, bordercolor: palette.gridStrong } }),
            },
            yaxis: {
              title: { text: "Fmax (MHz)", font: { size: 10 } },
              tickfont: { size: 9, color: palette.textMuted },
              gridcolor: palette.grid,
              side: "left",
            },
            yaxis2: {
              title: { text: "Area (µm²)", font: { size: 10 } },
              tickfont: { size: 9, color: palette.textMuted },
              overlaying: "y",
              side: "right",
              gridcolor: "transparent",
              showgrid: false,
            },
            legend: {
              orientation: "h",
              yanchor: "top",
              y: -0.2,
              x: 0.5,
              xanchor: "center",
              font: { size: 9, color: palette.textMuted },
            },
          }
        : {
            autosize: true,
            margin: { l: 52, r: 52, t: 32, b: 72 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { color: palette.text, size: 11 },
            title: {
              text: "Scaling: Kogge-Stone vs bit width",
              font: { size: 14, color: palette.text },
            },
            xaxis: {
              title: "Bit width",
              gridcolor: palette.grid,
              dtick: 32,
              tickfont: { color: palette.textMuted },
              rangeslider: { visible: true, bordercolor: palette.gridStrong },
            },
            yaxis: {
              title: "Fmax (MHz)",
              gridcolor: palette.grid,
              side: "left",
              tickfont: { color: palette.textMuted },
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
              font: { color: palette.textMuted, size: 11 },
            },
          };

      const commonConfig: Partial<Config> = {
        responsive: true,
        displayModeBar: true,
        scrollZoom: true,
        displaylogo: false,
        ...(narrow
          ? { modeBarButtonsToRemove: ["lasso2d", "select2d"] as const }
          : {}),
        toImageButtonOptions: { format: "png", filename: "plotly-chart" },
      };

      const rows64 = rowsByBitWidthOrdered(64);
      const barDataInner: Data[] = [
        {
          type: "bar",
          name: "Power @ 64b",
          x: rows64.map((r) => formatArchLabel(r.architecture)),
          y: rows64.map((r) => r.powerMw),
          text: rows64.map((r) => `${r.powerMw} mW`),
          textposition: "auto",
          marker: {
            color: rows64.map((r) => architectureColor(r.architecture)),
            line: { width: 1, color: palette.markerOutline },
          },
          hovertemplate:
            "%{x}<br>Power: %{y:.1f} mW<extra></extra>",
        },
      ];

      const barLayoutInner: Partial<Layout> = narrow
        ? {
            autosize: true,
            margin: { l: 46, r: 14, t: 20, b: 88 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { color: palette.text, size: 10 },
            title: {
              text: "Power @ 64b (bar)",
              font: { size: 12, color: palette.text },
            },
            xaxis: {
              title: { text: "Architecture", font: { size: 10 } },
              tickangle: -28,
              tickfont: { size: 9, color: palette.textMuted },
              gridcolor: palette.grid,
            },
            yaxis: {
              title: { text: "Power (mW)", font: { size: 10 } },
              tickfont: { size: 9, color: palette.textMuted },
              gridcolor: palette.grid,
            },
            hovermode: "x unified",
          }
        : {
            autosize: true,
            margin: { l: 52, r: 24, t: 32, b: 72 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { color: palette.text, size: 11 },
            title: {
              text: "Power at 64-bit width (by architecture)",
              font: { size: 14, color: palette.text },
            },
            xaxis: {
              title: "Architecture",
              tickangle: -18,
              gridcolor: palette.grid,
              tickfont: { color: palette.textMuted },
            },
            yaxis: {
              title: "Power (mW)",
              gridcolor: palette.grid,
              tickfont: { color: palette.textMuted },
            },
            hovermode: "x unified",
            bargap: 0.28,
          };

      const { z: heatZ, colLabels, rowLabels } = fmaxMhzHeatmapGrid();
      const heatmapDataInner: Data[] = [
        {
          type: "heatmap",
          x: colLabels,
          y: rowLabels,
          z: heatZ,
          colorscale: "Viridis",
          hovertemplate:
            "Bit width %{x}<br>%{y}<br>Fmax: %{z} MHz<extra></extra>",
          colorbar: {
            title: { text: "MHz", font: { color: palette.textMuted, size: 11 } },
            tickfont: { color: palette.textMuted, size: 10 },
          },
        },
      ];

      const heatmapLayoutInner: Partial<Layout> = narrow
        ? {
            autosize: true,
            margin: { l: 72, r: 18, t: 20, b: 56 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { color: palette.text, size: 10 },
            title: {
              text: "Fmax heatmap",
              font: { size: 12, color: palette.text },
            },
            xaxis: {
              title: { text: "Bit width", font: { size: 10 } },
              tickfont: { size: 9, color: palette.textMuted },
              gridcolor: palette.grid,
            },
            yaxis: {
              title: { text: "Architecture", font: { size: 10 } },
              tickfont: { size: 9, color: palette.textMuted },
              gridcolor: palette.grid,
            },
          }
        : {
            autosize: true,
            margin: { l: 120, r: 100, t: 32, b: 56 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { color: palette.text, size: 11 },
            title: {
              text: "Fmax (MHz) — architecture × bit width",
              font: { size: 14, color: palette.text },
            },
            xaxis: {
              title: "Bit width",
              tickfont: { color: palette.textMuted },
              gridcolor: palette.grid,
            },
            yaxis: {
              title: "Architecture",
              tickfont: { color: palette.textMuted },
              gridcolor: palette.grid,
            },
          };

      const pieDataInner: Data[] = [
        {
          type: "pie",
          labels: rows64.map((r) => formatArchLabel(r.architecture)),
          values: rows64.map((r) => r.powerMw),
          marker: {
            colors: rows64.map((r) => architectureColor(r.architecture)),
            line: { color: palette.markerOutline, width: 1 },
          },
          hole: 0.38,
          textinfo: "label+percent",
          textfont: { color: palette.text, size: narrow ? 10 : 11 },
          hovertemplate: "%{label}<br>%{value:.1f} mW<br>%{percent}<extra></extra>",
        },
      ];

      const pieLayoutInner: Partial<Layout> = narrow
        ? {
            autosize: true,
            margin: { l: 12, r: 12, t: 20, b: 12 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { color: palette.text, size: 10 },
            title: {
              text: "Power share @ 64b",
              font: { size: 12, color: palette.text },
            },
            showlegend: false,
          }
        : {
            autosize: true,
            margin: { l: 16, r: 16, t: 36, b: 16 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { color: palette.text, size: 11 },
            title: {
              text: "Power share at 64-bit width (donut)",
              font: { size: 14, color: palette.text },
            },
            showlegend: true,
            legend: {
              orientation: "v",
              x: 1.02,
              y: 0.5,
              font: { color: palette.textMuted, size: 11 },
            },
          };

      const scatter3dDataInner: Data[] = [];
      for (const [arch, rows] of byArch) {
        scatter3dDataInner.push({
          type: "scatter3d",
          mode: "markers",
          name: arch,
          x: rows.map((r) => r.fmaxMhz),
          y: rows.map((r) => r.powerMw),
          z: rows.map((r) => r.areaUm2),
          text: rows.map(
            (r) => `${formatArchLabel(arch)} ${r.bitWidth}b`,
          ),
          hovertemplate:
            "%{text}<br>Fmax: %{x} MHz<br>Power: %{y} mW<br>Area: %{z} µm²<extra></extra>",
          marker: {
            size: rows.map((r) => mSize(r.bitWidth)),
            color: architectureColor(arch),
            line: { width: 1, color: palette.markerOutline },
          },
        });
      }

      const scatter3dLayoutInner: Partial<Layout> = narrow
        ? {
            autosize: true,
            margin: { l: 0, r: 0, t: 22, b: 0 },
            paper_bgcolor: "transparent",
            font: { color: palette.text, size: 10 },
            title: {
              text: "3D PPA cloud",
              font: { size: 12, color: palette.text },
            },
            scene: {
              bgcolor: "rgba(0,0,0,0)",
              xaxis: {
                title: { text: "Fmax (MHz)", font: { size: 10 } },
                gridcolor: palette.grid,
                tickfont: { size: 9, color: palette.textMuted },
              },
              yaxis: {
                title: { text: "Power (mW)", font: { size: 10 } },
                gridcolor: palette.grid,
                tickfont: { size: 9, color: palette.textMuted },
              },
              zaxis: {
                title: { text: "Area (µm²)", font: { size: 10 } },
                gridcolor: palette.grid,
                tickfont: { size: 9, color: palette.textMuted },
              },
            },
          }
        : {
            autosize: true,
            margin: { l: 0, r: 0, t: 34, b: 0 },
            paper_bgcolor: "transparent",
            font: { color: palette.text, size: 11 },
            title: {
              text: "3D scatter: Fmax × power × area",
              font: { size: 14, color: palette.text },
            },
            scene: {
              bgcolor: "rgba(0,0,0,0)",
              xaxis: {
                title: "Fmax (MHz)",
                gridcolor: palette.grid,
                tickfont: { color: palette.textMuted },
              },
              yaxis: {
                title: "Power (mW)",
                gridcolor: palette.grid,
                tickfont: { color: palette.textMuted },
              },
              zaxis: {
                title: "Area (µm²)",
                gridcolor: palette.grid,
                tickfont: { color: palette.textMuted },
              },
            },
          };

      const { labels: tmLabels, parents: tmParents, values: tmValues } =
        ppaTreemapFlat("areaUm2");
      const treemapColors = [
        palette.gridStrong,
        ...ADDER_DEMO_ROWS.map((r) => architectureColor(r.architecture)),
      ];
      const treemapDataInner: Data[] = [
        {
          type: "treemap",
          labels: tmLabels,
          parents: tmParents,
          values: tmValues,
          textfont: { color: palette.text, size: narrow ? 10 : 11 },
          marker: { colors: treemapColors },
          hovertemplate: "%{label}<br>Area: %{value} µm²<extra></extra>",
        },
      ];

      const treemapLayoutInner: Partial<Layout> = {
        autosize: true,
        margin: { l: 4, r: 4, t: narrow ? 22 : 34, b: 4 },
        paper_bgcolor: "transparent",
        font: { color: palette.text, size: narrow ? 10 : 11 },
        title: {
          text: narrow ? "Area treemap" : "Die area hierarchy (µm²)",
          font: { size: narrow ? 12 : 14, color: palette.text },
        },
      };

      const archIdx = (a: string): number =>
        Math.max(0, DEMO_ARCH_ORDER.indexOf(a));
      const pcColors = ADDER_DEMO_ROWS.map((r) => archIdx(r.architecture));
      const fmin = Math.min(...ADDER_DEMO_ROWS.map((r) => r.fmaxMhz));
      const fmaxN = Math.max(...ADDER_DEMO_ROWS.map((r) => r.fmaxMhz));
      const pmin = Math.min(...ADDER_DEMO_ROWS.map((r) => r.powerMw));
      const pmaxN = Math.max(...ADDER_DEMO_ROWS.map((r) => r.powerMw));
      const amin = Math.min(...ADDER_DEMO_ROWS.map((r) => r.areaUm2));
      const amaxN = Math.max(...ADDER_DEMO_ROWS.map((r) => r.areaUm2));

      const parcoordsDataInner: Data[] = [
        {
          type: "parcoords",
          line: {
            color: pcColors,
            colorscale: [
              [0, architectureColor(DEMO_ARCH_ORDER[0])],
              [0.33, architectureColor(DEMO_ARCH_ORDER[1])],
              [0.66, architectureColor(DEMO_ARCH_ORDER[2])],
              [1, architectureColor(DEMO_ARCH_ORDER[3])],
            ],
            cmin: 0,
            cmax: 3,
            showscale: false,
          },
          dimensions: [
            {
              label: "Bit width",
              values: ADDER_DEMO_ROWS.map((r) => r.bitWidth),
              range: [32, 64],
            },
            {
              label: "Fmax (MHz)",
              values: ADDER_DEMO_ROWS.map((r) => r.fmaxMhz),
              range: [fmin, fmaxN],
            },
            {
              label: "Power (mW)",
              values: ADDER_DEMO_ROWS.map((r) => r.powerMw),
              range: [pmin, pmaxN],
            },
            {
              label: "Area (µm²)",
              values: ADDER_DEMO_ROWS.map((r) => r.areaUm2),
              range: [amin, amaxN],
            },
          ],
        },
      ];

      const parcoordsLayoutInner: Partial<Layout> = {
        autosize: true,
        margin: { l: 24, r: 24, t: narrow ? 22 : 34, b: 16 },
        paper_bgcolor: "transparent",
        font: { color: palette.text, size: narrow ? 10 : 11 },
        title: {
          text: narrow ? "Parallel coords" : "Parallel coordinates (all designs)",
          font: { size: narrow ? 12 : 14, color: palette.text },
        },
      };

      const sk = plotlySankeyPowerByBitwidth();
      const sankeyNodeColors = [
        ...ADDER_DEMO_ROWS.map((r) => architectureColor(r.architecture)),
        "#5eb0ff",
        palette.accentOrange,
      ];
      const sankeyDataInner: Data[] = [
        {
          type: "sankey",
          arrangement: "snap",
          node: {
            label: sk.labels,
            pad: 10,
            thickness: 14,
            line: { color: palette.markerOutline, width: 0.5 },
            color: sankeyNodeColors,
          },
          link: {
            source: sk.source,
            target: sk.target,
            value: sk.value,
            color: ADDER_DEMO_ROWS.map(() => "rgba(94, 176, 255, 0.25)"),
          },
        },
      ];

      const sankeyLayoutInner: Partial<Layout> = {
        autosize: true,
        margin: { l: 8, r: 8, t: narrow ? 22 : 34, b: 8 },
        paper_bgcolor: "transparent",
        font: { color: palette.text, size: narrow ? 10 : 11 },
        title: {
          text: narrow ? "Sankey (power)" : "Power (mW) → bit-width pools",
          font: { size: narrow ? 12 : 14, color: palette.text },
        },
      };

      return {
        paretoData: paretoDataInner,
        paretoLayout: paretoLayoutInner,
        paretoConfig: commonConfig,
        lineData: lineDataInner,
        lineLayout: lineLayoutInner,
        lineConfig: commonConfig,
        barData: barDataInner,
        barLayout: barLayoutInner,
        barConfig: commonConfig,
        heatmapData: heatmapDataInner,
        heatmapLayout: heatmapLayoutInner,
        heatmapConfig: commonConfig,
        pieData: pieDataInner,
        pieLayout: pieLayoutInner,
        pieConfig: commonConfig,
        scatter3dData: scatter3dDataInner,
        scatter3dLayout: scatter3dLayoutInner,
        scatter3dConfig: commonConfig,
        treemapData: treemapDataInner,
        treemapLayout: treemapLayoutInner,
        treemapConfig: commonConfig,
        parcoordsData: parcoordsDataInner,
        parcoordsLayout: parcoordsLayoutInner,
        parcoordsConfig: commonConfig,
        sankeyData: sankeyDataInner,
        sankeyLayout: sankeyLayoutInner,
        sankeyConfig: commonConfig,
      };
    }, [narrow, theme]);

  const paretoRef = usePlotlyChart(paretoData, paretoLayout, paretoConfig);
  const lineRef = usePlotlyChart(lineData, lineLayout, lineConfig);
  const barRef = usePlotlyChart(barData, barLayout, barConfig);
  const heatmapRef = usePlotlyChart(heatmapData, heatmapLayout, heatmapConfig);
  const pieRef = usePlotlyChart(pieData, pieLayout, pieConfig);
  const scatter3dRef = usePlotlyChart(scatter3dData, scatter3dLayout, scatter3dConfig);
  const treemapRef = usePlotlyChart(treemapData, treemapLayout, treemapConfig);
  const parcoordsRef = usePlotlyChart(parcoordsData, parcoordsLayout, parcoordsConfig);
  const sankeyRef = usePlotlyChart(sankeyData, sankeyLayout, sankeyConfig);

  return (
    <div>
      <div className="chart-card">
        <h2>Pareto scatter</h2>
        <p className="hint">
          Pinch/zoom on mobile; wide layout adds an x-axis <strong>rangeslider</strong>.
          Larger markers = wider adder (bubble-style). Full <code>plotly.js</code> bundle.
        </p>
        <div className="plot-host">
          <div ref={paretoRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>Dual-axis line</h2>
        <p className="hint">
          Fmax (left) and area (right) vs bit width. Wide layout adds an x-axis{" "}
          <strong>rangeslider</strong> (like ECharts <code>dataZoom</code>).
        </p>
        <div className="plot-host">
          <div ref={lineRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>Grouped bar</h2>
        <p className="hint">
          Same 64-bit rows: power (mW) by architecture. Mode bar: zoom, pan, autoscale,
          PNG.
        </p>
        <div className="plot-host">
          <div ref={barRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>Heatmap</h2>
        <p className="hint">Fmax across architecture × bit width (same synthetic PPA grid).</p>
        <div className="plot-host">
          <div ref={heatmapRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>Donut (pie)</h2>
        <p className="hint">Relative power at 64b — complements the bar view.</p>
        <div className="plot-host plot-host--short">
          <div ref={pieRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>3D scatter</h2>
        <p className="hint">
          Fmax, power, and area in one view (WebGL). Drag to rotate; mode bar for PNG /
          reset camera.
        </p>
        <div className="plot-host plot-host--tall">
          <div ref={scatter3dRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>Treemap</h2>
        <p className="hint">Hierarchical die area (µm²) — root → each architecture×width.</p>
        <div className="plot-host plot-host--short">
          <div ref={treemapRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>Parallel coordinates</h2>
        <p className="hint">
          Brush along axes to filter the eight synthetic designs; color encodes architecture.
        </p>
        <div className="plot-host">
          <div ref={parcoordsRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>Sankey</h2>
        <p className="hint">
          Power (mW) flowing from each design into 32b vs 64b aggregate pools.
        </p>
        <div className="plot-host">
          <div ref={sankeyRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <p className="note">
        This page imports the <strong>full</strong> <code>plotly.js</code> entry (3D WebGL,
        sankey, parcoords, treemap, optional geo traces, etc.) — larger than{" "}
        <code>plotly.js-basic-dist</code> and a heavier dev-server cold start. For production,
        consider dynamic import of Plotly only on this route if you need a smaller landing
        bundle elsewhere.
      </p>
    </div>
  );
}
