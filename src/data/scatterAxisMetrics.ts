/**
 * Selectable quantities for 2D Pareto / exploration scatter (numeric or architecture index).
 */

import {
  type DesignRow,
  type DesignFamilyId,
  DESIGN_FAMILIES,
  DESIGN_ROWS,
  DESIGN_ARCH_ORDER,
  DESIGN_BIT_WIDTHS,
  DEFAULT_TECHNOLOGY_NODE,
  designRowsForTechnology,
  designBitWidthsForRows,
  formatArchLabel,
  DESIGN_ROOT_LABEL,
} from "./design";

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

/**
 * Fixed design fields for scatter hovers (matches row data, not axis mapping).
 * Uses HTML snippets for Plotly `hoverlabel` (bold labels).
 */
function technologyHoverLine(row: DesignRow): string {
  const { processNode, canonicalTechnology } = row;
  if (canonicalTechnology !== processNode) {
    return `<b>Technology:</b> ${processNode} → ${canonicalTechnology}`;
  }
  return `<b>Technology:</b> ${processNode}`;
}

export function designRowStaticHoverHtml(row: DesignRow): string {
  return [
    `<b>Architecture:</b> ${formatArchLabel(row.architecture)}`,
    `<b>Bit width:</b> ${row.bitWidth} b`,
    `<b>Area:</b> ${row.areaUm2} µm²`,
    `<b>Freq:</b> ${row.fmaxMhz} MHz`,
    `<b>Power:</b> ${row.powerMw} mW`,
    technologyHoverLine(row),
  ].join("<br>");
}

/** Pareto / 2D scatter hover: design row fields only (chosen X/Y are on the axes). */
export function scatter2dPointHoverHtml(row: DesignRow): string {
  return designRowStaticHoverHtml(row);
}

/** 3D scatter hover: same static row facts as 2D. */
export function scatter3dPointHoverHtml(row: DesignRow): string {
  return designRowStaticHoverHtml(row);
}

/** Short label for HTML `<option>` text. */
export function scatterAxisOptionLabel(metric: ScatterAxisMetric): string {
  return scatterAxisTitle(metric);
}

/** Numeric value used for the given row on a linear / value axis. */
export function scatterAxisValue(
  metric: ScatterAxisMetric,
  row: DesignRow,
  archOrder: readonly string[] = DESIGN_ARCH_ORDER,
): number {
  if (metric === "architecture") {
    return archOrder.indexOf(row.architecture);
  }
  return row[metric];
}

/** String for tooltips / axis labels (architecture index → display name). */
export function scatterAxisDisplayValue(
  metric: ScatterAxisMetric,
  value: number,
  archOrder: readonly string[] = DESIGN_ARCH_ORDER,
): string {
  if (metric === "architecture") {
    const i = Math.round(value);
    const arch = archOrder[i];
    return arch ? formatArchLabel(arch) : String(value);
  }
  return String(value);
}

/** Suggested [min, max] for axis; omit to let the library autorange. */
export function scatterAxisRange(
  metric: ScatterAxisMetric,
  archOrder: readonly string[] = DESIGN_ARCH_ORDER,
): [number, number] | undefined {
  if (metric === "architecture") {
    return [-0.5, archOrder.length - 0.5];
  }
  return undefined;
}

/** Plotly tickvals / ticktext when an axis encodes architecture index. */
export function scatterArchitectureTickAxis(
  archOrder: readonly string[] = DESIGN_ARCH_ORDER,
): {
  tickmode: "array";
  tickvals: number[];
  ticktext: string[];
} {
  return {
    tickmode: "array",
    tickvals: archOrder.map((_, i) => i),
    ticktext: archOrder.map(formatArchLabel),
  };
}

/** Explore panel category — same ids as `designFamily` on each row. */
export type DesignCategoryId = DesignFamilyId;

