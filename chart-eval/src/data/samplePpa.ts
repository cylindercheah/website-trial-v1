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

const colors: Record<string, string> = {
  rca: "#7eb6ff",
  cla: "#5ce1a3",
  kogge_stone: "#ffb84d",
  brent_kung: "#d4a5ff",
};

export function architectureColor(arch: string): string {
  return colors[arch] ?? "#94a3b8";
}
