/**
 * Selectable quantities for 2D Pareto / exploration scatter (numeric or architecture index).
 */

import {
  type DesignRow,
  DESIGN_ROWS,
  DESIGN_ARCH_ORDER,
  DESIGN_BIT_WIDTHS,
  formatArchLabel,
  DESIGN_ROOT_LABEL,
} from "./sampleDesign";

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
export function scatterAxisValue(metric: ScatterAxisMetric, row: DesignRow): number {
  if (metric === "architecture") {
    return DESIGN_ARCH_ORDER.indexOf(row.architecture);
  }
  return row[metric];
}

/** String for tooltips / axis labels (architecture index → display name). */
export function scatterAxisDisplayValue(metric: ScatterAxisMetric, value: number): string {
  if (metric === "architecture") {
    const i = Math.round(value);
    const arch = DESIGN_ARCH_ORDER[i];
    return arch ? formatArchLabel(arch) : String(value);
  }
  return String(value);
}

/** Suggested [min, max] for axis; omit to let the library autorange. */
export function scatterAxisRange(
  metric: ScatterAxisMetric,
): [number, number] | undefined {
  if (metric === "architecture") {
    return [-0.5, DESIGN_ARCH_ORDER.length - 0.5];
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
    tickvals: DESIGN_ARCH_ORDER.map((_, i) => i),
    ticktext: DESIGN_ARCH_ORDER.map(formatArchLabel),
  };
}

/** Dataset family for the explore panel (expand when more categories ship). */
export type DesignCategoryId = "adder";

export const DESIGN_CATEGORIES: readonly { id: DesignCategoryId; label: string }[] = [
  { id: "adder", label: "Adder (synthetic design)" },
];

export function designCategoryLabel(id: DesignCategoryId): string {
  const row = DESIGN_CATEGORIES.find((c) => c.id === id);
  return row?.label ?? id;
}

/** Keys for X / Y / Z only (`category` and `bitWidth` are set separately). */
export type ExploreAxisKey = "x" | "y" | "z";

/**
 * Explore panel: dataset category, Cartesian metrics (must differ), and slice bit width for bar/pie.
 */
export type ExploreAxesState = {
  category: DesignCategoryId;
  bitWidth: number;
  x: ScatterAxisMetric;
  y: ScatterAxisMetric;
  z: ScatterAxisMetric;
};

export const DEFAULT_EXPLORE_AXES: ExploreAxesState = {
  category: "adder",
  bitWidth: 64,
  x: "fmaxMhz",
  y: "powerMw",
  z: "areaUm2",
};

/**
 * Updates one of X/Y/Z and reassigns duplicates so the three metrics stay distinct.
 * Preserves `category` and `bitWidth`.
 */
export function syncExploreAxes(
  prev: ExploreAxesState,
  key: ExploreAxisKey,
  m: ScatterAxisMetric,
): ExploreAxesState {
  const next: ExploreAxesState =
    key === "x" ? { ...prev, x: m } : key === "y" ? { ...prev, y: m } : { ...prev, z: m };
  let { x, y, z } = next;
  const pick = (avoid: Set<ScatterAxisMetric>): ScatterAxisMetric => {
    const found = SCATTER_AXIS_METRICS.find((k) => !avoid.has(k));
    return found ?? SCATTER_AXIS_METRICS[0];
  };
  if (x === y) y = pick(new Set([x, z]));
  if (x === z) z = pick(new Set([x, y]));
  if (y === z) z = pick(new Set([x, y]));
  if (x === y) y = pick(new Set([x, z]));
  return { ...next, x, y, z };
}

/** Heatmap cell values: rows = architectures, cols = bit widths. */
export function scatterAxisHeatmapGrid(metric: ScatterAxisMetric): {
  z: number[][];
  colLabels: string[];
  rowLabels: string[];
} {
  const z = DESIGN_ARCH_ORDER.map((arch) =>
    DESIGN_BIT_WIDTHS.map((bw) => {
      const row = DESIGN_ROWS.find((r) => r.architecture === arch && r.bitWidth === bw);
      return row ? scatterAxisValue(metric, row) : 0;
    }),
  );
  return {
    z,
    colLabels: DESIGN_BIT_WIDTHS.map((bw) => `${bw}`),
    rowLabels: DESIGN_ARCH_ORDER.map(formatArchLabel),
  };
}

