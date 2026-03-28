/**
 * Chart colors for light / dark UI (kept in sync with index.css `data-theme`).
 */

export type ChartPalette = {
  text: string;
  textMuted: string;
  grid: string;
  gridStrong: string;
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
