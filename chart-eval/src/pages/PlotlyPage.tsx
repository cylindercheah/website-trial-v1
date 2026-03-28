import { useEffect, useMemo, useRef, type RefObject } from "react";
import type { Config, Data, Layout } from "plotly.js";
// Pre-minified browser build — avoids Vite bundling plotly's Node-only trace helpers.
import Plotly from "plotly.js-dist-min";
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
import {
  CHART_LINE_WIDTH,
  getChartPalette,
  plotFont,
  plotlyAxisFrameX,
  plotlyAxisFrameY,
  plotlyBold,
  plotlySceneAxis,
  plotTickFont,
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
      const frameX = plotlyAxisFrameX(palette);
      const frameY = plotlyAxisFrameY(palette);
      const frameYDual = plotlyAxisFrameY(palette, { mirror: false });
      const sceneAxX = plotlySceneAxis(palette, "grey");
      const sceneAxY = plotlySceneAxis(palette, "black");
      const sceneAxZ = plotlySceneAxis(palette, "grey");
      const mSize = (bw: number): number =>
        (narrow ? 4 : 0) + 8 + (bw / 64) * 10;

      const byArch = new Map<string, typeof ADDER_DEMO_ROWS>();
      for (const row of ADDER_DEMO_ROWS) {
        const list = byArch.get(row.architecture) ?? [];
        list.push(row);
        byArch.set(row.architecture, list);
      }

      const paretoDataInner: Data[] = [];
      for (const arch of DEMO_ARCH_ORDER) {
        const rows = byArch.get(arch);
        if (!rows?.length) continue;
        const label = formatArchLabel(arch);
        paretoDataInner.push({
          type: "scatter",
          mode: "markers",
          name: label,
          x: rows.map((r) => r.fmaxMhz),
          y: rows.map((r) => r.powerMw),
          text: rows.map(
            (r) => `${label}<br>${r.bitWidth}b<br>${r.areaUm2} µm²`,
          ),
          hoverinfo: "x+y+text",
          marker: {
            size: rows.map((r) => mSize(r.bitWidth)),
            color: architectureColor(arch),
            opacity: 1,
            line: { width: 1, color: palette.axisBorderRgb },
          },
        });
      }

      const ks = ADDER_DEMO_ROWS.filter((r) => r.architecture === "kogge_stone").sort(
        (a, b) => a.bitWidth - b.bitWidth,
      );
      const lineDataInner: Data[] = [
        {
          type: "scatter",
          mode: "lines",
          name: "Fmax (MHz)",
          x: ks.map((r) => r.bitWidth),
          y: ks.map((r) => r.fmaxMhz),
          yaxis: "y",
          line: { color: architectureColor("kogge_stone"), width: CHART_LINE_WIDTH },
        },
        {
          type: "scatter",
          mode: "lines",
          name: "Area (µm²)",
          x: ks.map((r) => r.bitWidth),
          y: ks.map((r) => r.areaUm2),
          yaxis: "y2",
          line: { color: "rgb(139, 69, 19)", width: CHART_LINE_WIDTH, dash: "dot" },
        },
      ];

      const paretoPlotBg =
        theme === "dark" ? "rgb(22, 28, 38)" : "rgb(255, 255, 255)";

      const paretoLayoutInner: Partial<Layout> = narrow
        ? {
            autosize: true,
            margin: { l: 42, r: 14, t: 20, b: 56 },
            paper_bgcolor: "transparent",
            plot_bgcolor: paretoPlotBg,
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold("Fmax vs power (demo)"),
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: false,
            xaxis: {
              ...frameX,
              layer: "below traces",
              gridcolor: palette.axisGridGreyRgb,
              title: { text: plotlyBold("Fmax (MHz)"), font: plotFont(palette.rgbAxisTitle) },
              tickfont: plotTickFont(palette.axisValueLabelRgb),
            },
            yaxis: {
              ...frameY,
              layer: "below traces",
              gridcolor: palette.axisGridBlackRgb,
              title: { text: plotlyBold("Power (mW)"), font: plotFont(palette.rgbAxisTitle) },
              tickfont: plotTickFont(palette.axisValueLabelRgb),
            },
            hovermode: "closest",
          }
        : {
            autosize: true,
            margin: { l: 48, r: 24, t: 32, b: 56 },
            paper_bgcolor: "transparent",
            plot_bgcolor: paretoPlotBg,
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold("Pareto-style: Fmax vs power (demo data)"),
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: false,
            xaxis: {
              ...frameX,
              layer: "below traces",
              gridcolor: palette.axisGridGreyRgb,
              title: { text: plotlyBold("Fmax (MHz)"), font: plotFont(palette.rgbAxisTitle) },
              tickfont: plotTickFont(palette.axisValueLabelRgb),
            },
            yaxis: {
              ...frameY,
              layer: "below traces",
              gridcolor: palette.axisGridBlackRgb,
              title: { text: plotlyBold("Power (mW)"), font: plotFont(palette.rgbAxisTitle) },
              tickfont: plotTickFont(palette.axisValueLabelRgb),
            },
            hovermode: "closest",
          };

      const lineLayoutInner: Partial<Layout> = narrow
        ? {
            autosize: true,
            margin: { l: 46, r: 40, t: 20, b: 96 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold("Kogge-Stone scaling"),
              font: plotFont(palette.rgbAxisTitle),
            },
            xaxis: {
              ...frameX,
              gridcolor: palette.axisGridGreyRgb,
              title: { text: plotlyBold("Bit width"), font: plotFont(palette.rgbAxisTitle) },
              tickfont: plotTickFont(palette.axisValueLabelRgb),
              dtick: 32,
            },
            yaxis: {
              ...frameYDual,
              gridcolor: palette.axisGridBlackRgb,
              title: { text: plotlyBold("Fmax (MHz)"), font: plotFont(palette.rgbAxisTitle) },
              tickfont: plotTickFont(palette.axisValueLabelRgb),
              side: "left",
            },
            yaxis2: {
              ...frameYDual,
              gridcolor: "rgba(0,0,0,0)",
              showgrid: false,
              title: { text: plotlyBold("Area (µm²)"), font: plotFont(palette.rgbAxisTitle) },
              tickfont: plotTickFont(palette.axisValueLabelRgb),
              overlaying: "y",
              side: "right",
            },
            legend: {
              orientation: "h",
              yanchor: "top",
              y: -0.2,
              x: 0.5,
              xanchor: "center",
              font: plotTickFont(palette.rgbAxisTick),
              itemsizing: "constant",
            },
          }
        : {
            autosize: true,
            margin: { l: 52, r: 52, t: 32, b: 72 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold("Scaling: Kogge-Stone vs bit width"),
              font: plotFont(palette.rgbAxisTitle),
            },
            xaxis: {
              ...frameX,
              gridcolor: palette.axisGridGreyRgb,
              title: { text: plotlyBold("Bit width"), font: plotFont(palette.rgbAxisTitle) },
              dtick: 32,
              tickfont: plotTickFont(palette.axisValueLabelRgb),
            },
            yaxis: {
              ...frameYDual,
              gridcolor: palette.axisGridBlackRgb,
              title: { text: plotlyBold("Fmax (MHz)"), font: plotFont(palette.rgbAxisTitle) },
              side: "left",
              tickfont: plotTickFont(palette.axisValueLabelRgb),
            },
            yaxis2: {
              ...frameYDual,
              gridcolor: "rgba(0,0,0,0)",
              showgrid: false,
              title: { text: plotlyBold("Area (µm²)"), font: plotFont(palette.rgbAxisTitle) },
              tickfont: plotTickFont(palette.axisValueLabelRgb),
              overlaying: "y",
              side: "right",
            },
            legend: {
              orientation: "h",
              yanchor: "bottom",
              y: -0.32,
              x: 0.5,
              xanchor: "center",
              font: plotTickFont(palette.rgbAxisTick),
              itemsizing: "constant",
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
            line: { width: CHART_LINE_WIDTH, color: palette.markerOutline },
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
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold("Power @ 64b (bar)"),
              font: plotFont(palette.rgbAxisTitle),
            },
            xaxis: {
              ...frameX,
              gridcolor: palette.axisGridGreyRgb,
              title: { text: plotlyBold("Architecture"), font: plotFont(palette.rgbAxisTitle) },
              tickangle: -28,
              tickfont: plotTickFont(palette.axisValueLabelRgb),
            },
            yaxis: {
              ...frameY,
              gridcolor: palette.axisGridBlackRgb,
              title: { text: plotlyBold("Power (mW)"), font: plotFont(palette.rgbAxisTitle) },
              tickfont: plotTickFont(palette.axisValueLabelRgb),
            },
            hovermode: "x unified",
          }
        : {
            autosize: true,
            margin: { l: 52, r: 24, t: 32, b: 72 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold("Power at 64-bit width (by architecture)"),
              font: plotFont(palette.rgbAxisTitle),
            },
            xaxis: {
              ...frameX,
              gridcolor: palette.axisGridGreyRgb,
              title: { text: plotlyBold("Architecture"), font: plotFont(palette.rgbAxisTitle) },
              tickangle: -18,
              tickfont: plotTickFont(palette.axisValueLabelRgb),
            },
            yaxis: {
              ...frameY,
              gridcolor: palette.axisGridBlackRgb,
              title: { text: plotlyBold("Power (mW)"), font: plotFont(palette.rgbAxisTitle) },
              tickfont: plotTickFont(palette.axisValueLabelRgb),
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
            title: { text: plotlyBold("MHz"), font: plotFont(palette.rgbAxisTitle) },
            tickfont: plotTickFont(palette.axisValueLabelRgb),
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
              text: plotlyBold("Fmax heatmap"),
              font: plotFont(palette.rgbAxisTitle),
            },
            xaxis: {
              ...frameX,
              gridcolor: palette.axisGridGreyRgb,
              title: { text: plotlyBold("Bit width"), font: plotFont(palette.rgbAxisTitle) },
              tickfont: plotTickFont(palette.axisValueLabelRgb),
            },
            yaxis: {
              ...frameY,
              gridcolor: palette.axisGridBlackRgb,
              title: { text: plotlyBold("Architecture"), font: plotFont(palette.rgbAxisTitle) },
              tickfont: plotTickFont(palette.axisValueLabelRgb),
            },
          }
        : {
            autosize: true,
            margin: { l: 120, r: 100, t: 32, b: 56 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold("Fmax (MHz) — architecture × bit width"),
              font: plotFont(palette.rgbAxisTitle),
            },
            xaxis: {
              ...frameX,
              gridcolor: palette.axisGridGreyRgb,
              title: { text: plotlyBold("Bit width"), font: plotFont(palette.rgbAxisTitle) },
              tickfont: plotTickFont(palette.axisValueLabelRgb),
            },
            yaxis: {
              ...frameY,
              gridcolor: palette.axisGridBlackRgb,
              title: { text: plotlyBold("Architecture"), font: plotFont(palette.rgbAxisTitle) },
              tickfont: plotTickFont(palette.axisValueLabelRgb),
            },
          };

      const pieDataInner: Data[] = [
        {
          type: "pie",
          labels: rows64.map((r) => formatArchLabel(r.architecture)),
          values: rows64.map((r) => r.powerMw),
          marker: {
            colors: rows64.map((r) => architectureColor(r.architecture)),
            line: { color: palette.markerOutline, width: CHART_LINE_WIDTH },
          },
          hole: 0.38,
          textinfo: "label+percent",
          textfont: plotFont(palette.rgbAxisTitle),
          hovertemplate: "%{label}<br>%{value:.1f} mW<br>%{percent}<extra></extra>",
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
              text: plotlyBold("Power share @ 64b"),
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: false,
          }
        : {
            autosize: true,
            margin: { l: 16, r: 16, t: 36, b: 16 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold("Power share at 64-bit width (donut)"),
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: true,
            legend: {
              orientation: "v",
              x: 1.02,
              y: 0.5,
              font: plotTickFont(palette.rgbAxisTick),
            },
          };

      const scatter3dDataInner: Data[] = [];
      for (const arch of DEMO_ARCH_ORDER) {
        const rows = byArch.get(arch);
        if (!rows?.length) continue;
        scatter3dDataInner.push({
          type: "scatter3d",
          mode: "markers",
          name: formatArchLabel(arch),
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
            opacity: 1,
            line: { width: 1, color: palette.axisBorderRgb },
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
              text: plotlyBold("3D PPA cloud"),
              font: plotFont(palette.rgbAxisTitle),
            },
            legend: {
              itemsizing: "constant",
              font: plotTickFont(palette.rgbAxisTick),
            },
            scene: {
              bgcolor: "rgba(0,0,0,0)",
              xaxis: {
                ...sceneAxX,
                title: { text: plotlyBold("Fmax (MHz)"), font: plotFont(palette.rgbAxisTitle) },
                tickfont: plotTickFont(palette.axisValueLabelRgb),
              },
              yaxis: {
                ...sceneAxY,
                title: { text: plotlyBold("Power (mW)"), font: plotFont(palette.rgbAxisTitle) },
                tickfont: plotTickFont(palette.axisValueLabelRgb),
              },
              zaxis: {
                ...sceneAxZ,
                title: { text: plotlyBold("Area (µm²)"), font: plotFont(palette.rgbAxisTitle) },
                tickfont: plotTickFont(palette.axisValueLabelRgb),
              },
            },
          }
        : {
            autosize: true,
            margin: { l: 0, r: 0, t: 34, b: 0 },
            paper_bgcolor: "transparent",
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold("3D scatter: Fmax × power × area"),
              font: plotFont(palette.rgbAxisTitle),
            },
            legend: {
              itemsizing: "constant",
              font: plotTickFont(palette.rgbAxisTick),
            },
            scene: {
              bgcolor: "rgba(0,0,0,0)",
              xaxis: {
                ...sceneAxX,
                title: { text: plotlyBold("Fmax (MHz)"), font: plotFont(palette.rgbAxisTitle) },
                tickfont: plotTickFont(palette.axisValueLabelRgb),
              },
              yaxis: {
                ...sceneAxY,
                title: { text: plotlyBold("Power (mW)"), font: plotFont(palette.rgbAxisTitle) },
                tickfont: plotTickFont(palette.axisValueLabelRgb),
              },
              zaxis: {
                ...sceneAxZ,
                title: { text: plotlyBold("Area (µm²)"), font: plotFont(palette.rgbAxisTitle) },
                tickfont: plotTickFont(palette.axisValueLabelRgb),
              },
            },
          };

      const { labels: tmLabels, parents: tmParents, values: tmValues } =
        ppaTreemapFlat("areaUm2");
      const treemapColors = [
        palette.axisBorderRgb,
        ...ADDER_DEMO_ROWS.map((r) => architectureColor(r.architecture)),
      ];
      const treemapDataInner: Data[] = [
        {
          type: "treemap",
          labels: tmLabels,
          parents: tmParents,
          values: tmValues,
          textfont: plotFont(palette.rgbAxisTitle),
          marker: { colors: treemapColors },
          hovertemplate: "%{label}<br>Area: %{value} µm²<extra></extra>",
        },
      ];

      const treemapLayoutInner: Partial<Layout> = {
        autosize: true,
        margin: { l: 4, r: 4, t: narrow ? 22 : 34, b: 4 },
        paper_bgcolor: "transparent",
        font: plotFont(palette.rgbAxisTitle),
        title: {
          text: plotlyBold(narrow ? "Area treemap" : "Die area hierarchy (µm²)"),
          font: plotFont(palette.rgbAxisTitle),
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

      // Parcoords trace: @types/plotly.js `Data` union omits `dimensions` / parcoords line colorscale.
      const parcoordsDataInner = [
        {
          type: "parcoords" as const,
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
            width: CHART_LINE_WIDTH,
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
      ] as unknown as Data[];

      const parcoordsLayoutInner: Partial<Layout> = {
        autosize: true,
        margin: { l: 24, r: 24, t: narrow ? 22 : 34, b: 16 },
        paper_bgcolor: "transparent",
        font: plotFont(palette.rgbAxisTitle),
        title: {
          text: plotlyBold(
            narrow ? "Parallel coords" : "Parallel coordinates (all designs)",
          ),
          font: plotFont(palette.rgbAxisTitle),
        },
      };

      const sk = plotlySankeyPowerByBitwidth();
      const sankeyNodeColors = [
        ...ADDER_DEMO_ROWS.map((r) => architectureColor(r.architecture)),
        "rgb(0, 128, 0)",
        "rgb(139, 69, 19)",
      ];
      const sankeyDataInner: Data[] = [
        {
          type: "sankey",
          arrangement: "snap",
          node: {
            label: sk.labels,
            pad: 10,
            thickness: 14,
            line: { color: palette.markerOutline, width: CHART_LINE_WIDTH },
            color: sankeyNodeColors,
          },
          link: {
            source: sk.source,
            target: sk.target,
            value: sk.value,
            color: ADDER_DEMO_ROWS.map(() => "rgba(0, 0, 255, 0.25)"),
          },
        },
      ];

      const sankeyLayoutInner: Partial<Layout> = {
        autosize: true,
        margin: { l: 8, r: 8, t: narrow ? 22 : 34, b: 8 },
        paper_bgcolor: "transparent",
        font: plotFont(palette.rgbAxisTitle),
        title: {
          text: plotlyBold(
            narrow ? "Sankey (power)" : "Power (mW) → bit-width pools",
          ),
          font: plotFont(palette.rgbAxisTitle),
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
          Pinch/drag or mode-bar zoom; larger markers = wider adder (bubble-style). Legend is
          hidden to avoid overlapping the axis title — architecture color appears in the hover card.{" "}
          <code>plotly.js-dist-min</code> browser bundle.
        </p>
        <div className="plot-host">
          <div ref={paretoRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>Dual-axis line</h2>
        <p className="hint">
          Fmax (left) and area (right) vs bit width. Use pinch/drag or mode-bar tools to zoom
          (ECharts twin uses <code>dataZoom</code> sliders).
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
        This page loads the official <strong>plotly.js-dist-min</strong> bundle (3D WebGL,
        sankey, parcoords, treemap, geo-capable, etc.) — large download, but avoids bundling
        raw <code>plotly.js</code> source through Vite (fewer Node-polyfill runtime bugs).
        For a smaller first paint elsewhere, lazy-load this route only (already done).
      </p>
    </div>
  );
}
