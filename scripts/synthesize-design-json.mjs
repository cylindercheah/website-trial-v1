/**
 * Writes one `data/<name>.json` per entry in `FAMILY_CONFIG` (synthetic metrics:
 * bit widths, five architectures per family, technology nodes (nm + kit ids).
 *
 * To add a generated family: extend `FAMILY_CONFIG`, then run `npm run generate:data`.
 * For hand-authored datasets, add any other `data/*.json` file; the merge step picks
 * it up automatically (see `generate-design-data.mjs`).
 *
 * Run: node scripts/synthesize-design-json.mjs
 * (Invoked automatically from `npm run generate:data`.)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data");

/** @type {readonly number[]} */
const BIT_WIDTHS = [8, 16, 32, 64, 128, 256, 1024];

/**
 * Finer nodes near leading edge, coarser in mature nodes, plus named kit ids.
 * @type {readonly string[]}
 */
const TECHNOLOGY_LABELS = [
  "3nm",
  "5nm",
  "7nm",
  "10nm",
  "14nm",
  "16nm",
  "22nm",
  "28nm",
  "40nm",
  "65nm",
  "90nm",
  "130nm",
  "180nm",
  "250nm",
  "350nm",
  "gf180",
  "sky130",
  "ihpsg13g2",
];

/** Map technology label to an effective feature size (nm) for scaling. */
const EFFECTIVE_NM = {
  "3nm": 3,
  "5nm": 5,
  "7nm": 7,
  "10nm": 10,
  "14nm": 14,
  "16nm": 16,
  "22nm": 22,
  "28nm": 28,
  "40nm": 40,
  "65nm": 65,
  "90nm": 90,
  "130nm": 130,
  "180nm": 180,
  "250nm": 250,
  "350nm": 350,
  gf180: 180,
  sky130: 130,
  ihpsg13g2: 130,
};

/** Kit-style `processNode` ids (not plain Nnm labels). Keep in sync with `design.ts` TECH_KIT_IDS. */
const NAMED_PDK_IDS = new Set(["gf180", "sky130", "ihpsg13g2"]);

/**
 * @param {string} label
 * @returns {number}
 */
function effectiveNm(label) {
  const v = EFFECTIVE_NM[label];
  if (v === undefined) {
    throw new Error(`Unknown technology label: ${label}`);
  }
  return v;
}

/**
 * @param {string} technology
 * @returns {string}
 */
function canonicalTechnologyLabel(technology) {
  return `${effectiveNm(technology)}nm`;
}

/**
 * @param {string} technology
 * @returns {boolean}
 */
function isNamedPdk(technology) {
  return NAMED_PDK_IDS.has(technology);
}

/**
 * @param {number} x
 * @returns {number}
 */
function round3(x) {
  return Math.round(x * 1000) / 1000;
}

/**
 * @typedef {{ f: number; p: number; a: number }} ArchFactors
 * @typedef {{ baseF: number; baseP: number; baseA: number; areaBwPow: number; fmaxBwPow: number }} FamilyBase
 */

/**
 * @param {object} args
 * @param {string} args.arch
 * @param {number} args.bw
 * @param {string} args.technology
 * @param {ArchFactors} args.archFactors
 * @param {FamilyBase} args.familyBase
 */
function synthRow({ arch, bw, technology, archFactors, familyBase }) {
  const nm = effectiveNm(technology);
  const refNm = 7;
  const bwRef = 32;

  const procF = Math.sqrt(refNm / nm);
  const procA = (nm / refNm) ** 1.65;
  const bwRatio = bw / bwRef;

  const { areaBwPow, fmaxBwPow } = familyBase;

  let fmax =
    familyBase.baseF * archFactors.f * procF * bwRatio ** fmaxBwPow;
  let area = familyBase.baseA * archFactors.a * procA * bwRatio ** areaBwPow;
  let power =
    familyBase.baseP *
    archFactors.p *
    procF *
    bwRatio ** (areaBwPow * 0.55 + fmaxBwPow * 0.35);

  fmax = Math.max(12, Math.min(3200, fmax));
  area = Math.max(80, area);
  power = Math.max(0.05, power);

  return {
    architecture: arch,
    bitWidth: bw,
    processNode: technology,
    canonicalTechnology: canonicalTechnologyLabel(technology),
    isNamedPdk: isNamedPdk(technology),
    fmaxMhz: round3(fmax),
    powerMw: round3(power),
    areaUm2: round3(area),
  };
}

