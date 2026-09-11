import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const VENDOR_ROOT = join(ROOT, ".vendor", "rhinelab-ui");
const OUTPUT_ROOT = join(ROOT, "public", "rhinelab");
const UPSTREAM = "https://github.com/LBEILC/RhineLabUI.git";
const UPSTREAM_COMMIT = "8799b03179a9a0ebd2611843e644a5a0530b24bf";

function run(command, args, cwd = ROOT) {
  execFileSync(command, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
}

function ensureCheckout() {
  mkdirSync(dirname(VENDOR_ROOT), { recursive: true });
  if (!existsSync(join(VENDOR_ROOT, ".git"))) {
    rmSync(VENDOR_ROOT, { recursive: true, force: true });
    run("git", ["clone", "--filter=blob:none", UPSTREAM, VENDOR_ROOT]);
  }
  run("git", ["fetch", "origin", UPSTREAM_COMMIT], VENDOR_ROOT);
  run("git", ["reset", "--hard", UPSTREAM_COMMIT], VENDOR_ROOT);
  run("git", ["clean", "-fdx"], VENDOR_ROOT);
}

function patchDataAdapter() {
  const target = join(VENDOR_ROOT, "src", "data.ts");
  writeFileSync(target, `export interface ArchiveRecord {\n  id: string;\n  title: string;\n  en: string;\n  department: string;\n  category: string;\n  date: string;\n  lead: string;\n  clearance: string;\n  abstract: string;\n  findings: string[];\n  source: string;\n}\n\nconst STORAGE_KEY = "writing-time-rhine-records";\nfunction loadRecords(): ArchiveRecord[] {\n  try {\n    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");\n    return Array.isArray(parsed) ? parsed : [];\n  } catch {\n    return [];\n  }\n}\n\nexport const records: ArchiveRecord[] = loadRecords();\nexport const archiveColumns = [...new Set(records.map((record) => record.category))];\nexport const categories = ["全部档案", ...archiveColumns];\n\nexport function columnFiles(lane: number) {\n  const category = archiveColumns[((lane % archiveColumns.length) + archiveColumns.length) % archiveColumns.length];\n  return records\n    .map((record, index) => ({ record, index }))\n    .filter(({ record }) => record.category === category)\n    .map(({ index }) => index);\n}\nexport function fileLocation(index: number) {\n  const lane = Math.max(0, archiveColumns.indexOf(records[index].category));\n  const row = 12 + columnFiles(lane).indexOf(index);\n  return { lane, row, slot: lane * 32 + row };\n}\nexport function fileAtSlot(slot: number) {\n  if (!records.length || !archiveColumns.length) return 0;\n  const lane = Math.floor(slot / 32);\n  const files = columnFiles(lane);\n  if (!files.length) return 0;\n  return files[((slot % 32) - 12 + files.length) % files.length];\n}\n`);
}

function patchBridge() {
  const target = join(VENDOR_ROOT, "src", "main.ts");
  let source = readFileSync(target, "utf8");
  source = source.replace(
    'const reviewParams = new URLSearchParams(location.search);',
    'const reviewParams = new URLSearchParams(location.search);\ndocument.documentElement.dataset.writingTimeEmbed = String(reviewParams.get("embed") === "1");',
  );
  source = source.replace(
    'function updateSelection(navigation?: ArchiveNavigation) {\n  const r = records[selected];',
    'function updateSelection(navigation?: ArchiveNavigation) {\n  const r = records[selected];\n  if (reviewParams.get("embed") === "1") {\n    window.parent?.postMessage({ type: "writing-time-rhine-selection", imageId: r.source, index: selected, title: r.title }, location.origin);\n  }',
  );
  writeFileSync(target, source);

  const cssTarget = join(VENDOR_ROOT, "src", "style.css");
  writeFileSync(cssTarget, readFileSync(cssTarget, "utf8") + `\nhtml[data-writing-time-embed="true"] .system-nav,\nhtml[data-writing-time-embed="true"] .system-footer,\nhtml[data-writing-time-embed="true"] .powered,\nhtml[data-writing-time-embed="true"] #skip,\nhtml[data-writing-time-embed="true"] .mobile-entry { display:none !important; }\nhtml[data-writing-time-embed="true"] #viewport { background:#ebe9e5; }\n`);
}

function buildRuntime() {
  run("npm", ["ci", "--no-audit", "--no-fund"], VENDOR_ROOT);
  rmSync(OUTPUT_ROOT, { recursive: true, force: true });
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  run("npm", ["exec", "vite", "build", "--", "--base=/rhinelab/", "--outDir", OUTPUT_ROOT], VENDOR_ROOT);
}

ensureCheckout();
patchDataAdapter();
patchBridge();
buildRuntime();
console.log(`RhineLabUI runtime synced from ${UPSTREAM_COMMIT} -> public/rhinelab`);
