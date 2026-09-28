/* eslint-disable @typescript-eslint/no-require-imports -- Node-only regression runner. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
// Isolated to this test process; no bundler, browser or native CSS dependency.
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
  return originalResolve.call(this, name.startsWith("@/") ? path.resolve(__dirname, "..", name.slice(2)) : name, ...args);
};
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
const { SaveQueue } = require("../lib/save-queue.ts");
const { MarkdownService, wikiTargets } = require("../lib/markdown-service.ts");
const { validateBackup } = require("../lib/backup-validation.ts");
const { createContentItem } = require("../lib/content-registry.ts");

(async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const saved = [];
  const queue = new SaveQueue(async (value) => { if (value === 1) await gate; saved.push(value); });
  queue.enqueue(1); const flushing = queue.flush(); queue.enqueue(2); queue.enqueue(3); release(); await flushing;
  assert.deepEqual(saved, [1, 3]);
  let fail = true;
  const retry = new SaveQueue(async (value) => { if (fail) throw Error("disk"); saved.push(value); });
  retry.enqueue(4); await assert.rejects(retry.flush()); fail = false; await retry.flush(); assert.equal(saved.at(-1), 4);
  console.log("PASS save queue drains latest revision and retains failed writes");

  const source = "---\ntitle: 测试\n---\n\n# 外貌\n\n[[角色]]\n\n# 外貌\n\n`[[代码]]`\n\n```md\n[[示例]]\n```\n";
  const parsed = await MarkdownService.process(source);
  assert.match(parsed.renderedHtml, /id="section-外貌"/);
  assert.match(parsed.renderedHtml, /id="section-外貌-2"/);
  assert.equal(parsed.headings[0].from, source.indexOf("# 外貌"));
  assert.equal(parsed.headings[1].from, source.lastIndexOf("# 外貌"));
  assert.deepEqual(wikiTargets(source).map((item) => item.title), ["角色"]);
  assert.match(parsed.renderedHtml, /<code>\[\[代码\]\]<\/code>/);
  console.log("PASS Chinese/repeated heading anchors, source offsets and Wiki code exclusion");

  const article = createContentItem("article", "安全导入");
  article.payload.markdown = "# 正文\n\n<img src=x onerror=alert(1)>\n\n[危险](javascript:alert%281%29)";
  article.payload.renderedHtml = '<script>alert(1)</script>';
  article.payload.excerptHtml = '<img src=x onerror=alert(1)>';
  article.payload.finalizedAt = Date.now();
  const backup = { format: "fantasy-workshop-backup", version: 4, exportedAt: Date.now(), contents: [article], images: [], books: [], settings: [] };
  const validated = await validateBackup(structuredClone(backup));
  assert.doesNotMatch(validated.contents[0].payload.renderedHtml, /<script|onerror|href="javascript:/);
  assert.doesNotMatch(validated.contents[0].payload.excerptHtml, /onerror/);
  await assert.rejects(validateBackup({ ...backup, version: 99 }));
  await assert.rejects(validateBackup({ ...backup, contents: [{ ...article, tags: "invalid" }] }));
  console.log("PASS backup validation rejects invalid versions/fields and regenerates finalized HTML");
})().catch((error) => { console.error(error); process.exitCode = 1; });
