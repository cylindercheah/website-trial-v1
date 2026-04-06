export type AnalogReferenceType = "2T" | "SCM" | "Hybrid";

export type AnalogResultKind = "measured" | "simulated" | "mixed";

export type AnalogTrimState = "untrimmed" | "trimmed" | "mixed" | "unknown";

export type AnalogMetricKey =
  | "powerPw"
  | "vrefMv"
  | "vminV"
  | "sigmaOverMuPct"
  | "psrrDb"
  | "lsPctPerV"
  | "capPf"
  | "tempMinC"
  | "tempMaxC"
  | "tcPpmPerC"
  | "sizeUm2";

export type AnalogMetricProvenance = {
  symbol: string;
  meaning: string;
};

export type AnalogBenchmarkRow = {
  id: string;
  type: AnalogReferenceType;
  year: number;
  refKey: string;
  referenceUrl?: string;
  technologyNm: number;
  powerPw: number | null;
  vrefMv: number | null;
  vminV: number | null;
  sigmaOverMuPct: number | null;
  psrrDb: number | null;
  psrrAtHz: number | null;
  psrrNote: string | null;
  lsPctPerV: number | null;
  capPf: number | null;
  tempMinC: number | null;
  tempMaxC: number | null;
  tcPpmPerC: number | null;
  sizeUm2: number | null;
  resultKind: AnalogResultKind;
  trimState: AnalogTrimState;
  metricProvenance: Partial<Record<AnalogMetricKey, AnalogMetricProvenance>>;
  qualityTags: string[];
  notes?: string;
};

