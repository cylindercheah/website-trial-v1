/**
 * Selectable quantities for 2D Pareto / exploration scatter (numeric or architecture index).
 */

import { type AdderDemoRow, DEMO_ARCH_ORDER, formatArchLabel } from "./samplePpa";

export type ScatterAxisMetric = "fmaxMhz" | "powerMw" | "areaUm2" | "bitWidth" | "architecture";

export const SCATTER_AXIS_METRICS: readonly ScatterAxisMetric[] = [
  "fmaxMhz",
  "powerMw",
  "areaUm2",
  "bitWidth",
  "architecture",
] as const;

const META: Record<ScatterAxisMetric, { label: string; unit: string }> = {
  fmaxMhz: { label: "Fmax", unit: "MHz" },
  powerMw: { label: "Power", unit: "mW" },
  areaUm2: { label: "Area", unit: "µm²" },
  bitWidth: { label: "Bit width", unit: "b" },
  architecture: { label: "Architecture", unit: "" },
};

/** Human-readable axis title (axis name on charts). */
export function scatterAxisTitle(metric: ScatterAxisMetric): string {
  const { label, unit } = META[metric];
  return unit ? `${label} (${unit})` : label;
}

/** Short label for HTML `<option>` text. */
export function scatterAxisOptionLabel(metric: ScatterAxisMetric): string {
  return scatterAxisTitle(metric);
}

/** Numeric value used for the given row on a linear / value axis. */
export function scatterAxisValue(metric: ScatterAxisMetric, row: AdderDemoRow): number {
  if (metric === "architecture") {
    return DEMO_ARCH_ORDER.indexOf(row.architecture);
  }
  return row[metric];
}

/** String for tooltips / axis labels (architecture index → display name). */
export function scatterAxisDisplayValue(metric: ScatterAxisMetric, value: number): string {
  if (metric === "architecture") {
    const i = Math.round(value);
    const arch = DEMO_ARCH_ORDER[i];
    return arch ? formatArchLabel(arch) : String(value);
  }
  return String(value);
}

/** Suggested [min, max] for axis; omit to let the library autorange. */
export function scatterAxisRange(
  metric: ScatterAxisMetric,
): [number, number] | undefined {
  if (metric === "architecture") {
    return [-0.5, DEMO_ARCH_ORDER.length - 0.5];
  }
  return undefined;
}

/** Plotly tickvals / ticktext when an axis encodes architecture index. */
export function scatterArchitectureTickAxis(): {
  tickmode: "array";
  tickvals: number[];
  ticktext: string[];
} {
  return {
    tickmode: "array",
    tickvals: DEMO_ARCH_ORDER.map((_, i) => i),
    ticktext: DEMO_ARCH_ORDER.map(formatArchLabel),
  };
}