/** Human-readable category label from a family id (filename stem or explicit `designFamily`). */
export function designCategoryDefaultLabel(id: string): string {
  const titled = id
    .split(/[_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
  return titled ? `${titled} (dataset)` : id;
}

/** Built from DESIGN_FAMILIES emitted at codegen (add a data/*.json file and rebuild). */
export const DESIGN_CATEGORIES: readonly { id: DesignCategoryId; label: string }[] =
  DESIGN_FAMILIES.map((id) => ({
    id,
    label: designCategoryDefaultLabel(id),
  }));

export function designCategoryLabel(id: DesignCategoryId): string {
  const row = DESIGN_CATEGORIES.find((c) => c.id === id);
  return row?.label ?? id;
}

/** Keys for X / Y / Z only (`category` and `bitWidth` are set separately). */
export type ExploreAxisKey = "x" | "y" | "z";

/**
 * What bar, donut, Pareto, and 3D scatter hold fixed vs sweep.
 * - `architecture`: fixed technology node + fixed bit width → one value per architecture.
 * - `bitWidth`: fixed technology; sweep bit widths (bar X / scatter points per width).
 * - `technology`: fixed bit width; sweep technology nodes (bar X / scatter points per node).
 */
export type BarDonutBaselineMode = "architecture" | "bitWidth" | "technology";

/** Linear vs log₁₀ for numeric chart axes and magnitudes (architecture index stays linear). */
export type NumericScaleMode = "linear" | "log";

export const NUMERIC_SCALE_OPTIONS: readonly { value: NumericScaleMode; label: string }[] = [
  { value: "linear", label: "Linear" },
  { value: "log", label: "Log (base 10)" },
] as const;

/** True for quantities that can use a positive log axis (excludes architecture index). */
export function metricSupportsLogScale(metric: ScatterAxisMetric): boolean {
  return metric !== "architecture";
}

/** Plotly axis `type` for 2D/3D numeric axes. */
export function plotlyAxisTypeForMetric(
  metric: ScatterAxisMetric,
  scale: NumericScaleMode,
): "linear" | "log" {
  if (scale !== "log" || !metricSupportsLogScale(metric)) return "linear";
  return "log";
}

export const BAR_DONUT_BASELINE_OPTIONS: readonly {
  value: BarDonutBaselineMode;
  label: string;
}[] = [
  { value: "architecture", label: "Architectures (fixed technology & bit width)" },
  { value: "bitWidth", label: "Bit widths (technology baseline)" },
  { value: "technology", label: "Technology nodes (bit-width baseline)" },
] as const;

/**
 * Explore panel: dataset category, Cartesian metrics (must differ), and slice bit width for bar/pie.
 */
export type ExploreAxesState = {
  category: DesignCategoryId;
  /** Selected technology node for charts that slice one corner (heatmap, bar, etc.). */
  technologyNode: string;
  bitWidth: number;
  /** Bar, donut, Pareto, 3D scatter: which dimension is fixed vs swept (see `BarDonutBaselineMode`). */
  barDonutBaseline: BarDonutBaselineMode;
  /** Linear vs log₁₀ per Cartesian axis (architecture indices stay linear). */
  numericScaleX: NumericScaleMode;
  numericScaleY: NumericScaleMode;
  numericScaleZ: NumericScaleMode;
  x: ScatterAxisMetric;
  y: ScatterAxisMetric;
  z: ScatterAxisMetric;
};

/** Prefer "adder" when present so demos stay stable; else first merged family. */
function defaultExploreCategory(): DesignCategoryId {
  const ids = DESIGN_FAMILIES as readonly string[];
  if (ids.includes("adder")) return "adder" as DesignCategoryId;
  return DESIGN_FAMILIES[0];
}

export const DEFAULT_EXPLORE_AXES: ExploreAxesState = {
  category: defaultExploreCategory(),
  technologyNode: DEFAULT_TECHNOLOGY_NODE,
  bitWidth: 64,
  barDonutBaseline: "architecture",
  numericScaleX: "linear",
  numericScaleY: "linear",
  numericScaleZ: "linear",
  x: "fmaxMhz",
  y: "powerMw",
  z: "areaUm2",
};

/**
 * Updates one of X/Y/Z and reassigns duplicates so the three metrics stay distinct.
 * Preserves `category`, `technologyNode`, `bitWidth`, `barDonutBaseline`, and numeric scales (X/Y/Z).
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
export function scatterAxisHeatmapGrid(
  metric: ScatterAxisMetric,
  technologyNode: string = DEFAULT_TECHNOLOGY_NODE,
  sliceOpts: {
    sourceRows?: readonly DesignRow[];
    archOrder?: readonly string[];
    bitWidths?: readonly number[];
  } = {},
): {
  z: number[][];
  colLabels: string[];
  rowLabels: string[];
} {
  const sourceRows = sliceOpts.sourceRows ?? DESIGN_ROWS;
  const archOrder = sliceOpts.archOrder ?? DESIGN_ARCH_ORDER;
  const bitWidths = sliceOpts.bitWidths ?? DESIGN_BIT_WIDTHS;
  const techSlice = designRowsForTechnology(sourceRows, technologyNode);
  const z = archOrder.map((arch) =>
    bitWidths.map((bw) => {
      const row = techSlice.find((r) => r.architecture === arch && r.bitWidth === bw);
      return row ? scatterAxisValue(metric, row, archOrder) : 0;
    }),
  );
  return {
    z,
    colLabels: bitWidths.map((bw) => `${bw}`),
    rowLabels: archOrder.map(formatArchLabel),
  };
}

/** Min/max for parallel-coords or autorange; expands degenerate ranges. */
export function scatterAxisExtent(
  rows: readonly DesignRow[],
  metric: ScatterAxisMetric,
  archOrder: readonly string[] = DESIGN_ARCH_ORDER,
): [number, number] {
  const vals = rows.map((r) => scatterAxisValue(metric, r, archOrder));
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
  archOrder: readonly string[] = DESIGN_ARCH_ORDER,
  bitWidths: readonly number[] = DESIGN_BIT_WIDTHS,
): {
  tickmode: "array";
  tickvals: number[];
  ticktext: string[];
  range?: [number, number];
} {
  if (metric === "architecture") {
    const ax = scatterArchitectureTickAxis(archOrder);
    const ticktext = tickTextsWithOptionalHiddenEnds(ax.tickvals, (__, i) => ax.ticktext[i] ?? "");
    const range = scatterAxisRange(metric, archOrder);
    return {
      tickmode: "array",
      tickvals: [...ax.tickvals],
      ticktext,
      ...(range ? { range } : {}),
    };
  }

  if (metric === "bitWidth") {
    const bws =
      rows.length > 0 ? designBitWidthsForRows(rows) : [...bitWidths];
    const [lo0, hi0] = scatterAxisExtent(rows, metric, archOrder);
    let tickvals: number[] = bws.filter((bw) => bw >= lo0 && bw <= hi0);
    if (tickvals.length === 0) {
      tickvals = [lo0, hi0];
    }
    const ticktext = tickTextsWithOptionalHiddenEnds(tickvals, (bw) => `${bw}`);
    const lo = tickvals[0];
    const hi = tickvals[tickvals.length - 1];
    const pad = Math.max(4, (hi - lo) * 0.15);
    return { tickmode: "array", tickvals: [...tickvals], ticktext, range: [lo - pad, hi + pad] };
  }

  const [lo0, hi0] = scatterAxisExtent(rows, metric, archOrder);
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
export function scatterAxisTreemapFlat(
  metric: ScatterAxisMetric,
  technologyNode: string = DEFAULT_TECHNOLOGY_NODE,
  sourceRows: readonly DesignRow[] = DESIGN_ROWS,
  archOrder: readonly string[] = DESIGN_ARCH_ORDER,
): {
  labels: string[];
  parents: string[];
  values: number[];
} {
  const slice = designRowsForTechnology(sourceRows, technologyNode);
  const root = DESIGN_ROOT_LABEL;
  const leafLabels = slice.map(
    (r) => `${formatArchLabel(r.architecture)} · ${r.bitWidth}b`,
  );
  const labels = [root, ...leafLabels];
  const parents = ["", ...slice.map(() => root)];
  const leafVals = slice.map((r) => scatterAxisValue(metric, r, archOrder));
  const sum = leafVals.reduce((s, v) => s + v, 0);
  const values = [sum, ...leafVals];
  return { labels, parents, values };
}
