/** Shared row shape for design metrics charts (source: `data/*.json` → generated TS). */

export type DesignRow = {
  architecture: string;
  bitWidth: number;
  fmaxMhz: number;
  powerMw: number;
  areaUm2: number;
  /** Block / dataset name from the JSON file (e.g. adder, voter, cordic). */
  designFamily?: string;
};
