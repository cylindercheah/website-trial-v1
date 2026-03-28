/**
 * Chart colors for light / dark UI (kept in sync with index.css `data-theme`).
 */

import type { HoverLabel } from "plotly.js";

/** Shared chart typography: Arial, 20px bold, line width 3 for strokes. */
export const CHART_FONT_FAMILY = "Arial, sans-serif";
export const CHART_FONT_SIZE = 20;
export const CHART_LINE_WIDTH = 3;

/** Marker edge and pie/donut slice outline — black in both themes. */
export const CHART_MARKER_OUTLINE_RGB = "rgb(0, 0, 0)";

/** 2D Pareto scatter marker stroke (px); SVG traces use this directly. */
export const CHART_SCATTER_MARKER_LINE_WIDTH = 2.5;

/**
 * 3D scatter marker stroke (px). Plotly `scatter3d` (WebGL) draws edges thinner than 2D scatter at the
 * same numeric width — set higher so outlines match the Pareto plot visually.
 */
export const CHART_SCATTER3D_MARKER_LINE_WIDTH = 5;

/**
 * Heavy face for axis titles + ticks so numbering matches label weight (Plotly has no tick fontWeight).
 */
export const CHART_AXIS_FONT_FAMILY = `Arial Black, ${CHART_FONT_FAMILY}`;

/** Plotly accepts HTML; use for bold where `layout.font` has no weight. */
export function plotlyBold(text: string): string {
  return `<b>${text}</b>`;
}

/**
 * Shared Plotly hover tooltip chrome: theme background/border and heavy type (Arial Black).
 * Apply on every `layout` so scatter, bar, heatmap, etc. match.
 */
export function plotlyHoverLabel(
  palette: ChartPalette,
  narrow: boolean,
): Partial<HoverLabel> {
  return {
    bgcolor: palette.tooltipBg,
    bordercolor: palette.tooltipBorder,
    font: {
      family: CHART_AXIS_FONT_FAMILY,
      size: chartAxisFontSizePx(narrow),
      color: palette.rgbAxisTitle,
    },
    align: "left",
    namelength: -1,
  };
}

/** Default Plotly font object (size 20, Arial). */
export function plotFont(color: string): { family: string; size: number; color: string } {
  return { family: CHART_FONT_FAMILY, size: CHART_FONT_SIZE, color };
}

/** Axis tick + title size: smaller on narrow viewports so labels clear titles and fit phones. */
export function chartAxisFontSizePx(narrow: boolean): number {
  return narrow ? 12 : 16;
}

/** Plotly axis title and tick font — same bold family, size, and color role. */
export function plotAxisFont(
  color: string,
  narrow: boolean,
): { family: string; size: number; color: string } {
  return {
    family: CHART_AXIS_FONT_FAMILY,
    size: chartAxisFontSizePx(narrow),
    color,
  };
}

/**
 * Plotly tick / category labels with bold weight (Plotly has no fontWeight on ticks).
 * Uses Arial Black when available.
 */
export function plotTickFont(color: string): { family: string; size: number; color: string } {
  return {
    family: CHART_AXIS_FONT_FAMILY,
    size: CHART_FONT_SIZE,
    color,
  };
}

/** Plot frame: visible border on all sides (`mirror: "all"` on X draws top line too). */
export function plotlyAxisFrameX(palette: ChartPalette): {
  linecolor: string;
  linewidth: number;
  tickwidth: number;
  tickcolor: string;
  zerolinecolor: string;
  zerolinewidth: number;
  mirror: "all";
  showline: boolean;
} {
  return {
    linecolor: palette.axisBorderRgb,
    linewidth: CHART_LINE_WIDTH,
    tickwidth: CHART_LINE_WIDTH,
    tickcolor: palette.axisBorderRgb,
    zerolinecolor: palette.axisGridBlackRgb,
    zerolinewidth: CHART_LINE_WIDTH,
    mirror: "all",
    showline: true,
  };
}

/**
 * Y-axis frame. Use `mirror: false` when a second Y axis is drawn on the right
 * so the primary axis does not duplicate the right spine.
 */
export function plotlyAxisFrameY(
  palette: ChartPalette,
  opts?: { mirror?: "all" | false },
): {
  linecolor: string;
  linewidth: number;
  tickwidth: number;
  tickcolor: string;
  zerolinecolor: string;
  zerolinewidth: number;
  mirror: "all" | false;
  showline: boolean;
} {
  return {
    linecolor: palette.axisBorderRgb,
    linewidth: CHART_LINE_WIDTH,
    tickwidth: CHART_LINE_WIDTH,
    tickcolor: palette.axisBorderRgb,
    zerolinecolor: palette.axisGridBlackRgb,
    zerolinewidth: CHART_LINE_WIDTH,
    mirror: opts?.mirror === false ? false : "all",
    showline: true,
  };
}

