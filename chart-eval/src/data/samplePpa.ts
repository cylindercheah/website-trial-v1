/** Synthetic adder-style rows for Pareto / scaling demos (not real silicon). */

export type AdderDemoRow = {
  architecture: string;
  bitWidth: number;
  fmaxMhz: number;
  powerMw: number;
  areaUm2: number;
};

export const ADDER_DEMO_ROWS: AdderDemoRow[] = [
  { architecture: "rca", bitWidth: 32, fmaxMhz: 420, powerMw: 2.1, areaUm2: 2100 },
  { architecture: "rca", bitWidth: 64, fmaxMhz: 310, powerMw: 3.8, areaUm2: 4100 },
  { architecture: "cla", bitWidth: 32, fmaxMhz: 680, powerMw: 3.2, areaUm2: 3400 },
  { architecture: "cla", bitWidth: 64, fmaxMhz: 520, powerMw: 5.9, areaUm2: 6500 },
  { architecture: "kogge_stone", bitWidth: 32, fmaxMhz: 920, powerMw: 4.8, areaUm2: 5200 },
  { architecture: "kogge_stone", bitWidth: 64, fmaxMhz: 780, powerMw: 8.4, areaUm2: 9800 },
  { architecture: "brent_kung", bitWidth: 32, fmaxMhz: 850, powerMw: 4.1, areaUm2: 4800 },
  { architecture: "brent_kung", bitWidth: 64, fmaxMhz: 710, powerMw: 7.2, areaUm2: 9100 },
];

/** Saturated hues that read well on light backgrounds (Apple-like system tones). */
const colors: Record<string, string> = {
  rca: "#0071e3",
  cla: "#34c759",
  kogge_stone: "#ff9500",
  brent_kung: "#af52de",
};

export function architectureColor(arch: string): string {
  return colors[arch] ?? "#86868b";
}

/** Stable row order for matrices and grouped bars (matches `colors` keys used in demos). */
export const DEMO_ARCH_ORDER: readonly string[] = [
  "rca",
  "cla",
  "kogge_stone",
  "brent_kung",
];

export const DEMO_BIT_WIDTHS: readonly number[] = [32, 64];

/** Human-readable label for legend / category axes (e.g. `kogge_stone` → Kogge Stone). */
export function formatArchLabel(arch: string): string {
  return arch
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Rows for a single bit width, ordered by `DEMO_ARCH_ORDER`. */
export function rowsByBitWidthOrdered(bitWidth: number): AdderDemoRow[] {
  const byArch = new Map(
    ADDER_DEMO_ROWS.filter((r) => r.bitWidth === bitWidth).map((r) => [r.architecture, r]),
  );
  return DEMO_ARCH_ORDER.map((a) => byArch.get(a)).filter((r): r is AdderDemoRow => r != null);
}

/**
 * Fmax (MHz) grid: rows = architectures (`DEMO_ARCH_ORDER`), columns = `DEMO_BIT_WIDTHS`.
 */
export function fmaxMhzHeatmapGrid(): { z: number[][]; colLabels: string[]; rowLabels: string[] } {
  const z: number[][] = DEMO_ARCH_ORDER.map((arch) =>
    DEMO_BIT_WIDTHS.map((bw) => {
      const row = ADDER_DEMO_ROWS.find((r) => r.architecture === arch && r.bitWidth === bw);
      return row?.fmaxMhz ?? 0;
    }),
  );
  return {
    z,
    colLabels: DEMO_BIT_WIDTHS.map((bw) => `${bw}`),
    rowLabels: DEMO_ARCH_ORDER.map(formatArchLabel),
  };
}

/** Root label shared by hierarchy charts (treemap / sunburst). */
export const PPA_ROOT_LABEL = "PPA demo";

/**
 * Plotly treemap / sunburst flat encoding: root + one leaf per design.
 * Values default to die area (µm²); use `powerMw` for power-weighted tiles.
 */
export function ppaTreemapFlat(
  valueKey: "areaUm2" | "powerMw" = "areaUm2",
): { labels: string[]; parents: string[]; values: number[] } {
  const root = PPA_ROOT_LABEL;
  const leafLabels = ADDER_DEMO_ROWS.map(
    (r) => `${formatArchLabel(r.architecture)} · ${r.bitWidth}b`,
  );
  const labels = [root, ...leafLabels];
  const parents = ["", ...ADDER_DEMO_ROWS.map(() => root)];
  const sum = ADDER_DEMO_ROWS.reduce((s, r) => s + r[valueKey], 0);
  const values = [sum, ...ADDER_DEMO_ROWS.map((r) => r[valueKey])];
  return { labels, parents, values };
}

/**
 * ECharts sunburst / treemap tree: architecture → bit-width leaves.
 */
export function ppaHierarchyTree(
  valueKey: "areaUm2" | "powerMw" = "areaUm2",
): {
  name: string;
  children: {
    name: string;
    itemStyle: { color: string };
    children: { name: string; value: number }[];
  }[];
} {
  return {
    name: PPA_ROOT_LABEL,
    children: DEMO_ARCH_ORDER.map((arch) => {
      const rows = ADDER_DEMO_ROWS.filter((r) => r.architecture === arch);
      return {
        name: formatArchLabel(arch),
        itemStyle: { color: architectureColor(arch) },
        children: rows.map((r) => ({
          name: `${r.bitWidth}b`,
          value: r[valueKey],
        })),
      };
    }),
  };
}

/** Each design links to a 32b or 64b “pool” node; link value = power (mW). */
export function plotlySankeyPowerByBitwidth(): {
  labels: string[];
  source: number[];
  target: number[];
  value: number[];
} {
  const rows = ADDER_DEMO_ROWS;
  const n = rows.length;
  const pool32 = n;
  const pool64 = n + 1;
  const labels = [
    ...rows.map((r) => `${formatArchLabel(r.architecture)} ${r.bitWidth}b`),
    "32-bit pool (Σ power)",
    "64-bit pool (Σ power)",
  ];
  const source: number[] = [];
  const target: number[] = [];
  const value: number[] = [];
  for (let i = 0; i < n; i++) {
    source.push(i);
    target.push(rows[i].bitWidth === 32 ? pool32 : pool64);
    value.push(rows[i].powerMw);
  }
  return { labels, source, target, value };
}

/**
 * Synthetic whiskers around 64b power for boxplot demos (illustrative only).
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

/** Funnel stages sorted by Fmax (MHz), for throughput-style analytics demos. */
export function funnelStepsByFmax(): {
  name: string;
  value: number;
  architecture: string;
}[] {
  return [...ADDER_DEMO_ROWS]
    .sort((a, b) => b.fmaxMhz - a.fmaxMhz)
    .map((r) => ({
      name: `${formatArchLabel(r.architecture)} ${r.bitWidth}b`,
      value: r.fmaxMhz,
      architecture: r.architecture,
    }));
}
