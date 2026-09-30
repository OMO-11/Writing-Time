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
const { AsyncCache } = require("../lib/async-cache.ts");
const { MarkdownService, wikiTargets } = require("../lib/markdown-service.ts");
const { validateBackup } = require("../lib/backup-validation.ts");
const { createContentItem } = require("../lib/content-registry.ts");

(async () => {
  const cache = new AsyncCache(2, 10);
  let computations = 0;
  const compute = async () => ({ nested: { value: ++computations } });
  const [first, second] = await Promise.all([cache.get("a", compute), cache.get("a", compute)]);
  assert.equal(computations, 1);
  first.nested.value = 99;
  assert.equal(second.nested.value, 1);
  assert.equal((await cache.get("a", compute)).nested.value, 1);
  await cache.get("b", compute); await cache.get("a", compute); await cache.get("c", compute);
  await cache.get("b", compute); assert.equal(computations, 4);
  await assert.rejects(cache.get("bad", async () => { throw Error("transient"); }));
  assert.equal(await cache.get("bad", async () => "recovered"), "recovered");
  await cache.get("oversized-source", compute); await cache.get("oversized-source", compute);
  assert.equal(computations, 6);
  const weighted = new AsyncCache(10, 3);
  await weighted.get("aa", compute); await weighted.get("bb", compute); await weighted.get("aa", compute);
  assert.equal(computations, 9);
  console.log("PASS cache coalescing, isolation, LRU/source limits and failure retry");
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
  parsed.headings[0].text = "changed by caller";
  assert.equal((await MarkdownService.process(source)).headings[0].text, "外貌");
  assert.doesNotMatch((await MarkdownService.process("甲\n乙", "standard")).renderedHtml, /<br/);
  assert.match((await MarkdownService.process("甲\n乙", "single")).renderedHtml, /<br/);
  const excerptSource = MarkdownService.parseMarkdown("[[角色]]");
  const originalTree = structuredClone(excerptSource.tree);
  await MarkdownService.createExcerpt(excerptSource);
  assert.deepEqual(excerptSource.tree, originalTree);
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

  // Exercise the real index with controlled database snapshots and observer delivery.
  const originalLoad = Module._load;
  let observe, observer, reads = 0, subscriptions = 0, shouldFail = false;
  let contents = [createContentItem("note", "银蓝旅人")];
  const mockDb = {
    contents: { toArray: async () => { reads++; if (shouldFail) throw Error("offline"); return structuredClone(contents); } },
    books: { toArray: async () => [] },
    transaction: async (_mode, _contents, _books, callback) => callback(),
  };
  Module._load = function (name, ...args) {
    if (name === "@/lib/db") return { db: mockDb };
    if (name === "dexie") return { liveQuery: (query) => ({ subscribe: (handlers) => {
      subscriptions++; observe = query; observer = handlers;
      queueMicrotask(() => { query().then(handlers.next, handlers.error); });
      return { unsubscribe() {} };
    } }) };
    return originalLoad.call(this, name, ...args);
  };
  let SearchService;
  try { ({ SearchService } = require("../lib/search-service.ts")); }
  finally { Module._load = originalLoad; }
  const previousWindow = global.window;
  global.window = {};
  try {
    shouldFail = true;
    await assert.rejects(SearchService.search("银蓝"));
    shouldFail = false;
    const searches = await Promise.all([SearchService.search("银蓝"), SearchService.search("银蓝")]);
    assert.equal(searches[0].length, 1); assert.equal(searches[1].length, 1);
    assert.equal(subscriptions, 2); assert.equal(reads, 2);
    const oldSnapshot = await observe();
    contents = [{ ...contents[0], title: "月星魔女" }];
    const newSnapshot = await observe();
    observer.next(newSnapshot); observer.next(oldSnapshot);
    assert.equal((await SearchService.search("银蓝")).length, 0);
    assert.equal((await SearchService.search("月星")).length, 1);
    contents = []; observer.next(await observe());
    assert.equal((await SearchService.search("月星")).length, 0);
    assert.equal(reads, 5);
    console.log("PASS search initialization retry, shared reads, updates, deletion and stale delivery");
  } finally {
    if (previousWindow === undefined) delete global.window; else global.window = previousWindow;
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
