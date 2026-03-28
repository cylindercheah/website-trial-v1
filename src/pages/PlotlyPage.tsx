import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { Config, Data, Layout } from "plotly.js";
// Pre-minified browser build — avoids Vite bundling plotly's Node-only trace helpers.
import Plotly from "plotly.js-dist-min";
import { useNarrowScreen } from "../hooks/useNarrowScreen";
import {
  DESIGN_ROWS,
  DESIGN_ARCH_ORDER,
  DESIGN_BIT_WIDTHS,
  architectureColor,
  formatArchLabel,
  rowsByBitWidthOrdered,
} from "../data/sampleDesign";
import {
  DEFAULT_EXPLORE_AXES,
  DESIGN_CATEGORIES,
  SCATTER_AXIS_METRICS,
  scatterArchitectureTickAxis,
  scatterAxisHeatmapGrid,
  scatterAxisOptionLabel,
  scatterAxisRange,
  scatterAxisTitle,
  scatterAxisTreemapFlat,
  scatterAxisValue,
  scene3dAxisTickHideEnds,
  syncExploreAxes,
  type ExploreAxesState,
  type DesignCategoryId,
  type ExploreAxisKey,
  type ScatterAxisMetric,
} from "../data/scatterAxisMetrics";
import {
  CHART_LINE_WIDTH,
  CHART_MARKER_OUTLINE_RGB,
  getChartPalette,
  plotAxisFont,
  plotFont,
  plotlyAxisFrameX,
  plotlyAxisFrameY,
  plotlyBold,
  plotlyHeatmapColorscale,
  plotlyHoverLabel,
  plotlySceneAxis,
} from "../theme/chartPalette";
import { useTheme } from "../theme/ThemeContext";