/** @type {Record<string, ArchFactors>} */
const ADDER_ARCH = {
  rca: { f: 0.52, p: 0.42, a: 0.48 },
  cla: { f: 1.0, p: 0.82, a: 0.72 },
  carry_skip: { f: 0.78, p: 0.62, a: 0.58 },
  carry_select: { f: 1.15, p: 1.28, a: 1.42 },
  ling: { f: 1.05, p: 0.92, a: 0.85 },
};

/** @type {Record<string, ArchFactors>} */
const VOTER_ARCH = {
  cell_majority: { f: 1.12, p: 0.55, a: 0.38 },
  tmr_vote: { f: 0.95, p: 0.72, a: 0.52 },
  cascaded_vote: { f: 0.82, p: 0.68, a: 0.62 },
  weighted_vote: { f: 0.88, p: 0.78, a: 0.71 },
  tree_vote: { f: 1.0, p: 0.95, a: 0.88 },
};

/** @type {Record<string, ArchFactors>} */
const CORDIC_ARCH = {
  iterative_cordic: { f: 0.62, p: 0.48, a: 0.42 },
  pipeline_cordic: { f: 1.08, p: 1.12, a: 1.25 },
  unfolded_cordic: { f: 1.18, p: 1.35, a: 1.55 },
  bit_serial_cordic: { f: 0.45, p: 0.32, a: 0.28 },
  merged_alu_cordic: { f: 0.88, p: 0.75, a: 0.68 },
};

/** @type {Record<string, { arch: Record<string, ArchFactors>; base: FamilyBase }>} */
const FAMILY_CONFIG = {
  adder: {
    arch: ADDER_ARCH,
    base: {
      baseF: 620,
      baseP: 2.8,
      baseA: 3100,
      areaBwPow: 1.05,
      fmaxBwPow: -0.82,
    },
  },
  voter: {
    arch: VOTER_ARCH,
    base: {
      baseF: 780,
      baseP: 1.9,
      baseA: 2100,
      areaBwPow: 0.92,
      fmaxBwPow: -0.35,
    },
  },
  cordic: {
    arch: CORDIC_ARCH,
    base: {
      baseF: 420,
      baseP: 3.4,
      baseA: 4800,
      areaBwPow: 1.12,
      fmaxBwPow: -0.55,
    },
  },
};

/**
 * @param {string} familyKey
 * @returns {object[]}
 */
function buildFamilyRows(familyKey) {
  const { arch, base } = FAMILY_CONFIG[familyKey];
  const rows = [];
  for (const archName of Object.keys(arch)) {
    for (const bw of BIT_WIDTHS) {
      for (const technology of TECHNOLOGY_LABELS) {
        rows.push(
          synthRow({
            arch: archName,
            bw,
            technology,
            archFactors: arch[archName],
            familyBase: base,
          }),
        );
      }
    }
  }
  return rows;
}

function main() {
  fs.mkdirSync(dataDir, { recursive: true });
  const synthKeys = Object.keys(FAMILY_CONFIG);
  for (const key of synthKeys) {
    const name = `${key}.json`;
    const rows = buildFamilyRows(key);
    const out = path.join(dataDir, name);
    fs.writeFileSync(out, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
    console.log(`[synthesize-design-json] wrote ${rows.length} rows → data/${name}`);
  }
}

main();