/** Plotly 3D scene axes: black border line, grey vs black grid. */
export function plotlySceneAxis(
  palette: ChartPalette,
  grid: "grey" | "black",
): {
  backgroundcolor: string;
  showbackground: boolean;
  gridcolor: string;
  gridwidth: number;
  showgrid: boolean;
  linecolor: string;
  linewidth: number;
  zerolinecolor: string;
  zerolinewidth: number;
} {
  return {
    backgroundcolor: "rgba(0,0,0,0)",
    showbackground: true,
    gridcolor: grid === "grey" ? palette.axisGridGreyRgb : palette.axisGridBlackRgb,
    gridwidth: CHART_LINE_WIDTH,
    showgrid: true,
    linecolor: palette.axisBorderRgb,
    linewidth: CHART_LINE_WIDTH,
    zerolinecolor: palette.axisGridBlackRgb,
    zerolinewidth: CHART_LINE_WIDTH,
  };
}

export type ChartPalette = {
  text: string;
  textMuted: string;
  grid: string;
  gridStrong: string;
  /** Axis titles, chart chrome (explicit RGB). */
  rgbAxisTitle: string;
  /** Legend and other non-axis chrome (muted). */
  rgbAxisTick: string;
  /** X/Y (and colorbar) tick value labels — black on light theme. */
  axisValueLabelRgb: string;
  /** Plot outer border + tick marks (black on light theme). */
  axisBorderRgb: string;
  /** Gridlines for one axis direction (grey). */
  axisGridGreyRgb: string;
  /** Gridlines for the other axis direction (black on light theme). */
  axisGridBlackRgb: string;
  plotBg: string;
  accentOrange: string;
  tooltipBg: string;
  tooltipBorder: string;
  markerOutline: string;
};

const light: ChartPalette = {
  text: "#1d1d1f",
  textMuted: "#6e6e73",
  grid: "#e5e5ea",
  gridStrong: "#d2d2d7",
  rgbAxisTitle: "rgb(29, 29, 31)",
  rgbAxisTick: "rgb(110, 110, 115)",
  axisValueLabelRgb: "rgb(0, 0, 0)",
  axisBorderRgb: "rgb(0, 0, 0)",
  axisGridGreyRgb: "rgb(180, 180, 180)",
  axisGridBlackRgb: "rgb(0, 0, 0)",
  plotBg: "rgba(255,255,255,0)",
  accentOrange: "#ff9500",
  tooltipBg: "rgba(255, 255, 255, 0.96)",
  tooltipBorder: "#d2d2d7",
  markerOutline: "rgba(29, 29, 31, 0.25)",
};

const dark: ChartPalette = {
  text: "#e7ecf3",
  textMuted: "#8b9bb4",
  grid: "#2d3a4d",
  gridStrong: "#3d4f66",
  rgbAxisTitle: "rgb(231, 236, 243)",
  rgbAxisTick: "rgb(139, 155, 180)",
  axisValueLabelRgb: "rgb(255, 255, 255)",
  axisBorderRgb: "rgb(220, 225, 235)",
  axisGridGreyRgb: "rgb(90, 98, 115)",
  axisGridBlackRgb: "rgb(160, 170, 190)",
  plotBg: "rgba(255,255,255,0)",
  accentOrange: "#ff9f4a",
  tooltipBg: "rgba(26, 35, 50, 0.96)",
  tooltipBorder: "#3d4f66",
  markerOutline: "rgba(231, 236, 243, 0.35)",
};

export type ThemeMode = "light" | "dark";

export function getChartPalette(theme: ThemeMode): ChartPalette {
  return theme === "dark" ? dark : light;
}

/**
 * Opaque background for Plotly charts: matches `index.css` `--plot-inset-bg` on `.plot-host`.
 * Using solid paper/plot (not transparent) fixes PNG export showing a default grey behind titles and margins.
 */
export function plotInsetBackground(theme: ThemeMode): string {
  return theme === "dark" ? "#131b26" : "#fafafa";
}

/**
 * Plotly heatmap colorscale: dark blue → dark green → dark red (same ramp in light and dark themes).
 */
export function plotlyHeatmapColorscale(
  _palette: ChartPalette,
  _theme: ThemeMode,
): [number, string][] {
  return [
    [0, "rgb(0, 0, 140)"],
    [0.5, "rgb(0, 95, 52)"],
    [1, "rgb(165, 0, 0)"],
  ];
}
