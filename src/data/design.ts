/** Design-metric rows for Pareto / scaling charts (not real silicon). */

import type { DesignRow } from "./designTypes";
import {
  DEFAULT_TECHNOLOGY_NODE,
  DESIGN_FAMILIES,
  DESIGN_ROWS,
  NAMED_KIT_PROCESS_NODES,
  type DesignFamilyId,
} from "./generatedDesignRows";

export type { DesignRow } from "./designTypes";
export type { DesignFamilyId } from "./generatedDesignRows";
export {
  DEFAULT_TECHNOLOGY_NODE,
  DESIGN_FAMILIES,
  DESIGN_ROWS,
  NAMED_KIT_PROCESS_NODES,
};

/** Rows whose `designFamily` matches (empty if field missing). */
export function designRowsForFamily(
  rows: readonly DesignRow[],
  family: DesignFamilyId,
): DesignRow[] {
  return rows.filter((r) => r.designFamily === family);
}

/** Architectures in first-seen order within the given row set. */
export function designArchOrderForRows(rows: readonly DesignRow[]): string[] {
  return uniqueArchitecturesInOrder(rows);
}

/** Sorted unique bit widths in the given row set. */
export function designBitWidthsForRows(rows: readonly DesignRow[]): number[] {
  return uniqueBitWidthsSorted(rows);
}

/** First-seen order of architectures across combined JSON datasets. */
function uniqueArchitecturesInOrder(rows: readonly DesignRow[]): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const r of rows) {
    if (!seen.has(r.architecture)) {
      seen.add(r.architecture);
      order.push(r.architecture);
    }
  }
  return order;
}

/** Sorted unique bit widths present in the data. */
function uniqueBitWidthsSorted(rows: readonly DesignRow[]): number[] {
  return [...new Set(rows.map((r) => r.bitWidth))].sort((a, b) => a - b);
}

/** Named kit ids from \`data/technology-map.json\` — sort after numeric nm labels. */
const NAMED_KIT_ID_SET = new Set<string>(NAMED_KIT_PROCESS_NODES);

function uniqueTechnologyNodesSorted(rows: readonly DesignRow[]): string[] {
  const labels = [...new Set(rows.map((r) => r.processNode))];
  const numeric = labels.filter((l) => !NAMED_KIT_ID_SET.has(l));
  const kits = labels.filter((l) => NAMED_KIT_ID_SET.has(l));
  numeric.sort((a, b) => {
    const na = parseInt(a.replace(/nm$/i, ""), 10);
    const nb = parseInt(b.replace(/nm$/i, ""), 10);
    return na - nb;
  });
  kits.sort();
  return [...numeric, ...kits];
}

/** Rows matching one technology node (`row.processNode`). */
export function designRowsForTechnology(
  rows: readonly DesignRow[],
  technologyNode: string = DEFAULT_TECHNOLOGY_NODE,
): DesignRow[] {
  return rows.filter((r) => r.processNode === technologyNode);
}

/** Single row for (architecture, bit width, technology node), if present in merged data. */
export function findDesignRow(
  architecture: string,
  bitWidth: number,
  technologyNode: string,
): DesignRow | undefined {
  return DESIGN_ROWS.find(
    (r) =>
      r.architecture === architecture &&
      r.bitWidth === bitWidth &&
      r.processNode === technologyNode,
  );
}

/**
 * Dark-tone RGB series palette (deep red/blue/magenta/cyan plus dark green, mustard yellow,
 * dark orange, olive). Shared across scatter, bar, donut, treemap, 3D.
 */
const ARCHITECTURE_SERIES_RGB: readonly string[] = [
  "rgb(175, 0, 0)",
  "rgb(0, 95, 48)",
  "rgb(0, 0, 165)",
  "rgb(145, 118, 12)",
  "rgb(125, 0, 105)",
  "rgb(0, 105, 118)",
  "rgb(160, 78, 0)",
  "rgb(72, 0, 132)",
  "rgb(0, 82, 145)",
  "rgb(145, 0, 78)",
  "rgb(88, 118, 0)",
  "rgb(0, 108, 72)",
  "rgb(130, 0, 0)",
  "rgb(0, 72, 38)",
  "rgb(0, 0, 118)",
  "rgb(138, 92, 0)",
];

/** Color for the i-th series (donut slices by category index, etc.). */
export function seriesRgbByIndex(i: number): string {
  const n = ARCHITECTURE_SERIES_RGB.length;
  return ARCHITECTURE_SERIES_RGB[((i % n) + n) % n];
}

/** Stable row order for matrices and grouped bars (first appearance in merged JSON order). */
export const DESIGN_ARCH_ORDER: readonly string[] = uniqueArchitecturesInOrder(DESIGN_ROWS);

function archPaletteIndex(arch: string): number {
  const i = DESIGN_ARCH_ORDER.indexOf(arch);
  if (i >= 0) return i;
  let h = 0;
  for (let c = 0; c < arch.length; c += 1) {
    h = (h * 31 + arch.charCodeAt(c)) >>> 0;
  }
  return h;
}

export function architectureColor(arch: string): string {
  return seriesRgbByIndex(archPaletteIndex(arch));
}

export const DESIGN_BIT_WIDTHS: readonly number[] = uniqueBitWidthsSorted(DESIGN_ROWS);

export const DESIGN_TECHNOLOGY_NODES: readonly string[] = uniqueTechnologyNodesSorted(DESIGN_ROWS);

/** Technology nodes present in the row set (same ordering as `DESIGN_TECHNOLOGY_NODES`). */
export function designTechnologyNodesForRows(rows: readonly DesignRow[]): string[] {
  return uniqueTechnologyNodesSorted(rows);
}

/** Human-readable label for legend / category axes (e.g. `kogge_stone` → Kogge Stone). */
export function formatArchLabel(arch: string): string {
  return arch
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Rows for a single bit width and technology node, ordered by `archOrder`. */
export function rowsByBitWidthOrderedIn(
  familyRows: readonly DesignRow[],
  archOrder: readonly string[],
  bitWidth: number,
  technologyNode: string = DEFAULT_TECHNOLOGY_NODE,
): DesignRow[] {
  const slice = designRowsForTechnology(familyRows, technologyNode);
  const byArch = new Map(
    slice.filter((r) => r.bitWidth === bitWidth).map((r) => [r.architecture, r]),
  );
  return archOrder.map((a) => byArch.get(a)).filter((r): r is DesignRow => r != null);
}

/** Root label shared by hierarchy charts (treemap / sunburst). */
export const DESIGN_ROOT_LABEL = "Design";