function usePlotlyChart(
  data: Data[],
  layout: Partial<Layout>,
  config: Partial<Config>,
): RefObject<HTMLDivElement> {
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
  const [exploreAxes, setExploreAxes] = useState<ExploreAxesState>(DEFAULT_EXPLORE_AXES);

  const onExploreAxisChange = (key: ExploreAxisKey, m: ScatterAxisMetric) => {
    setExploreAxes((prev) => syncExploreAxes(prev, key, m));
  };

  const {
    paretoData,
    paretoLayout,
    paretoConfig,
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
  } = useMemo(() => {
      const ex = exploreAxes;
      const paretoXMetric = ex.x;
      const paretoYMetric = ex.y;
      const paretoZMetric = ex.z;
      const plotBitWidth = (DESIGN_BIT_WIDTHS as readonly number[]).includes(ex.bitWidth)
        ? ex.bitWidth
        : DESIGN_BIT_WIDTHS[0];
      const palette = getChartPalette(theme);
      const hoverLabel = plotlyHoverLabel(palette, narrow);
      const frameX = plotlyAxisFrameX(palette);
      const frameY = plotlyAxisFrameY(palette);
      const sceneAxX = plotlySceneAxis(palette, "grey");
      const sceneAxY = plotlySceneAxis(palette, "black");
      const sceneAxZ = plotlySceneAxis(palette, "grey");
      const axTitle = (label: string) => ({
        text: label,
        font: plotAxisFont(palette.rgbAxisTitle, narrow),
        standoff: narrow ? 10 : 14,
      });
      const axTick = plotAxisFont(palette.axisValueLabelRgb, narrow);
      const mSize = (bw: number): number =>
        (narrow ? 4 : 0) + 8 + (bw / 64) * 10;

      const byArch = new Map<string, typeof DESIGN_ROWS>();
      for (const row of DESIGN_ROWS) {
        const list = byArch.get(row.architecture) ?? [];
        list.push(row);
        byArch.set(row.architecture, list);
      }

      const paretoDataInner: Data[] = [];
      for (const arch of DESIGN_ARCH_ORDER) {
        const rows = byArch.get(arch);
        if (!rows?.length) continue;
        const label = formatArchLabel(arch);
        paretoDataInner.push({
          type: "scatter",
          mode: "markers",
          name: label,
          x: rows.map((r) => scatterAxisValue(paretoXMetric, r)),
          y: rows.map((r) => scatterAxisValue(paretoYMetric, r)),
          text: rows.map((r) => `${plotlyBold(`${r.bitWidth}b`)}<br>${r.areaUm2} µm²`),
          hovertemplate:
            `<b>${label}</b><br>%{text}<br><b>${scatterAxisTitle(paretoXMetric)}:</b> %{x}<br><b>${scatterAxisTitle(paretoYMetric)}:</b> %{y}<extra></extra>`,
          marker: {
            size: rows.map((r) => mSize(r.bitWidth)),
            color: architectureColor(arch),
            opacity: 1,
            line: { width: 1, color: CHART_MARKER_OUTLINE_RGB },
          },
        });
      }

      const paretoPlotBg =
        theme === "dark" ? "rgb(22, 28, 38)" : "rgb(255, 255, 255)";
      const paretoXRange = scatterAxisRange(paretoXMetric);
      const paretoYRange = scatterAxisRange(paretoYMetric);
      const paretoXArchTicks =
        paretoXMetric === "architecture" ? scatterArchitectureTickAxis() : {};
      const paretoYArchTicks =
        paretoYMetric === "architecture" ? scatterArchitectureTickAxis() : {};
      const paretoTitleNarrow = plotlyBold(
        `${scatterAxisTitle(paretoXMetric)} vs ${scatterAxisTitle(paretoYMetric)}`,
      );
      const paretoTitleWide = plotlyBold(
        `Pareto-style: ${scatterAxisTitle(paretoXMetric)} vs ${scatterAxisTitle(paretoYMetric)}`,
      );

      const paretoLayoutInner: Partial<Layout> = narrow
        ? {
            autosize: true,
            margin: { l: 42, r: 14, t: 20, b: 56 },
            paper_bgcolor: "transparent",
            plot_bgcolor: paretoPlotBg,
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: paretoTitleNarrow,
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: false,
            xaxis: {
              ...frameX,
              layer: "below traces",
              automargin: true,
              gridcolor: palette.axisGridGreyRgb,
              title: axTitle(scatterAxisTitle(paretoXMetric)),
              tickfont: axTick,
              ...paretoXArchTicks,
              ...(paretoXRange ? { range: paretoXRange } : {}),
            },
            yaxis: {
              ...frameY,
              layer: "below traces",
              automargin: true,
              gridcolor: palette.axisGridBlackRgb,
              title: axTitle(scatterAxisTitle(paretoYMetric)),
              tickfont: axTick,
              ...paretoYArchTicks,
              ...(paretoYRange ? { range: paretoYRange } : {}),
            },
            hovermode: "closest",
            hoverlabel: hoverLabel,
          }
        : {
            autosize: true,
            margin: { l: 48, r: 24, t: 32, b: 56 },
            paper_bgcolor: "transparent",
            plot_bgcolor: paretoPlotBg,
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: paretoTitleWide,
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: false,
            xaxis: {
              ...frameX,
              layer: "below traces",
              automargin: true,
              gridcolor: palette.axisGridGreyRgb,
              title: axTitle(scatterAxisTitle(paretoXMetric)),
              tickfont: axTick,
              ...paretoXArchTicks,
              ...(paretoXRange ? { range: paretoXRange } : {}),
            },
            yaxis: {
              ...frameY,
              layer: "below traces",
              automargin: true,
              gridcolor: palette.axisGridBlackRgb,
              title: axTitle(scatterAxisTitle(paretoYMetric)),
              tickfont: axTick,
              ...paretoYArchTicks,
              ...(paretoYRange ? { range: paretoYRange } : {}),
            },
            hovermode: "closest",
            hoverlabel: hoverLabel,
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

      const rowsAtBw = rowsByBitWidthOrdered(plotBitWidth);
      const barDataInner: Data[] = [
        {
          type: "bar",
          name: `Metric @ ${plotBitWidth}b`,
          x: rowsAtBw.map((r) => formatArchLabel(r.architecture)),
          y: rowsAtBw.map((r) => scatterAxisValue(paretoYMetric, r)),
          text: rowsAtBw.map((r) => String(scatterAxisValue(paretoYMetric, r))),
          textposition: "auto",
          marker: {
            color: rowsAtBw.map((r) => architectureColor(r.architecture)),
            line: { width: CHART_LINE_WIDTH, color: CHART_MARKER_OUTLINE_RGB },
          },
          hovertemplate:
            `<b>%{x}</b><br><b>${scatterAxisTitle(paretoYMetric)}:</b> %{y:.3g}<extra></extra>`,
        },
      ];

      const barLayoutInner: Partial<Layout> = narrow
        ? {
            autosize: true,
            margin: { l: 46, r: 14, t: 20, b: 88 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(`${scatterAxisTitle(paretoYMetric)} @ ${plotBitWidth}b (bar)`),
              font: plotFont(palette.rgbAxisTitle),
            },
            xaxis: {
              ...frameX,
              automargin: true,
              gridcolor: palette.axisGridGreyRgb,
              title: axTitle("Architecture"),
              tickangle: -28,
              tickfont: axTick,
            },
            yaxis: {
              ...frameY,
              automargin: true,
              gridcolor: palette.axisGridBlackRgb,
              title: axTitle(scatterAxisTitle(paretoYMetric)),
              tickfont: axTick,
            },
            hovermode: "x unified",
            hoverlabel: hoverLabel,
          }
        : {
            autosize: true,
            margin: { l: 52, r: 24, t: 32, b: 72 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(
                `${scatterAxisTitle(paretoYMetric)} at ${plotBitWidth}-bit width (by architecture)`,
              ),
              font: plotFont(palette.rgbAxisTitle),
            },
            xaxis: {
              ...frameX,
              automargin: true,
              gridcolor: palette.axisGridGreyRgb,
              title: axTitle("Architecture"),
              tickangle: -18,
              tickfont: axTick,
            },
            yaxis: {
              ...frameY,
              automargin: true,
              gridcolor: palette.axisGridBlackRgb,
              title: axTitle(scatterAxisTitle(paretoYMetric)),
              tickfont: axTick,
            },
            hovermode: "x unified",
            bargap: 0.28,
            hoverlabel: hoverLabel,
          };

      const { z: heatZ, colLabels, rowLabels } = scatterAxisHeatmapGrid(paretoZMetric);
      const heatmapDataInner: Data[] = [
        {
          type: "heatmap",
          x: colLabels,
          y: rowLabels,
          z: heatZ,
          colorscale: plotlyHeatmapColorscale(palette, theme),
          hovertemplate:
            `<b>Bit width %{x}</b><br><b>%{y}</b><br><b>${scatterAxisTitle(paretoZMetric)}:</b> %{z}<extra></extra>`,
          colorbar: {
            title: axTitle(scatterAxisTitle(paretoZMetric)),
            tickfont: axTick,
          },
        },
      ];

      const heatmapLayoutInner: Partial<Layout> = narrow
        ? {
            autosize: true,
            margin: { l: 72, r: 18, t: 20, b: 56 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(`${scatterAxisTitle(paretoZMetric)} heatmap`),
              font: plotFont(palette.rgbAxisTitle),
            },
            xaxis: {
              ...frameX,
              automargin: true,
              gridcolor: palette.axisGridGreyRgb,
              title: axTitle("Bit width"),
              tickfont: axTick,
            },
            yaxis: {
              ...frameY,
              automargin: true,
              gridcolor: palette.axisGridBlackRgb,
              title: axTitle("Architecture"),
              tickfont: axTick,
            },
            hoverlabel: hoverLabel,
          }
        : {
            autosize: true,
            margin: { l: 120, r: 100, t: 32, b: 56 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(
                `${scatterAxisTitle(paretoZMetric)} — architecture × bit width`,
              ),
              font: plotFont(palette.rgbAxisTitle),
            },
            xaxis: {
              ...frameX,
              automargin: true,
              gridcolor: palette.axisGridGreyRgb,
              title: axTitle("Bit width"),
              tickfont: axTick,
            },
            yaxis: {
              ...frameY,
              automargin: true,
              gridcolor: palette.axisGridBlackRgb,
              title: axTitle("Architecture"),
              tickfont: axTick,
            },
            hoverlabel: hoverLabel,
          };

      const pieDataInner: Data[] = [
        {
          type: "pie",
          labels: rowsAtBw.map((r) => formatArchLabel(r.architecture)),
          values: rowsAtBw.map((r) => scatterAxisValue(paretoYMetric, r)),
          marker: {
            colors: rowsAtBw.map((r) => architectureColor(r.architecture)),
            line: { color: CHART_MARKER_OUTLINE_RGB, width: CHART_LINE_WIDTH },
          },
          hole: 0.38,
          textinfo: "label+percent",
          textfont: plotAxisFont("#ffffff", narrow),
          hovertemplate:
            "<b>%{label}</b><br><b>Value:</b> %{value:.3g}<br><b>Share:</b> %{percent}<extra></extra>",
        },
      ];

      const pieLayoutInner: Partial<Layout> = narrow
        ? {
            autosize: true,
            margin: { l: 12, r: 12, t: 20, b: 12 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(`${scatterAxisTitle(paretoYMetric)} share @ ${plotBitWidth}b`),
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: false,
            hoverlabel: hoverLabel,
          }
        : {
            autosize: true,
            margin: { l: 16, r: 16, t: 36, b: 16 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(
                `${scatterAxisTitle(paretoYMetric)} share at ${plotBitWidth}-bit width (donut)`,
              ),
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: false,
            hoverlabel: hoverLabel,
          };

      const sceneAxisFor = (base: typeof sceneAxX, metric: ScatterAxisMetric) => ({
        ...base,
        title: axTitle(scatterAxisTitle(metric)),
        tickfont: axTick,
        ...scene3dAxisTickHideEnds(metric, DESIGN_ROWS),
      });

      const scatter3dDataInner: Data[] = [];
      for (const arch of DESIGN_ARCH_ORDER) {
        const rows = byArch.get(arch);
        if (!rows?.length) continue;
        scatter3dDataInner.push({
          type: "scatter3d",
          mode: "markers",
          name: formatArchLabel(arch),
          x: rows.map((r) => scatterAxisValue(paretoXMetric, r)),
          y: rows.map((r) => scatterAxisValue(paretoYMetric, r)),
          z: rows.map((r) => scatterAxisValue(paretoZMetric, r)),
          text: rows.map(
            (r) => `${formatArchLabel(arch)} ${r.bitWidth}b`,
          ),
          hovertemplate:
            "<b>%{text}</b><br>" +
            `<b>${scatterAxisTitle(paretoXMetric)}:</b> %{x}<br>` +
            `<b>${scatterAxisTitle(paretoYMetric)}:</b> %{y}<br>` +
            `<b>${scatterAxisTitle(paretoZMetric)}:</b> %{z}<extra></extra>`,
          marker: {
            size: rows.map((r) => mSize(r.bitWidth)),
            color: architectureColor(arch),
            opacity: 1,
            line: { width: 1, color: CHART_MARKER_OUTLINE_RGB },
          },
        });
      }

      const scatter3dLayoutInner: Partial<Layout> = narrow
        ? {
            autosize: true,
            margin: { l: 0, r: 0, t: 22, b: 0 },
            paper_bgcolor: "transparent",
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(
                `3D: ${scatterAxisTitle(paretoXMetric)} × ${scatterAxisTitle(paretoYMetric)} × ${scatterAxisTitle(paretoZMetric)}`,
              ),
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: false,
            scene: {
              bgcolor: "rgba(0,0,0,0)",
              xaxis: sceneAxisFor(sceneAxX, paretoXMetric),
              yaxis: sceneAxisFor(sceneAxY, paretoYMetric),
              zaxis: sceneAxisFor(sceneAxZ, paretoZMetric),
            },
            hoverlabel: hoverLabel,
          }
        : {
            autosize: true,
            margin: { l: 0, r: 0, t: 34, b: 0 },
            paper_bgcolor: "transparent",
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(
                `3D scatter: ${scatterAxisTitle(paretoXMetric)} × ${scatterAxisTitle(paretoYMetric)} × ${scatterAxisTitle(paretoZMetric)}`,
              ),
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: false,
            scene: {
              bgcolor: "rgba(0,0,0,0)",
              xaxis: sceneAxisFor(sceneAxX, paretoXMetric),
              yaxis: sceneAxisFor(sceneAxY, paretoYMetric),
              zaxis: sceneAxisFor(sceneAxZ, paretoZMetric),
            },
            hoverlabel: hoverLabel,
          };

      const { labels: tmLabels, parents: tmParents, values: tmValues } =
        scatterAxisTreemapFlat(paretoYMetric);
      const treemapColors = [
        palette.axisBorderRgb,
        ...DESIGN_ROWS.map((r) => architectureColor(r.architecture)),
      ];
      const treemapDataInner: Data[] = [
        {
          type: "treemap",
          labels: tmLabels,
          parents: tmParents,
          values: tmValues,
          textfont: plotAxisFont("#ffffff", narrow),
          marker: { colors: treemapColors },
          hovertemplate:
            `<b>%{label}</b><br><b>${scatterAxisTitle(paretoYMetric)}:</b> %{value}<extra></extra>`,
        },
      ];

      const treemapLayoutInner: Partial<Layout> = {
        autosize: true,
        margin: { l: 4, r: 4, t: narrow ? 22 : 34, b: 4 },
        paper_bgcolor: "transparent",
        font: plotFont(palette.rgbAxisTitle),
        title: {
          text: plotlyBold(
            narrow
              ? `${scatterAxisTitle(paretoYMetric)} treemap`
              : `${scatterAxisTitle(paretoYMetric)} — hierarchy`,
          ),
          font: plotFont(palette.rgbAxisTitle),
        },
        showlegend: false,
        hoverlabel: hoverLabel,
      };

      return {
        paretoData: paretoDataInner,
        paretoLayout: paretoLayoutInner,
        paretoConfig: commonConfig,
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
      };
    }, [narrow, theme, exploreAxes]);

  const paretoRef = usePlotlyChart(paretoData, paretoLayout, paretoConfig);
  const scatter3dRef = usePlotlyChart(scatter3dData, scatter3dLayout, scatter3dConfig);
  const heatmapRef = usePlotlyChart(heatmapData, heatmapLayout, heatmapConfig);
  const treemapRef = usePlotlyChart(treemapData, treemapLayout, treemapConfig);
  const pieRef = usePlotlyChart(pieData, pieLayout, pieConfig);
  const barRef = usePlotlyChart(barData, barLayout, barConfig);

  return (
    <div>
      <div className="chart-card">
        <h2>Explore metrics</h2>
        <p className="hint">
          <strong>Category</strong> selects the dataset family (more coming later).{" "}
          <strong>X</strong> / <strong>Y</strong> / <strong>Z</strong> are distinct quantities: scatter and 3D use all
          three; bar and donut use <strong>Y</strong> at the chosen <strong>bit width</strong>; treemap uses{" "}
          <strong>Y</strong> across all designs; heatmap grids architecture × bit width with <strong>Z</strong> as color.
        </p>
        <div className="axis-pickers">
          <label className="axis-picker">
            Category
            <select
              value={exploreAxes.category}
              aria-label="Dataset category"
              onChange={(e) =>
                setExploreAxes((p) => ({ ...p, category: e.target.value as DesignCategoryId }))
              }
            >
              {DESIGN_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="axis-picker">
            Y (bar, donut, treemap value)
            <select
              value={exploreAxes.y}
              aria-label="Explore metric Y"
              onChange={(e) => onExploreAxisChange("y", e.target.value as ScatterAxisMetric)}
            >
              {SCATTER_AXIS_METRICS.map((m) => (
                <option key={m} value={m}>
                  {scatterAxisOptionLabel(m)}
                </option>
              ))}
            </select>
          </label>
          <label className="axis-picker">
            X (horizontal / 3D depth)
            <select
              value={exploreAxes.x}
              aria-label="Explore metric X"
              onChange={(e) => onExploreAxisChange("x", e.target.value as ScatterAxisMetric)}
            >
              {SCATTER_AXIS_METRICS.map((m) => (
                <option key={m} value={m}>
                  {scatterAxisOptionLabel(m)}
                </option>
              ))}
            </select>
          </label>
          <label className="axis-picker">
            Z (heatmap color / 3D vertical)
            <select
              value={exploreAxes.z}
              aria-label="Explore metric Z"
              onChange={(e) => onExploreAxisChange("z", e.target.value as ScatterAxisMetric)}
            >
              {SCATTER_AXIS_METRICS.map((m) => (
                <option key={m} value={m}>
                  {scatterAxisOptionLabel(m)}
                </option>
              ))}
            </select>
          </label>
          <label className="axis-picker">
            Bit width (bar &amp; donut)
            <select
              value={exploreAxes.bitWidth}
              aria-label="Bit width for bar and donut charts"
              onChange={(e) => {
                const v = Number(e.target.value);
                setExploreAxes((p) =>
                  (DESIGN_BIT_WIDTHS as readonly number[]).includes(v) ? { ...p, bitWidth: v } : p,
                );
              }}
            >
              {DESIGN_BIT_WIDTHS.map((bw) => (
                <option key={bw} value={bw}>
                  {bw}b
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="chart-card">
        <h2>Pareto scatter</h2>
        <p className="hint">
          Pinch/drag or mode-bar zoom; larger markers = wider bit width (bubble-style). Uses{" "}
          <strong>X</strong> × <strong>Y</strong> from above — hover points for details.{" "}
        </p>
        <div className="plot-host">
          <div ref={paretoRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>3D scatter</h2>
        <p className="hint">
          WebGL cloud using <strong>X</strong> × <strong>Y</strong> × <strong>Z</strong> from above. Drag to rotate; mode bar
          for PNG / reset camera.
        </p>
        <div className="plot-host plot-host--tall">
          <div ref={scatter3dRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>Heatmap</h2>
        <p className="hint">
          Cell color = <strong>Z</strong> metric across architecture × bit width (same grid).
        </p>
        <div className="plot-host">
          <div ref={heatmapRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>Treemap</h2>
        <p className="hint">
          Tile size from <strong>Y</strong> metric — root → each architecture×width leaf.
        </p>
        <div className="plot-host plot-host--short">
          <div ref={treemapRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>Donut (pie)</h2>
        <p className="hint">
          Relative <strong>Y</strong> at the selected <strong>bit width</strong> (same slice as the bar chart).
        </p>
        <div className="plot-host plot-host--short">
          <div ref={pieRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>Grouped bar</h2>
        <p className="hint">
          Rows at the selected <strong>bit width</strong>: <strong>Y</strong> metric by architecture. Mode bar: zoom,
          pan, autoscale, PNG.
        </p>
        <div className="plot-host">
          <div ref={barRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
    </div>
  );
}
