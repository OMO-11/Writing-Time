/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const dir = process.env.EVIDENCE_DIR || 'docs/workshop-ui-evidence/atelier';
const base = process.env.BASE_URL || 'http://localhost:3101';
(async () => {
  fs.mkdirSync(dir, {recursive:true});
  const browser = await chromium.launch({channel:'msedge'});
  const context = await browser.newContext({reducedMotion:'reduce'});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    for (const route of ['workshop','library','gallery','search','settings','workbench','projects','archive-gallery']) {
      await page.goto(`${base}/${route}`);
      await page.locator('main').first().waitFor();
      if(route === 'workshop') await page.getByRole('heading',{name:/在微光里/}).waitFor();
      if(route === 'workbench') await page.waitForFunction(()=>document.querySelector('.editor-title-field input')?.disabled === false && document.querySelector('.cm-content'));
      await page.evaluate(()=>document.fonts.ready);
      for (const width of [1440,768,390,320]) {
        await page.setViewportSize({width,height:1000});
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const overflow = await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,items:[...document.querySelectorAll('main *')].filter(el=>el.getBoundingClientRect().right>innerWidth+2&&getComputedStyle(el).position!=='absolute'&&getComputedStyle(el).position!=='fixed').slice(0,5).map(el=>el.className)}));
        assert.ok(overflow.scroll <= width+1,`${route} ${width}: ${JSON.stringify(overflow)}`);
        if(width===1440 || width===390) await page.screenshot({path:`${dir}/${route}-${width}.png`,fullPage:true});
      }
      console.log('PASS layout',route);
    }
    await page.goto(base+'/workbench');
    const title=page.getByRole('textbox',{name:'作品标题',exact:true});
    await title.fill('观测手记 · 界面验证');
    await page.getByRole('button',{name:'完全保存',exact:true}).click();
    await page.getByRole('button',{name:'确认完全保存',exact:true}).click();
    await page.waitForURL('**/library?type=finished');
    await page.getByRole('link',{name:'观测手记 · 界面验证',exact:true}).click();
    await page.getByText('已完全保存 · 只读',{exact:true}).waitFor();
    await page.screenshot({path:`${dir}/reading-390.png`,fullPage:true});
    await page.setViewportSize({width:1440,height:1000});
    await page.screenshot({path:`${dir}/reading-1440.png`,fullPage:true});
    assert.deepEqual(errors,[]);
    console.log('PASS 8 routes / 4 widths / finalize-to-read flow / no browser errors');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1);});

