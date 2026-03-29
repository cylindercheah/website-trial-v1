/** Shared row shape for design metrics charts (source: `data/*.json` → generated TS). */

export type DesignRow = {
  architecture: string;
  bitWidth: number;
  /** Technology node: nm label (e.g. 7nm) or kit id (e.g. sky130). JSON field name stays `processNode`. */
  processNode: string;
  /**
   * Canonical technology for grouping and comparison: plain nm label (e.g. 130nm). Named kits that
   * share the same effective node point here (e.g. sky130, ihpsg13g2, and 130nm → 130nm).
   */
  canonicalTechnology: string;
  /** True when `processNode` is a named PDK/kit id rather than a numeric nm label. */
  isNamedPdk: boolean;
  fmaxMhz: number;
  powerMw: number;
  areaUm2: number;
  /** Category id: merged JSON file stem, or overridden per row (see `generate-design-data.mjs`). */
  category?: string;
};
