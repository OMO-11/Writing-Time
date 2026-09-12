import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const VENDOR_ROOT = join(ROOT, ".vendor", "rhinelab-ui");
const OUTPUT_ROOT = join(ROOT, "public", "rhinelab");
const NPM_CACHE_ROOT = join(ROOT, ".npm-cache-rhinelab");
const INSTALL_MARKER = join(VENDOR_ROOT, "node_modules", ".writing-time-install-ok");
const UPSTREAM = "https://github.com/LBEILC/RhineLabUI.git";
const UPSTREAM_COMMIT = "8799b03179a9a0ebd2611843e644a5a0530b24bf";

function childNpmEnv() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    const normalized = key.toLowerCase();
    if (
      normalized === "npm_config_allow_scripts" ||
      normalized === "npm_config_ignore_scripts" ||
      normalized === "npm_config_cache" ||
      normalized === "npm_config_logs_dir"
    ) {
      delete env[key];
    }
  }

  mkdirSync(NPM_CACHE_ROOT, { recursive: true });
  env.npm_config_cache = NPM_CACHE_ROOT;
  env.npm_config_logs_dir = join(NPM_CACHE_ROOT, "_logs");
  env.npm_config_update_notifier = "false";
  return env;
}

function run(command, args, cwd = ROOT, options = {}) {
  execFileSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: options.npm ? childNpmEnv() : process.env,
  });
}

function removeTree(path) {
  if (!existsSync(path)) return;
  rmSync(path, {
    recursive: true,
    force: true,
    maxRetries: process.platform === "win32" ? 8 : 2,
    retryDelay: 250,
  });
}

function replaceOrThrow(source, needle, replacement, label) {
  if (!source.includes(needle)) throw new Error(`RhineLabUI upstream changed: patch point not found (${label}).`);
  return source.replace(needle, replacement);
}

function ensureCheckout() {
  mkdirSync(dirname(VENDOR_ROOT), { recursive: true });
  if (!existsSync(join(VENDOR_ROOT, ".git"))) {
    removeTree(VENDOR_ROOT);
    run("git", ["clone", "--filter=blob:none", UPSTREAM, VENDOR_ROOT]);
  }
  run("git", ["fetch", "origin", UPSTREAM_COMMIT], VENDOR_ROOT);
  run("git", ["reset", "--hard", UPSTREAM_COMMIT], VENDOR_ROOT);
  run("git", ["clean", "-fd"], VENDOR_ROOT);
}

function dependenciesAreComplete() {
  if (!existsSync(INSTALL_MARKER)) return false;
  try {
    return readFileSync(INSTALL_MARKER, "utf8").trim() === UPSTREAM_COMMIT;
  } catch {
    return false;
  }
}

function ensureDependencies() {
  if (dependenciesAreComplete()) return;

  const nodeModules = join(VENDOR_ROOT, "node_modules");
  if (existsSync(nodeModules)) {
    console.log("Incomplete RhineLabUI dependency install detected; cleaning node_modules before retry...");
    removeTree(nodeModules);
  }

  console.log(`Installing RhineLabUI dependencies with project-local npm cache: ${NPM_CACHE_ROOT}`);
  run("npm", ["ci", "--no-audit", "--no-fund"], VENDOR_ROOT, { npm: true });
  writeFileSync(INSTALL_MARKER, `${UPSTREAM_COMMIT}\n`);
}

