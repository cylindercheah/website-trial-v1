/**
 * Merges row JSON in `data/` into `src/data/generatedDesignRows.ts`.
 *
 * Row files: every `data/*.json` except reserved config files (sorted by name).
 * Add a dataset with `my_block.json` — no script list to update.
 *
 * Technology defaults and `processNode` → effective nm mappings live in
 * `data/technology-map.json` (not merged as rows).
 *
 * Each row file may be:
 * - a JSON array of design objects `[{...}, {...}]` (all designs in one file), or
 * - `{ "rows": [ ... ] }` (same as above), or
 * - a single design object `{ ... }` (one design per file).
 * Rows are tagged with `category` from the filename (stem) unless `category` or legacy `designFamily`
 * is set on the object.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data");
const outFile = path.join(root, "src", "data", "generatedDesignRows.ts");

/** Basenames under `data/` that are config only, not design row JSON. */
const DATA_CONFIG_JSON = new Set(["technology-map.json"]);

/**
 * @param {string} dir
 * @returns {string[]} basenames e.g. ["adder.json", "parity.json"]
 */
function listDataJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter(
      (name) =>
        name.endsWith(".json") && !name.startsWith(".") && !DATA_CONFIG_JSON.has(name),
    )
    .sort((a, b) => a.localeCompare(b, "en"));
}

/**
 * @returns {{
 *   defaultProcessNode: string;
 *   effectiveNmByProcessNode: Record<string, number>;
 *   namedKitIds: Set<string>;
 * }}
 */
function loadTechnologyMap(dir) {
  const filePath = path.join(dir, "technology-map.json");
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `[generate-design-data] missing ${filePath} (technology defaults and processNode mappings)`,
    );
  }
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    throw new Error(`[generate-design-data] invalid JSON in ${filePath}: ${e}`);
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`[generate-design-data] ${filePath}: expected a JSON object`);
  }
  const defaultProcessNode = raw.defaultProcessNode;
  if (typeof defaultProcessNode !== "string" || !defaultProcessNode.trim()) {
    throw new Error(`[generate-design-data] ${filePath}: require string "defaultProcessNode"`);
  }
  const effectiveNmByProcessNode = raw.effectiveNmByProcessNode;
  if (
    effectiveNmByProcessNode === null ||
    typeof effectiveNmByProcessNode !== "object" ||
    Array.isArray(effectiveNmByProcessNode)
  ) {
    throw new Error(`[generate-design-data] ${filePath}: require object "effectiveNmByProcessNode"`);
  }
  const namedKitIds = raw.namedKitIds;
  if (!Array.isArray(namedKitIds) || !namedKitIds.every((x) => typeof x === "string")) {
    throw new Error(`[generate-design-data] ${filePath}: require string[] "namedKitIds"`);
  }
  /** @type {Record<string, number>} */
  const effectiveMap = {};
  for (const [k, v] of Object.entries(effectiveNmByProcessNode)) {
    if (typeof v !== "number" || !Number.isFinite(v)) {
      throw new Error(
        `[generate-design-data] ${filePath}: effectiveNmByProcessNode["${k}"] must be a finite number`,
      );
    }
    effectiveMap[k] = v;
  }
  return {
    defaultProcessNode: defaultProcessNode.trim(),
    effectiveNmByProcessNode: effectiveMap,
    namedKitIds: new Set(namedKitIds.map((s) => s.trim()).filter(Boolean)),
  };
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
 * @param {Record<string, number>} effectiveNmByProcessNode
 * @param {string} processNode
 * @returns {number | undefined}
 */
function effectiveNmForProcessNode(effectiveNmByProcessNode, processNode) {
  if (effectiveNmByProcessNode[processNode] !== undefined) {
    return effectiveNmByProcessNode[processNode];
  }
  const m = /^(\d+)nm$/i.exec(processNode);
  if (m) return parseInt(m[1], 10);
  return undefined;
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} processNode
 * @param {Record<string, number>} effectiveNmByProcessNode
 * @returns {string}
 */
function canonicalTechnologyFromRow(row, processNode, effectiveNmByProcessNode) {
  if (row.canonicalTechnology != null && String(row.canonicalTechnology).trim() !== "") {
    return String(row.canonicalTechnology);
  }
  const nm = effectiveNmForProcessNode(effectiveNmByProcessNode, processNode);
  if (nm !== undefined) return `${nm}nm`;
  return processNode;
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} processNode
 * @param {Set<string>} namedKitIds
 * @returns {boolean}
 */
