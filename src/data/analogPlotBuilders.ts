import type { Config, Data, Layout } from "plotly.js";
import type { AnalogBenchmarkRow, AnalogMetricKey, AnalogReferenceType } from "./analogTypes";
import {
  CHART_SCATTER3D_MARKER_LINE_WIDTH,
  CHART_SCATTER_MARKER_LINE_WIDTH,
  chartScatterMarkerStrokeRgb,
  getChartPalette,
  plotAxisFont,
  plotFont,
  plotInsetBackground,
  plotlyAxisFrameX,
  plotlyAxisFrameY,
  plotlyHeatmapColorscale,
  plotlyHoverLabel,
  plotlySceneAxis,
  type ThemeMode,
} from "../theme/chartPalette";
import { hasMetrics, metricLabel, metricValue } from "./analogMetrics";

export type AxisScaleMode = "linear" | "log";

export type PlotBundle = {
  data: Data[];
  layout: Partial<Layout>;
  config: Partial<Config>;
};

type Scatter2DOptions = {
  title: string;
  rows: readonly AnalogBenchmarkRow[];
  xMetric: AnalogMetricKey;
  yMetric: AnalogMetricKey;
  xScale?: AxisScaleMode;
  yScale?: AxisScaleMode;
  theme: ThemeMode;
  narrow: boolean;
};

type Scatter3DOptions = {
  title: string;
  rows: readonly AnalogBenchmarkRow[];
  xMetric: AnalogMetricKey;
  yMetric: AnalogMetricKey;
  zMetric: AnalogMetricKey;
  xScale?: AxisScaleMode;
  yScale?: AxisScaleMode;
  zScale?: AxisScaleMode;
  theme: ThemeMode;
  narrow: boolean;
};

const TYPE_COLOR: Record<AnalogReferenceType, string> = {
  "2T": "rgb(0, 113, 227)",
  SCM: "rgb(255, 149, 0)",
  Hybrid: "rgb(81, 156, 66)",
};

const TYPE_SYMBOL: Record<AnalogReferenceType, string> = {
  "2T": "circle",
  SCM: "square",
  Hybrid: "diamond",
};

function axisType(scale: AxisScaleMode | undefined): "linear" | "log" {
  return scale === "log" ? "log" : "linear";
}

function scatterRowsByType(
  rows: readonly AnalogBenchmarkRow[],
  keys: readonly AnalogMetricKey[],
): Record<AnalogReferenceType, AnalogBenchmarkRow[]> {
  const out: Record<AnalogReferenceType, AnalogBenchmarkRow[]> = {
    "2T": [],
    SCM: [],
    Hybrid: [],
  };
  for (const row of rows) {
    if (!hasMetrics(row, keys)) continue;
    out[row.type].push(row);
  }
  return out;
}

function scatterHover(row: AnalogBenchmarkRow): string {
  const tech = `${row.technologyNm}nm`;
  return [
    `<b>${row.refKey}</b>`,
    `Type: ${row.type}`,
    `Year: ${row.year}`,
    `Tech: ${tech}`,
    `Result: ${row.resultKind}`,
    `Trim: ${row.trimState}`,
  ].join("<br>");
}

export function buildAnalogScatter2D(opts: Scatter2DOptions): PlotBundle {
  const palette = getChartPalette(opts.theme);
  const grouped = scatterRowsByType(opts.rows, [opts.xMetric, opts.yMetric]);
  const markerStroke = chartScatterMarkerStrokeRgb(opts.theme);
  const traces: Data[] = (["2T", "SCM", "Hybrid"] as const).map((t) => ({
    type: "scatter",
    mode: "markers",
    name: t,
    x: grouped[t].map((r) => metricValue(r, opts.xMetric) as number),
    y: grouped[t].map((r) => metricValue(r, opts.yMetric) as number),
    text: grouped[t].map(scatterHover),
    hovertemplate: "%{text}<extra></extra>",
    marker: {
      size: 12,
      color: TYPE_COLOR[t],
      symbol: TYPE_SYMBOL[t],
      opacity: 0.95,
      line: { width: CHART_SCATTER_MARKER_LINE_WIDTH, color: markerStroke },
    },
  }));

  const layout: Partial<Layout> = {
    autosize: true,
    margin: opts.narrow ? { l: 48, r: 18, t: 44, b: 56 } : { l: 64, r: 24, t: 54, b: 72 },
    title: { text: `<b>${opts.title}</b>`, font: plotFont(palette.rgbAxisTitle) },
    paper_bgcolor: plotInsetBackground(opts.theme),
    plot_bgcolor: plotInsetBackground(opts.theme),
    font: plotFont(palette.rgbAxisTitle),
    hoverlabel: plotlyHoverLabel(palette, opts.narrow),
    legend: {
      orientation: "h",
      y: 1.02,
      yanchor: "bottom",
      x: 0,
      xanchor: "left",
      font: plotAxisFont(palette.rgbAxisTitle, opts.narrow),
    },
    xaxis: {
      ...plotlyAxisFrameX(palette),
      title: { text: metricLabel(opts.xMetric), font: plotAxisFont(palette.rgbAxisTitle, opts.narrow) },
      type: axisType(opts.xScale),
      tickfont: plotAxisFont(palette.axisValueLabelRgb, opts.narrow),
      gridcolor: palette.axisGridGreyRgb,
      zeroline: false,
      automargin: true,
    },
    yaxis: {
      ...plotlyAxisFrameY(palette),
      title: { text: metricLabel(opts.yMetric), font: plotAxisFont(palette.rgbAxisTitle, opts.narrow) },
      type: axisType(opts.yScale),
      tickfont: plotAxisFont(palette.axisValueLabelRgb, opts.narrow),
      gridcolor: palette.axisGridBlackRgb,
      zeroline: false,
      automargin: true,
    },
  };

  const config: Partial<Config> = {
    responsive: true,
    displaylogo: false,
  };

  return { data: traces, layout, config };
}

