/* eslint-disable @typescript-eslint/no-require-imports -- Browser regression utility. */
// NODE_PATH can point to an existing Playwright installation.
// HOME_URL=http://localhost:3101 CHROME_PATH=... node scripts/verify-home-motion.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    headless: true,
  });
  try {
    // Reproduce the user's Edge/Windows preference instead of forcing it off.
    const reducedPage = await browser.newPage({ reducedMotion: 'reduce' });
    await reducedPage.goto(process.env.HOME_URL || 'http://localhost:3100');
    const reducedCanvas = reducedPage.locator('canvas.dream-relight');
    await reducedPage.waitForFunction(() => document.querySelector('canvas.dream-relight')?.dataset.ready === 'true');
    assert.match(await reducedCanvas.getAttribute('data-motion-status'), /系统减少动态效果/);
    assert.equal(await reducedCanvas.getAttribute('data-motion-time'), '0.00');
    await reducedPage.getByRole('button', { name: /光影随时间流转/ }).click();
    await reducedPage.getByRole('button', { name: '开启场景动效', exact: true }).click();
    await reducedPage.waitForFunction(() => /已眨眼 [1-9]/.test(document.querySelector('canvas.dream-relight')?.dataset.motionStatus || ''), null, { timeout: 20000 });
    assert.equal(await reducedPage.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
    await reducedPage.getByRole('button', { name: '暂停场景动效', exact: true }).click();
    await reducedPage.waitForFunction(() => document.querySelector('canvas.dream-relight')?.dataset.motionTime === '0.00');
    await reducedPage.getByRole('button', { name: '开启场景动效', exact: true }).click();
    await reducedPage.waitForFunction(() => Number(document.querySelector('canvas.dream-relight')?.dataset.motionTime) > 0);
    await reducedPage.reload();
    await reducedPage.waitForFunction(() => document.querySelector('canvas.dream-relight')?.dataset.ready === 'true');
    assert.equal(await reducedCanvas.getAttribute('data-motion-time'), '0.00', 'Explicit opt-in must not persist across visits');
    await reducedPage.close();
    const page = await browser.newPage({ viewport: { width: 960, height: 600 }, reducedMotion: 'no-preference' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' && !message.location().url.endsWith('/favicon.ico')) errors.push(message.text());
    });
    page.on('response', response => {
      if (response.status() >= 400 && /\/_next\/.*\.js/.test(response.url())) errors.push(`${response.status()} ${response.url()}`);
    });
    await page.goto(process.env.HOME_URL || 'http://localhost:3100');
    const canvas = page.locator('canvas.dream-relight');
    await page.waitForFunction(() => document.querySelector('canvas.dream-relight')?.dataset.ready === 'true');
    await page.waitForFunction(() => /已眨眼 [1-9]/.test(document.querySelector('canvas.dream-relight')?.dataset.motionStatus || ''), null, { timeout: 20000 });
    await page.getByRole('button', { name: /光影随时间流转/ }).click();
    await page.locator('#dream-hour').fill('12');
    await page.waitForTimeout(1500);
    await page.keyboard.press('Escape');
    const first = await canvas.screenshot();
    await page.waitForTimeout(1250);
    const second = await canvas.screenshot();
    assert(!first.equals(second), 'Rendered canvas pixels must change, not just status text');
    const running = await canvas.getAttribute('data-motion-status');
    await page.getByRole('button', { name: /正在预览光影/ }).click();
    await page.getByRole('button', { name: '暂停场景动效' }).click();
    await page.waitForTimeout(200);
    const paused = await canvas.getAttribute('data-motion-time');
    await page.waitForTimeout(500);
    assert.equal(await canvas.getAttribute('data-motion-time'), paused);
    await page.getByRole('button', { name: '开启场景动效' }).click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('canvas.dream-relight')?.dataset.motionTime === '0.00');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(() => Number(document.querySelector('canvas.dream-relight')?.dataset.motionTime) > 0);
    assert.equal(await canvas.evaluate(c => c.getContext('webgl').getError()), 0);
    assert.deepEqual(errors, []);
    console.log({ url: page.url(), running, pixelsChanged: true, pause: true, reducedMotion: true, explicitReducedMotionOptIn: true, errors });
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
