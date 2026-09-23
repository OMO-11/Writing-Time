/* eslint-disable @typescript-eslint/no-require-imports -- Optional browser regression utility. */
// NODE_PATH=<Playwright node_modules> HOME_URL=http://localhost:3100 node scripts/verify-world-map.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const url = process.env.HOME_URL || 'http://localhost:3100';
const out = path.join(process.cwd(), 'docs/world-map-evidence');
fs.mkdirSync(out, { recursive: true });
async function screenshot(page, name) { const file = path.join(out, name); fs.rmSync(file, { force: true }); await page.screenshot({ path: file }); }

async function ready(page) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.locator('.portal-root[data-booting="false"]').waitFor({ timeout: 30000 });
}
async function enter(page) {
  await page.getByRole('button', { name: /开启我的空间/ }).click();
  await page.locator('.portal-root[data-scene="map"][data-phase="idle"]').waitFor({ timeout: 15000 });
}
async function back(page) {
  await page.getByRole('button', { name: /返回窗边/ }).first().click();
  await page.locator('.portal-root[data-scene="home"][data-phase="idle"]').waitFor({ timeout: 15000 });
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--enable-webgl', '--enable-unsafe-swiftshader'] });
  const errors = [];
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await ready(page);
  await page.locator('canvas[data-ready="true"]').waitFor();
  await screenshot(page, 'home-desktop.png');
  const cdp = await context.newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async frame => {
    frames.push(frame.data);
    await cdp.send('Page.screencastFrameAck', { sessionId: frame.sessionId });
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 82, maxWidth: 1440, maxHeight: 900, everyNthFrame: 1 });
  await page.waitForTimeout(180);
  await enter(page);
  await screenshot(page, 'map-start.png');
  assert.deepEqual(await page.locator('.world-map-landmark[href]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href'))), ['/workshop', '/archive-gallery']);
  assert(await page.locator('.world-map img').evaluateAll(nodes => nodes.every(node => node.complete && node.naturalWidth > 0)));
  assert.equal(await page.locator('.dream-home').getAttribute('inert'), '');
  assert.equal(await page.locator('.portal-fog').evaluate(node => getComputedStyle(node).pointerEvents), 'none');
  const canvas = page.locator('canvas');
  const paused = await canvas.getAttribute('data-motion-time');
  await page.waitForTimeout(300);
  assert.equal(await canvas.getAttribute('data-motion-time'), paused, 'hidden home RAF should stop');
  const initialTransform = await page.locator('.world-map-world').getAttribute('style');
  await page.mouse.move(800, 690); await page.mouse.down(); await page.mouse.move(900, 690, { steps: 6 }); await page.mouse.up();
  assert.notEqual(await page.locator('.world-map-world').getAttribute('style'), initialTransform, 'drag should move camera');
  assert.equal(new URL(page.url()).pathname, '/');
  const landmark = await page.locator('[data-map-place="workshop"]').boundingBox();
  await page.mouse.move(landmark.x + landmark.width / 2, landmark.y + landmark.height / 2);
  await page.mouse.down(); await page.mouse.move(landmark.x + landmark.width / 2 + 70, landmark.y + landmark.height / 2, { steps: 6 }); await page.mouse.up();
  assert.equal(new URL(page.url()).pathname, '/', 'dragging a landmark must not navigate');
  const wheelBefore = await page.locator('.world-map-world').getAttribute('style');
  await page.mouse.move(800, 600); await page.mouse.wheel(0, -230);
  await page.waitForTimeout(80);
  assert.notEqual(await page.locator('.world-map-world').getAttribute('style'), wheelBefore, 'wheel should zoom around pointer');
  await page.getByRole('button', { name: '定位当前位置' }).click();
  await page.getByRole('button', { name: '放大地图' }).click();
  await page.getByRole('button', { name: '查看世界总览' }).click();
  await screenshot(page, 'map-overview.png');
  await page.getByRole('button', { name: '目的地' }).click();
  assert.equal(await page.getByRole('link', { name: '进入' }).count(), 2);
  await page.getByRole('button', { name: '关闭目的地列表' }).click();
  await back(page);
  assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), '开启我的空间');
  await page.waitForTimeout(250);
  assert.notEqual(await canvas.getAttribute('data-motion-time'), paused, 'home RAF should resume');
  await cdp.send('Page.stopScreencast');
  assert(frames.length > 24, `expected transition frames, received ${frames.length}`);
  const videoFrames = frames.filter((_, index) => index % 2 === 0);
  const videoBase64 = await page.evaluate(async ({ images, width, height }) => {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    const stream = canvas.captureStream(24);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8') ? 'video/webm;codecs=vp8' : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5000000 });
    const chunks = [];
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    const stopped = new Promise(resolve => { recorder.onstop = resolve; });
    recorder.start();
    for (const base64 of images) {
      const image = new Image();
      image.src = `data:image/jpeg;base64,${base64}`;
      await image.decode();
      context.drawImage(image, 0, 0, width, height);
      await new Promise(resolve => setTimeout(resolve, 42));
    }
    recorder.stop();
    await stopped;
    stream.getTracks().forEach(track => track.stop());
    const blob = new Blob(chunks, { type: mimeType });
    return new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.readAsDataURL(blob); });
  }, { images: videoFrames, width: 1440, height: 900 });
  fs.writeFileSync(path.join(out, 'fog-round-trip.webm'), Buffer.from(videoBase64, 'base64'));
  await page.close();
  await context.close();

  for (const [name, width, height] of [['wide', 1920, 1080], ['tablet', 1024, 768]]) {
    const extra = await browser.newPage({ viewport: { width, height } });
    extra.on('pageerror', error => errors.push(error.message));
    await ready(extra); await enter(extra);
    await screenshot(extra, `map-${name}.png`);
    await extra.close();
  }

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  mobile.on('pageerror', error => errors.push(error.message));
  await ready(mobile); await enter(mobile);
  await screenshot(mobile, 'map-mobile.png');
  assert.equal(await mobile.locator('.world-map-destinations button').first().isVisible(), true);
  await mobile.close();

  const landscape = await browser.newPage({ viewport: { width: 844, height: 390 } });
  await ready(landscape); await enter(landscape);
  await screenshot(landscape, 'map-landscape.png');
  await landscape.close();

  const reduced = await browser.newPage({ viewport: { width: 360, height: 640 }, reducedMotion: 'reduce' });
  await ready(reduced); await enter(reduced);
  await screenshot(reduced, 'map-small.png');
  await back(reduced);
  await reduced.close();

  const routes = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await ready(routes); await enter(routes);
  for (const [place, destination] of [['gallery', '/archive-gallery'], ['workshop', '/workshop']]) {
    await routes.locator(`[data-map-place="${place}"]`).click();
    await routes.waitForURL(`**${destination}`);
    await routes.goBack();
    await routes.locator('.portal-root[data-scene="map"][data-phase="idle"]').waitFor({ timeout: 15000 });
  }
  await routes.close();

  const failed = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  await failed.route('**/assets/world-map/terrain.webp', route => route.abort());
  await ready(failed);
  await failed.getByRole('button', { name: /开启我的空间/ }).click();
  await failed.getByText(/地图素材加载失败/).waitFor({ timeout: 12000 });
  assert.equal(await failed.locator('.portal-root').getAttribute('data-phase'), 'error');
  await failed.getByRole('button', { name: '返回窗边' }).click();
  assert.equal(await failed.locator('.portal-root').getAttribute('data-scene'), 'home');
  await failed.unroute('**/assets/world-map/terrain.webp');
  await enter(failed);
  await failed.close();

  assert.deepEqual(errors, []);
  await browser.close();
  console.log(JSON.stringify({ desktop: true, wide: true, tablet: true, mobile: true, small: true, landscape: true, reducedMotion: true, assetFailureRecovery: true, hiddenRaf: true, routeAndSessionRestore: true, errors, evidence: out }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