function patchDataAdapter() {
  const target = join(VENDOR_ROOT, "src", "data.ts");
  writeFileSync(target, `export interface ArchiveRecord {\n  id: string;\n  title: string;\n  en: string;\n  department: string;\n  category: string;\n  date: string;\n  lead: string;\n  clearance: string;\n  abstract: string;\n  findings: string[];\n  source: string;\n}\n\nconst STORAGE_KEY = "writing-time-rhine-records";\nfunction loadRecords(): ArchiveRecord[] {\n  try {\n    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");\n    return Array.isArray(parsed) ? parsed : [];\n  } catch {\n    return [];\n  }\n}\n\nexport const records: ArchiveRecord[] = loadRecords();\nexport const archiveColumns = [...new Set(records.map((record) => record.category))];\nexport const categories = ["全部档案", ...archiveColumns];\n\nexport function columnFiles(lane: number) {\n  if (!archiveColumns.length) return [];\n  const category = archiveColumns[((lane % archiveColumns.length) + archiveColumns.length) % archiveColumns.length];\n  return records\n    .map((record, index) => ({ record, index }))\n    .filter(({ record }) => record.category === category)\n    .map(({ index }) => index);\n}\nexport function fileLocation(index: number) {\n  const lane = Math.max(0, archiveColumns.indexOf(records[index].category));\n  const row = 12 + columnFiles(lane).indexOf(index);\n  return { lane, row, slot: lane * 32 + row };\n}\nexport function fileAtSlot(slot: number) {\n  if (!records.length || !archiveColumns.length) return 0;\n  const lane = Math.floor(slot / 32);\n  const files = columnFiles(lane);\n  if (!files.length) return 0;\n  return files[((slot % 32) - 12 + files.length) % files.length];\n}\n`);
}

function patchBridge() {
  const target = join(VENDOR_ROOT, "src", "main.ts");
  let source = readFileSync(target, "utf8");
  source = replaceOrThrow(
    source,
    'const reviewParams = new URLSearchParams(location.search);',
    'const reviewParams = new URLSearchParams(location.search);\ndocument.documentElement.dataset.writingTimeEmbed = String(reviewParams.get("embed") === "1");',
    "embed marker",
  );
  source = replaceOrThrow(
    source,
    'function updateSelection(navigation?: ArchiveNavigation) {\n  const r = records[selected];',
    'function updateSelection(navigation?: ArchiveNavigation) {\n  const r = records[selected];\n  if (reviewParams.get("embed") === "1") {\n    window.parent?.postMessage({ type: "writing-time-rhine-selection", imageId: r.source, index: selected, title: r.title }, location.origin);\n  }',
    "selection bridge",
  );
  source = replaceOrThrow(
    source,
    'function openFile() {\n  if (!ready) return;',
    'function openFile() {\n  if (!ready) return;\n  if (reviewParams.get("embed") === "1") {\n    const record = records[selected];\n    window.parent?.postMessage({ type: "writing-time-rhine-open", imageId: record.source, index: selected, title: record.title }, location.origin);\n    return;\n  }',
    "open bridge",
  );
  writeFileSync(target, source);

  const cssTarget = join(VENDOR_ROOT, "src", "style.css");
  writeFileSync(cssTarget, readFileSync(cssTarget, "utf8") + `\nhtml[data-writing-time-embed="true"] .system-nav,\nhtml[data-writing-time-embed="true"] .system-footer,\nhtml[data-writing-time-embed="true"] .powered,\nhtml[data-writing-time-embed="true"] #skip,\nhtml[data-writing-time-embed="true"] .mobile-entry { display:none !important; }\nhtml[data-writing-time-embed="true"] #viewport { background:#ebe9e5; }\n`);
}

function buildRuntime() {
  removeTree(OUTPUT_ROOT);
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  run("npm", ["exec", "vite", "build", "--", "--base=/rhinelab/", "--outDir", OUTPUT_ROOT], VENDOR_ROOT, { npm: true });
  copyFileSync(join(VENDOR_ROOT, "LICENSE"), join(OUTPUT_ROOT, "RHINELABUI-LICENSE.txt"));
  writeFileSync(join(OUTPUT_ROOT, "UPSTREAM.txt"), `RhineLabUI\n${UPSTREAM}\ncommit ${UPSTREAM_COMMIT}\n`);
}

ensureCheckout();
ensureDependencies();
patchDataAdapter();
patchBridge();
buildRuntime();
console.log(`RhineLabUI runtime synced from ${UPSTREAM_COMMIT} -> public/rhinelab`);