export function buildAnalogScatter3D(opts: Scatter3DOptions): PlotBundle {
  const palette = getChartPalette(opts.theme);
  const grouped = scatterRowsByType(opts.rows, [opts.xMetric, opts.yMetric, opts.zMetric]);
  const markerStroke = chartScatterMarkerStrokeRgb(opts.theme);

  const traces: Data[] = (["2T", "SCM", "Hybrid"] as const).map((t) => ({
    type: "scatter3d",
    mode: "markers",
    name: t,
    x: grouped[t].map((r) => metricValue(r, opts.xMetric) as number),
    y: grouped[t].map((r) => metricValue(r, opts.yMetric) as number),
    z: grouped[t].map((r) => metricValue(r, opts.zMetric) as number),
    text: grouped[t].map(scatterHover),
    hovertemplate: "%{text}<extra></extra>",
    marker: {
      size: 6,
      color: TYPE_COLOR[t],
      symbol: TYPE_SYMBOL[t],
      opacity: 0.95,
      line: { width: CHART_SCATTER3D_MARKER_LINE_WIDTH, color: markerStroke },
    },
  }));

  const layout: Partial<Layout> = {
    autosize: true,
    margin: opts.narrow ? { l: 8, r: 8, t: 36, b: 8 } : { l: 16, r: 16, t: 44, b: 16 },
    title: { text: `<b>${opts.title}</b>`, font: plotFont(palette.rgbAxisTitle) },
    paper_bgcolor: plotInsetBackground(opts.theme),
    font: plotFont(palette.rgbAxisTitle),
    hoverlabel: plotlyHoverLabel(palette, opts.narrow),
    legend: {
      orientation: "h",
      y: 1.02,
      yanchor: "bottom",
      x: 0,
      xanchor: "left",
      font: plotAxisFont(palette.rgbAxisTitle, opts.narrow),
    },
    scene: {
      xaxis: {
        ...plotlySceneAxis(palette, "grey"),
        title: { text: metricLabel(opts.xMetric), font: plotAxisFont(palette.rgbAxisTitle, opts.narrow) },
        type: axisType(opts.xScale),
      },
      yaxis: {
        ...plotlySceneAxis(palette, "black"),
        title: { text: metricLabel(opts.yMetric), font: plotAxisFont(palette.rgbAxisTitle, opts.narrow) },
        type: axisType(opts.yScale),
      },
      zaxis: {
        ...plotlySceneAxis(palette, "grey"),
        title: { text: metricLabel(opts.zMetric), font: plotAxisFont(palette.rgbAxisTitle, opts.narrow) },
        type: axisType(opts.zScale),
      },
      bgcolor: "rgba(0,0,0,0)",
      aspectmode: "cube",
    },
  };

  const config: Partial<Config> = {
    responsive: true,
    displaylogo: false,
  };

  return { data: traces, layout, config };
}

export function buildAnalogCoverageHeatmap(
  rows: readonly AnalogBenchmarkRow[],
  theme: ThemeMode,
  narrow: boolean,
): PlotBundle {
  const palette = getChartPalette(theme);
  const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b);
  const types: AnalogReferenceType[] = ["2T", "SCM", "Hybrid"];
  const z = types.map((type) =>
    years.map((year) => rows.filter((r) => r.type === type && r.year === year).length),
  );
  const total = years.map((year) => rows.filter((r) => r.year === year).length);

  const data: Data[] = [
    {
      type: "heatmap",
      x: years,
      y: types,
      z,
      colorscale: plotlyHeatmapColorscale(palette, theme),
      hovertemplate: "Type: %{y}<br>Year: %{x}<br>Count: %{z}<extra></extra>",
      colorbar: { title: { text: "Papers", font: plotAxisFont(palette.rgbAxisTitle, narrow) } },
    },
    {
      type: "scatter",
      x: years,
      y: total.map(() => "Total"),
      mode: "text",
      text: total.map(String),
      textfont: plotAxisFont(palette.rgbAxisTitle, narrow),
      hovertemplate: "Year %{x}<br>Total papers: %{text}<extra></extra>",
      showlegend: false,
    },
  ];

  const layout: Partial<Layout> = {
    autosize: true,
    margin: narrow ? { l: 48, r: 18, t: 44, b: 52 } : { l: 64, r: 28, t: 52, b: 62 },
    title: { text: "<b>Publication Coverage by Year and Type</b>", font: plotFont(palette.rgbAxisTitle) },
    paper_bgcolor: plotInsetBackground(theme),
    plot_bgcolor: plotInsetBackground(theme),
    hoverlabel: plotlyHoverLabel(palette, narrow),
    xaxis: {
      ...plotlyAxisFrameX(palette),
      title: { text: "Year", font: plotAxisFont(palette.rgbAxisTitle, narrow) },
      tickfont: plotAxisFont(palette.axisValueLabelRgb, narrow),
      gridcolor: palette.axisGridGreyRgb,
      zeroline: false,
    },
    yaxis: {
      ...plotlyAxisFrameY(palette),
      title: { text: "Type", font: plotAxisFont(palette.rgbAxisTitle, narrow) },
      tickfont: plotAxisFont(palette.axisValueLabelRgb, narrow),
      gridcolor: palette.axisGridBlackRgb,
      zeroline: false,
    },
  };

  const config: Partial<Config> = {
    responsive: true,
    displaylogo: false,
  };

  return { data, layout, config };
}