/** Min/max for parallel-coords or autorange; expands degenerate ranges. */
export function scatterAxisExtent(rows: readonly DesignRow[], metric: ScatterAxisMetric): [number, number] {
  const vals = rows.map((r) => scatterAxisValue(metric, r));
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  return [lo, hi];
}

function formatScene3dTickValue(v: number): string {
  const a = Math.abs(v);
  if (a >= 1000) {
    return `${Math.round(v / 1000)}k`;
  }
  if (a >= 100) {
    return String(Math.round(v));
  }
  if (a >= 1) {
    const t = Math.round(v * 10) / 10;
    return Number.isInteger(t) ? String(t) : t.toFixed(1);
  }
  return v.toFixed(2);
}

function tickTextsWithOptionalHiddenEnds(
  tickvals: number[],
  labelAt: (v: number, index: number) => string,
): string[] {
  const hideEnds = tickvals.length >= 3;
  return tickvals.map((v, i) => {
    if (hideEnds && (i === 0 || i === tickvals.length - 1)) {
      return "";
    }
    return labelAt(v, i);
  });
}

/**
 * Plotly `scene` axis ticks: fixed positions with empty labels on the first and last tick
 * (when there are at least three ticks) so corner labels do not pile up in 3D views.
 */
export function scene3dAxisTickHideEnds(
  metric: ScatterAxisMetric,
  rows: readonly DesignRow[],
  tickCount: number = 6,
): {
  tickmode: "array";
  tickvals: number[];
  ticktext: string[];
  range?: [number, number];
} {
  if (metric === "architecture") {
    const ax = scatterArchitectureTickAxis();
    const ticktext = tickTextsWithOptionalHiddenEnds(ax.tickvals, (__, i) => ax.ticktext[i] ?? "");
    const range = scatterAxisRange(metric);
    return {
      tickmode: "array",
      tickvals: [...ax.tickvals],
      ticktext,
      ...(range ? { range } : {}),
    };
  }

  if (metric === "bitWidth") {
    const [lo0, hi0] = scatterAxisExtent(rows, metric);
    let tickvals: number[] = DESIGN_BIT_WIDTHS.filter((bw) => bw >= lo0 && bw <= hi0);
    if (tickvals.length === 0) {
      tickvals = [lo0, hi0];
    }
    const ticktext = tickTextsWithOptionalHiddenEnds(tickvals, (bw) => `${bw}`);
    const lo = tickvals[0];
    const hi = tickvals[tickvals.length - 1];
    const pad = Math.max(4, (hi - lo) * 0.15);
    return { tickmode: "array", tickvals: [...tickvals], ticktext, range: [lo - pad, hi + pad] };
  }

  const [lo0, hi0] = scatterAxisExtent(rows, metric);
  const span = hi0 - lo0 || 1;
  const pad = span * 0.08;
  const lo = lo0 - pad;
  const hi = hi0 + pad;
  const n = Math.max(3, Math.min(tickCount, 12));
  const tickvals = Array.from({ length: n }, (_, i) => lo + ((hi - lo) * i) / (n - 1));
  const ticktext = tickTextsWithOptionalHiddenEnds(tickvals, (v) => formatScene3dTickValue(v));
  return { tickmode: "array", tickvals, ticktext, range: [lo, hi] };
}

/** Plotly icicle/treemap flat encoding from a chosen leaf value metric. */
export function scatterAxisTreemapFlat(metric: ScatterAxisMetric): {
  labels: string[];
  parents: string[];
  values: number[];
} {
  const root = DESIGN_ROOT_LABEL;
  const leafLabels = DESIGN_ROWS.map(
    (r) => `${formatArchLabel(r.architecture)} · ${r.bitWidth}b`,
  );
  const labels = [root, ...leafLabels];
  const parents = ["", ...DESIGN_ROWS.map(() => root)];
  const leafVals = DESIGN_ROWS.map((r) => scatterAxisValue(metric, r));
  const sum = leafVals.reduce((s, v) => s + v, 0);
  const values = [sum, ...leafVals];
  return { labels, parents, values };
}
