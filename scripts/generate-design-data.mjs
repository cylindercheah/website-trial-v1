/**
 * Merges every `data/*.json` file into `src/data/generatedDesignRows.ts`.
 *
 * Discovery: all non-hidden `*.json` in `data/` (sorted by filename). Add a new
 * dataset by dropping `my_block.json` in `data/` — no script list to update.
 *
 * Each file may be either a JSON array of rows or `{ "rows": [ ... ] }`.
 * Rows are tagged with `designFamily` from the filename (stem) unless already set.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data");
const outFile = path.join(root, "src", "data", "generatedDesignRows.ts");

/**
 * @param {string} dir
 * @returns {string[]} basenames e.g. ["adder.json", "parity.json"]
 */
function listDataJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".json") && !name.startsWith("."))
    .sort((a, b) => a.localeCompare(b, "en"));
}

/** JSON key `processNode` holds the technology node id (nm label or kit name). */
const REQUIRED_KEYS = [
  "architecture",
  "bitWidth",
  "processNode",
  "fmaxMhz",
  "powerMw",
  "areaUm2",
];

/**
 * Effective feature size (nm) per `processNode`. Keep in sync with `synthesize-design-json.mjs`.
 * @type {Record<string, number>}
 */
const EFFECTIVE_NM_FALLBACK = {
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

/** Named kit ids (not plain Nnm labels). Keep in sync with `synthesize-design-json.mjs`. */
const NAMED_KIT_IDS_FALLBACK = new Set(["gf180", "sky130", "ihpsg13g2"]);

/**
 * @param {string} processNode
 * @returns {number | undefined}
 */
function effectiveNmForProcessNode(processNode) {
  if (EFFECTIVE_NM_FALLBACK[processNode] !== undefined) {
    return EFFECTIVE_NM_FALLBACK[processNode];
  }
  const m = /^(\d+)nm$/i.exec(processNode);
  if (m) return parseInt(m[1], 10);
  return undefined;
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} processNode
 * @returns {string}
 */
function canonicalTechnologyFromRow(row, processNode) {
  if (row.canonicalTechnology != null && String(row.canonicalTechnology).trim() !== "") {
    return String(row.canonicalTechnology);
  }
  const nm = effectiveNmForProcessNode(processNode);
  if (nm !== undefined) return `${nm}nm`;
  return processNode;
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} processNode
 * @returns {boolean}
 */
function isNamedPdkFromRow(row, processNode) {
  if (typeof row.isNamedPdk === "boolean") return row.isNamedPdk;
  if (NAMED_KIT_IDS_FALLBACK.has(processNode)) return true;
  return !/^\d+nm$/i.test(processNode);
}

/**
 * @param {unknown} row
 * @param {string} sourceFile
 * @returns {asserts row is Record<string, unknown>}
 */
function assertRow(row, sourceFile) {
  if (row === null || typeof row !== "object" || Array.isArray(row)) {
    throw new Error(`${sourceFile}: each row must be an object`);
  }
  for (const k of REQUIRED_KEYS) {
    if (row[k] === undefined) {
      throw new Error(`${sourceFile}: row missing required field "${k}"`);
    }
  }
}

/**
 * @param {string} filePath
 * @returns {unknown[]}
 */
function readRowsArray(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray(data.rows)) return data.rows;
  throw new Error(
    `${path.basename(filePath)}: expected a JSON array or an object with a "rows" array`,
  );
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} family
 */
function normalizeRow(row, family) {
  const processNode = String(row.processNode);
  return {
    architecture: String(row.architecture),
    bitWidth: Number(row.bitWidth),
    processNode,
    canonicalTechnology: canonicalTechnologyFromRow(row, processNode),
    isNamedPdk: isNamedPdkFromRow(row, processNode),
    fmaxMhz: Number(row.fmaxMhz),
    powerMw: Number(row.powerMw),
    areaUm2: Number(row.areaUm2),
    designFamily: row.designFamily != null ? String(row.designFamily) : family,
  };
}

/**
 * @param {ReturnType<typeof normalizeRow>} r
 */
function formatTsRow(r) {
  const parts = [
    `architecture: ${JSON.stringify(r.architecture)}`,
    `bitWidth: ${r.bitWidth}`,
    `processNode: ${JSON.stringify(r.processNode)}`,
    `canonicalTechnology: ${JSON.stringify(r.canonicalTechnology)}`,
    `isNamedPdk: ${r.isNamedPdk}`,
    `fmaxMhz: ${r.fmaxMhz}`,
    `powerMw: ${r.powerMw}`,
    `areaUm2: ${r.areaUm2}`,
    `designFamily: ${JSON.stringify(r.designFamily)}`,
  ];
  return `  { ${parts.join(", ")} }`;
}

/**
 * @param {ReturnType<typeof normalizeRow>[]} rows
 * @returns {string[]}
 */
function uniqueFamiliesSorted(rows) {
  const set = new Set();
  for (const r of rows) {
    if (r.designFamily) set.add(r.designFamily);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "en"));
}

/**
 * @param {string} s
 * @returns {string}
 */
function tsStringLiteral(s) {
  return JSON.stringify(s);
}

function main() {
  const inputFiles = listDataJsonFiles(dataDir);
  const combined = [];

  for (const name of inputFiles) {
    const filePath = path.join(dataDir, name);
    const family = path.basename(name, ".json");
    const rows = readRowsArray(filePath);
    for (const row of rows) {
      assertRow(row, name);
      combined.push(normalizeRow(row, family));
    }
  }

  if (combined.length === 0) {
    throw new Error(
      `[generate-design-data] no rows found: add one or more *.json files under ${dataDir}`,
    );
  }

  const families = uniqueFamiliesSorted(combined);
  if (families.length === 0) {
    throw new Error(`[generate-design-data] rows missing designFamily after normalize`);
  }

  const familiesTs = families.map((f) => tsStringLiteral(f)).join(", ");
  const sourceList = inputFiles.length ? inputFiles.join(", ") : "(none)";

  const header = `/**
 * Combined design rows from all \`data/*.json\` files (${sourceList}).
 * AUTO-GENERATED by scripts/generate-design-data.mjs. Run: npm run generate:data
 * Do not edit by hand; add or edit JSON under /data instead.
 */

import type { DesignRow } from "./designTypes";

/** Distinct \`designFamily\` values present in the merged rows (sorted). */
export const DESIGN_FAMILIES = [${familiesTs}] as const;

export type DesignFamilyId = (typeof DESIGN_FAMILIES)[number];

export const DESIGN_ROWS: DesignRow[] = [
${combined.map(formatTsRow).join(",\n")}
];
`;

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, header, "utf8");
  console.log(
    `[generate-design-data] merged ${inputFiles.length} file(s) → ${combined.length} rows, families: ${families.join(", ")} → ${path.relative(root, outFile)}`,
  );
}

main();
