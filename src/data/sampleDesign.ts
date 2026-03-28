/** Synthetic design-metric rows for Pareto / scaling charts (not real silicon). */

export type DesignRow = {
  architecture: string;
  bitWidth: number;
  fmaxMhz: number;
  powerMw: number;
  areaUm2: number;
};

export const DESIGN_ROWS: DesignRow[] = [
  { architecture: "rca", bitWidth: 32, fmaxMhz: 420, powerMw: 2.1, areaUm2: 2100 },
  { architecture: "rca", bitWidth: 64, fmaxMhz: 310, powerMw: 3.8, areaUm2: 4100 },
  { architecture: "cla", bitWidth: 32, fmaxMhz: 680, powerMw: 3.2, areaUm2: 3400 },
  { architecture: "cla", bitWidth: 64, fmaxMhz: 520, powerMw: 5.9, areaUm2: 6500 },
  { architecture: "kogge_stone", bitWidth: 32, fmaxMhz: 920, powerMw: 4.8, areaUm2: 5200 },
  { architecture: "kogge_stone", bitWidth: 64, fmaxMhz: 780, powerMw: 8.4, areaUm2: 9800 },
  { architecture: "brent_kung", bitWidth: 32, fmaxMhz: 850, powerMw: 4.1, areaUm2: 4800 },
  { architecture: "brent_kung", bitWidth: 64, fmaxMhz: 710, powerMw: 7.2, areaUm2: 9100 },
];

/** Architecture colors as explicit RGB (order: blue, green, red, purple). */
const colors: Record<string, string> = {
  rca: "rgb(0, 0, 255)",
  cla: "rgb(0, 128, 0)",
  kogge_stone: "rgb(255, 0, 0)",
  brent_kung: "rgb(128, 0, 128)",
};

export function architectureColor(arch: string): string {
  return colors[arch] ?? "rgb(139, 69, 19)";
}

/** Stable row order for matrices and grouped bars (matches `colors` keys used in charts). */
export const DESIGN_ARCH_ORDER: readonly string[] = [
  "rca",
  "cla",
  "kogge_stone",
  "brent_kung",
];

export const DESIGN_BIT_WIDTHS: readonly number[] = [32, 64];

/** Human-readable label for legend / category axes (e.g. `kogge_stone` → Kogge Stone). */
export function formatArchLabel(arch: string): string {
  return arch
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Rows for a single bit width, ordered by `DESIGN_ARCH_ORDER`. */
export function rowsByBitWidthOrdered(bitWidth: number): DesignRow[] {
  const byArch = new Map(
    DESIGN_ROWS.filter((r) => r.bitWidth === bitWidth).map((r) => [r.architecture, r]),
  );
  return DESIGN_ARCH_ORDER.map((a) => byArch.get(a)).filter((r): r is DesignRow => r != null);
}

/**
 * Fmax (MHz) grid: rows = architectures (`DESIGN_ARCH_ORDER`), columns = `DESIGN_BIT_WIDTHS`.
 */
export function fmaxMhzHeatmapGrid(): { z: number[][]; colLabels: string[]; rowLabels: string[] } {
  const z: number[][] = DESIGN_ARCH_ORDER.map((arch) =>
    DESIGN_BIT_WIDTHS.map((bw) => {
      const row = DESIGN_ROWS.find((r) => r.architecture === arch && r.bitWidth === bw);
      return row?.fmaxMhz ?? 0;
    }),
  );
  return {
    z,
    colLabels: DESIGN_BIT_WIDTHS.map((bw) => `${bw}`),
    rowLabels: DESIGN_ARCH_ORDER.map(formatArchLabel),
  };
}

/** Root label shared by hierarchy charts (treemap / sunburst). */
export const DESIGN_ROOT_LABEL = "Synthetic design";

/**
 * Plotly treemap / sunburst flat encoding: root + one leaf per design.
 * Values default to die area (µm²); use `powerMw` for power-weighted tiles.
 */
export function designTreemapFlat(
  valueKey: "areaUm2" | "powerMw" = "areaUm2",
): { labels: string[]; parents: string[]; values: number[] } {
  const root = DESIGN_ROOT_LABEL;
  const leafLabels = DESIGN_ROWS.map(
    (r) => `${formatArchLabel(r.architecture)} · ${r.bitWidth}b`,
  );
  const labels = [root, ...leafLabels];
  const parents = ["", ...DESIGN_ROWS.map(() => root)];
  const sum = DESIGN_ROWS.reduce((s, r) => s + r[valueKey], 0);
  const values = [sum, ...DESIGN_ROWS.map((r) => r[valueKey])];
  return { labels, parents, values };
}

/**
 * Synthetic whiskers around 64b power for boxplot examples (illustrative only).
 */
export function syntheticPowerBoxByArch64(): {
  categories: string[];
  stats: [number, number, number, number, number][];
} {
  const rows = rowsByBitWidthOrdered(64);
  return {
    categories: rows.map((r) => formatArchLabel(r.architecture)),
    stats: rows.map((r) => {
      const m = r.powerMw;
      return [m * 0.82, m * 0.92, m, m * 1.08, m * 1.18] as [
        number,
        number,
        number,
        number,
        number,
      ];
    }),
  };
}

/** Normalized 0–100 radar axes @ 64b — Fmax, power, area. */
export function radarMetrics64Normalized(): {
  indicators: { name: string; max: number }[];
  series: { name: string; value: [number, number, number]; color: string }[];
} {
  const rows = rowsByBitWidthOrdered(64);
  const maxF = Math.max(...rows.map((r) => r.fmaxMhz));
  const maxP = Math.max(...rows.map((r) => r.powerMw));
  const maxA = Math.max(...rows.map((r) => r.areaUm2));
  return {
    indicators: [
      { name: "Fmax (%)", max: 100 },
      { name: "Power (%)", max: 100 },
      { name: "Area (%)", max: 100 },
    ],
    series: rows.map((r) => ({
      name: formatArchLabel(r.architecture),
      value: [
        (r.fmaxMhz / maxF) * 100,
        (r.powerMw / maxP) * 100,
        (r.areaUm2 / maxA) * 100,
      ] as [number, number, number],
      color: architectureColor(r.architecture),
    })),
  };
}

/** Funnel stages sorted by Fmax (MHz), for throughput-style analytics charts. */
export function funnelStepsByFmax(): {
  name: string;
  value: number;
  architecture: string;
}[] {
  return [...DESIGN_ROWS]
    .sort((a, b) => b.fmaxMhz - a.fmaxMhz)
    .map((r) => ({
      name: `${formatArchLabel(r.architecture)} ${r.bitWidth}b`,
      value: r.fmaxMhz,
      architecture: r.architecture,
    }));
}
