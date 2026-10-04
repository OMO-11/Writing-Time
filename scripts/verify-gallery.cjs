/* eslint-disable @typescript-eslint/no-require-imports -- Local browser verification. */
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'C:/Users/fufu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.GALLERY_URL || 'http://localhost:3104';
const output = path.join(process.cwd(), process.env.GALLERY_EVIDENCE_DIR || 'docs/gallery-evidence');
fs.mkdirSync(output, { recursive: true });
const fixtures = [
  ['窗边拾光.webp', 'public/assets/home/enhance-noval-observatory.webp'],
  ['旅途中的诺瓦尔.png', 'public/assets/gallery/noval-gallery-portrait.png'],
  ['伊登的藏品.png', 'public/assets/gallery/eden-gallery-portrait.png'],
  ['通向工坊的路.png', 'public/images/workshop-landscape.png'],
];
async function settle(page) {
  await page.waitForFunction(() => [...document.images].filter(image => image.getBoundingClientRect().bottom > 0 && image.getBoundingClientRect().top < innerHeight).every(image => image.complete && image.naturalWidth > 0));
  await page.evaluate(async () => {
    await Promise.all([...document.images].filter(image => image.getBoundingClientRect().bottom > 0 && image.getBoundingClientRect().top < innerHeight).map(image => image.decode()));
    await Promise.all(document.getAnimations().filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
    await new Promise(requestAnimationFrame);
  });
}
async function shot(page, name) {
  await settle(page);
  await page.screenshot({ path: path.join(output, name + '.png'), fullPage: !(await page.locator('dialog[open]').count()), animations: 'disabled' });
}
async function noOverflow(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No horizontal overflow');
}
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  // A fresh browser context keeps fixture images separate from the user's local data.
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  const failedAssets = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failedAssets.push(response.url()); });
  try {
    await page.goto(base + '/archive-gallery');
    await page.getByRole('button', { name: '放入第一张图片' }).waitFor();
    await shot(page, 'empty-morning');
    await page.getByRole('button', { name: /星夜/ }).click();
    await page.locator('[data-atmosphere="night"]').waitFor();
    await shot(page, 'empty-night');
    await page.locator('input[type="file"]').setInputFiles(fixtures.map(([name, file]) => ({ name, mimeType: file.endsWith('.png') ? 'image/png' : 'image/webp', buffer: fs.readFileSync(file) })));
    await page.waitForFunction(() => document.querySelectorAll('.archive-gallery-item').length === 4);
    await page.getByRole('button', { name: '收藏图片', exact: true }).waitFor();
    await page.reload();
    await page.locator('[data-atmosphere="night"]').waitFor();
    await page.getByRole('button', { name: '查看图片：窗边拾光', exact: true }).waitFor();
    assert.equal(await page.locator('.archive-gallery-item').count(), 4);
    await noOverflow(page);
    await shot(page, 'gallery-night');
    await page.getByRole('button', { name: /晨光/ }).click();
    await page.locator('[data-atmosphere="morning"]').waitFor();
    await shot(page, 'gallery-morning');
    const trigger = page.getByRole('button', { name: '查看图片：窗边拾光', exact: true });
    await trigger.click();
    await page.getByRole('dialog').waitFor();
    await page.keyboard.press('ArrowRight');
    await page.getByRole('dialog').getByRole('heading', { name: '旅途中的诺瓦尔', exact: true }).waitFor();
    await page.getByRole('button', { name: '上一张图片' }).click();
    await page.getByRole('dialog').getByRole('heading', { name: '窗边拾光', exact: true }).waitFor();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.querySelector('dialog').contains(document.activeElement)), true);
    await shot(page, 'gallery-lightbox');
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'detached' });
    assert.equal(await trigger.evaluate(element => element === document.activeElement), true, 'Focus returns to opened image');
    await page.getByRole('button', { name: '移出画廊', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('.archive-gallery-item').length === 3);
    const originalCount = await page.evaluate(() => new Promise((resolve, reject) => {
      const request = indexedDB.open('FantasyWorkshop');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const count = db.transaction('images').objectStore('images').count();
        count.onsuccess = () => { resolve(count.result); db.close(); };
      };
    }));
    assert.equal(originalCount, 4, 'Removing gallery membership preserves original image');
    await page.reload();
    await page.waitForFunction(() => document.querySelectorAll('.archive-gallery-item').length === 3);
    for (const width of [768, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await noOverflow(page);
      if (width !== 320) await shot(page, 'gallery-' + width);
    }
    await page.getByRole('button', { name: /星夜/ }).click();
    await page.locator('[data-atmosphere="night"]').waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await shot(page, 'gallery-mobile-night');
    await page.locator('.archive-gallery-item').first().click();
    await page.getByRole('dialog').waitFor();
    await noOverflow(page);
    await page.getByRole('button', { name: '关闭大图' }).click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('.archive-hero-portrait .archive-portrait-figure').evaluate(element => getComputedStyle(element).animationName), 'none');
    assert.deepEqual(errors, []);
    assert.deepEqual(failedAssets, []);
    const result = { result: 'PASS', checks: ['empty state', 'morning and night themes', 'theme and gallery persistence', 'batch import', 'image preview and keyboard navigation', 'modal focus restore', 'remove keeps original', '1440/768/390/320 layouts', 'mobile lightbox', 'reduced motion', 'no page errors or failed assets'] };
    fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
