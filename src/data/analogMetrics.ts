import type {
  AnalogBenchmarkRow,
  AnalogMetricKey,
  AnalogReferenceType,
  AnalogTrimState,
} from "./analogTypes";
import { ANALOG_VOLTAGE_REF_ROWS } from "./analogVoltageRefRows";

export type AnalogMetricDef = {
  key: AnalogMetricKey;
  label: string;
  unit: string;
};

export const ANALOG_METRICS: readonly AnalogMetricDef[] = [
  { key: "powerPw", label: "Power", unit: "pW" },
  { key: "vrefMv", label: "VREF", unit: "mV" },
  { key: "vminV", label: "Minimum Supply", unit: "V" },
  { key: "sigmaOverMuPct", label: "sigma/mu", unit: "%" },
  { key: "psrrDb", label: "PSRR", unit: "dB" },
  { key: "lsPctPerV", label: "Line Sensitivity", unit: "%/V" },
  { key: "capPf", label: "Capacitor", unit: "pF" },
  { key: "tcPpmPerC", label: "Untrimmed TC", unit: "ppm/C" },
  { key: "sizeUm2", label: "Area", unit: "um^2" },
] as const;

export const ANALOG_SCATTER_METRIC_KEYS: readonly AnalogMetricKey[] = [
  "powerPw",
  "vminV",
  "tcPpmPerC",
  "psrrDb",
  "sigmaOverMuPct",
  "lsPctPerV",
  "sizeUm2",
  "vrefMv",
] as const;

export type AnalogFilterState = {
  types: AnalogReferenceType[];
  yearMin: number;
  yearMax: number;
  technologyNm: number | "all";
  includeSimulated: boolean;
  trimState: "all" | "trimmed" | "untrimmed";
};

export type AnalogSortKey = "year" | "type" | "technologyNm" | "powerPw" | "vminV" | "tcPpmPerC";

export type AnalogSortState = {
  key: AnalogSortKey;
  direction: "asc" | "desc";
};

export function metricLabel(key: AnalogMetricKey): string {
  const m = ANALOG_METRICS.find((row) => row.key === key);
  return m ? `${m.label} (${m.unit})` : key;
}

export function metricValue(row: AnalogBenchmarkRow, key: AnalogMetricKey): number | null {
  return row[key];
}

export function metricIsPresent(row: AnalogBenchmarkRow, key: AnalogMetricKey): boolean {
  return typeof metricValue(row, key) === "number";
}

export function hasMetrics(row: AnalogBenchmarkRow, keys: readonly AnalogMetricKey[]): boolean {
  return keys.every((k) => metricIsPresent(row, k));
}

export function analogYearBounds(rows: readonly AnalogBenchmarkRow[]): { min: number; max: number } {
  const years = rows.map((r) => r.year);
  return { min: Math.min(...years), max: Math.max(...years) };
}

export function analogTechnologyOptions(rows: readonly AnalogBenchmarkRow[]): number[] {
  return [...new Set(rows.map((r) => r.technologyNm))].sort((a, b) => a - b);
}

function rowMatchesTrimFilter(
  rowTrimState: AnalogTrimState,
  filter: AnalogFilterState["trimState"],
): boolean {
  if (filter === "all") return true;
  if (filter === "trimmed") return rowTrimState === "trimmed" || rowTrimState === "mixed";
  return rowTrimState === "untrimmed" || rowTrimState === "mixed";
}

export function applyAnalogFilters(
  rows: readonly AnalogBenchmarkRow[],
  filter: AnalogFilterState,
): AnalogBenchmarkRow[] {
  return rows.filter((row) => {
    if (!filter.types.includes(row.type)) return false;
    if (row.year < filter.yearMin || row.year > filter.yearMax) return false;
    if (filter.technologyNm !== "all" && row.technologyNm !== filter.technologyNm) return false;
    if (!filter.includeSimulated && row.resultKind === "simulated") return false;
    if (!rowMatchesTrimFilter(row.trimState, filter.trimState)) return false;
    return true;
  });
}

export function compareNullableNumber(
  a: number | null,
  b: number | null,
  direction: "asc" | "desc",
): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return direction === "asc" ? a - b : b - a;
}

export function sortAnalogRows(
  rows: readonly AnalogBenchmarkRow[],
  sort: AnalogSortState,
): AnalogBenchmarkRow[] {
  const out = [...rows];
  out.sort((a, b) => {
    if (sort.key === "type") {
      return sort.direction === "asc"
        ? a.type.localeCompare(b.type)
        : b.type.localeCompare(a.type);
    }
    if (sort.key === "year" || sort.key === "technologyNm") {
      const av = a[sort.key];
      const bv = b[sort.key];
      return sort.direction === "asc" ? av - bv : bv - av;
    }
    return compareNullableNumber(a[sort.key], b[sort.key], sort.direction);
  });
  return out;
}

export function buildDefaultAnalogFilters(): AnalogFilterState {
  const bounds = analogYearBounds(ANALOG_VOLTAGE_REF_ROWS);
  return {
    types: ["2T", "SCM", "Hybrid"],
    yearMin: bounds.min,
    yearMax: bounds.max,
    technologyNm: "all",
    includeSimulated: true,
    trimState: "all",
  };
}

export function rowQualityBadges(row: AnalogBenchmarkRow): string[] {
  const badges: string[] = [];
  if (row.resultKind === "simulated") badges.push("sim");
  if (row.resultKind === "mixed") badges.push("mixed");
  if (row.trimState === "trimmed") badges.push("trimmed");
  if (row.trimState === "untrimmed") badges.push("untrimmed");
  if (row.trimState === "mixed") badges.push("trim-mixed");
  if (row.psrrDb === null) badges.push("psrr-n/a");
  if (row.tcPpmPerC === null) badges.push("tc-n/a");
  return badges;
}

