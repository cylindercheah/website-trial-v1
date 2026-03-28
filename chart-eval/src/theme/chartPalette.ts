/**
 * Chart colors for light / dark UI (kept in sync with index.css `data-theme`).
 */

/** Shared chart typography: Arial, 20px bold, line width 3 for strokes. */
export const CHART_FONT_FAMILY = "Arial, sans-serif";
export const CHART_FONT_SIZE = 20;
export const CHART_LINE_WIDTH = 3;

/** Plotly accepts HTML; use for bold where `layout.font` has no weight. */
export function plotlyBold(text: string): string {
  return `<b>${text}</b>`;
}

/** Default Plotly font object (size 20, Arial). */
export function plotFont(color: string): { family: string; size: number; color: string } {
  return { family: CHART_FONT_FAMILY, size: CHART_FONT_SIZE, color };
}

/**
 * Plotly tick / category labels with bold weight (Plotly has no fontWeight on ticks).
 * Uses Arial Black when available.
 */
export function plotTickFont(color: string): { family: string; size: number; color: string } {
  return {
    family: `Arial Black, ${CHART_FONT_FAMILY}`,
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

/** ECharts `grid` rect: visible border on all four sides of the plotting area. */
export function echartsGridBorder(palette: ChartPalette): {
  borderColor: string;
  borderWidth: number;
} {
  return {
    borderColor: palette.axisBorderRgb,
    borderWidth: CHART_LINE_WIDTH,
  };
}

/** ECharts textStyle helper matching chart typography. */
export function echartsTextStyle(color: string): {
  fontFamily: string;
  fontSize: number;
  fontWeight: "bold";
  color: string;
} {
  return {
    fontFamily: CHART_FONT_FAMILY,
    fontSize: CHART_FONT_SIZE,
    fontWeight: "bold",
    color,
  };
}

export type ChartPalette = {
  text: string;
  textMuted: string;
  grid: string;
  gridStrong: string;
  /** Axis titles, chart chrome (explicit RGB). */
  rgbAxisTitle: string;
  /** Tick / legend item labels (explicit RGB). */
  rgbAxisTick: string;
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