function isNamedPdkFromRow(row, processNode, namedKitIds) {
  if (typeof row.isNamedPdk === "boolean") return row.isNamedPdk;
  if (namedKitIds.has(processNode)) return true;
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
 * Reads design row(s) from one JSON file: array, `{ rows: [...] }`, or a single row object.
 *
 * @param {string} filePath
 * @returns {unknown[]}
 */
function readRowsArray(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  const base = path.basename(filePath);
  if (Array.isArray(data)) return data;
  if (data !== null && typeof data === "object" && !Array.isArray(data)) {
    if (Object.prototype.hasOwnProperty.call(data, "rows")) {
      if (!Array.isArray(data.rows)) {
        throw new Error(`${base}: property "rows" must be an array`);
      }
      return data.rows;
    }
    return [data];
  }
  throw new Error(
    `${base}: expected a JSON array, an object with a "rows" array, or one design object`,
  );
}

/**
 * Category id: explicit `category`, else legacy `designFamily`, else JSON file stem.
 *
 * @param {Record<string, unknown>} row
 * @param {string} fileStem
 */
function categoryFromRow(row, fileStem) {
  if (row.category != null) return String(row.category);
  if (row.designFamily != null) return String(row.designFamily);
  return fileStem;
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} fileStem
 * @param {{
 *   effectiveNmByProcessNode: Record<string, number>;
 *   namedKitIds: Set<string>;
 * }} tech
 */
function normalizeRow(row, fileStem, tech) {
  const processNode = String(row.processNode);
  return {
    architecture: String(row.architecture),
    bitWidth: Number(row.bitWidth),
    processNode,
    canonicalTechnology: canonicalTechnologyFromRow(row, processNode, tech.effectiveNmByProcessNode),
    isNamedPdk: isNamedPdkFromRow(row, processNode, tech.namedKitIds),
    fmaxMhz: Number(row.fmaxMhz),
    powerMw: Number(row.powerMw),
    areaUm2: Number(row.areaUm2),
    category: categoryFromRow(row, fileStem),
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
    `category: ${JSON.stringify(r.category)}`,
  ];
  return `  { ${parts.join(", ")} }`;
}

/**
 * @param {ReturnType<typeof normalizeRow>[]} rows
 * @returns {string[]}
 */
function uniqueCategoryIdsSorted(rows) {
  const set = new Set();
  for (const r of rows) {
    if (r.category) set.add(r.category);
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
  const tech = loadTechnologyMap(dataDir);
  const inputFiles = listDataJsonFiles(dataDir);
  const combined = [];

  for (const name of inputFiles) {
    const filePath = path.join(dataDir, name);
    const fileStem = path.basename(name, ".json");
    const rows = readRowsArray(filePath);
    for (const row of rows) {
      assertRow(row, name);
      combined.push(normalizeRow(row, fileStem, tech));
    }
  }

  if (combined.length === 0) {
    throw new Error(
      `[generate-design-data] no rows found: add one or more *.json files under ${dataDir}`,
    );
  }

  const categoryIds = uniqueCategoryIdsSorted(combined);
  if (categoryIds.length === 0) {
    throw new Error(`[generate-design-data] rows missing category after normalize`);
  }

  const categoryIdsTs = categoryIds.map((id) => tsStringLiteral(id)).join(", ");
  const sourceList = inputFiles.length ? inputFiles.join(", ") : "(none)";
  const namedKitSorted = [...tech.namedKitIds].sort((a, b) => a.localeCompare(b, "en"));
  const namedKitTs = namedKitSorted.map((id) => tsStringLiteral(id)).join(", ");
  const defaultNodeTs = tsStringLiteral(tech.defaultProcessNode);

  const header = `/**
 * Combined design rows from row JSON under \`data/\` (${sourceList}).
 * Technology defaults and kit ids from \`data/technology-map.json\`.
 * AUTO-GENERATED by scripts/generate-design-data.mjs. Run: npm run generate:data
 * Do not edit by hand; change JSON under /data instead.
 */

import type { DesignRow } from "./designTypes";

/** Distinct \`category\` values present in the merged rows (sorted). */
export const DESIGN_CATEGORY_IDS = [${categoryIdsTs}] as const;

export type DesignCategoryId = (typeof DESIGN_CATEGORY_IDS)[number];

/** From \`data/technology-map.json\` — UI default and row filter baseline. */
export const DEFAULT_TECHNOLOGY_NODE = ${defaultNodeTs};

/** Named PDK / kit \`processNode\` ids from \`data/technology-map.json\` (sorted). */
export const NAMED_KIT_PROCESS_NODES = [${namedKitTs}] as const;

export const DESIGN_ROWS: DesignRow[] = [
${combined.map(formatTsRow).join(",\n")}
];
`;

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, header, "utf8");
  console.log(
    `[generate-design-data] merged ${inputFiles.length} file(s) → ${combined.length} rows, categories: ${categoryIds.join(", ")} → ${path.relative(root, outFile)}`,
  );
}

main();
