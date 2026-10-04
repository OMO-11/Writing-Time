const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async()=>{
 const dir='docs/workshop-ui-evidence/type-emblems'; fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({channel:'msedge'});
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try {
 await page.goto('http://localhost:3101/workbench');
 await page.waitForFunction(()=>document.querySelector('.editor-title-field input')?.disabled===false);
 for(const label of ['灵感','设定卡','时间线','展览','合集','图片集']) {
 await page.goto('http://localhost:3101/library');
 await page.getByRole('button',{name:'创建内容',exact:true}).click();
 await page.getByRole('menuitem',{name:new RegExp('^'+label)}).click();
 await page.waitForURL('**/content/*');await page.locator('.typed-editor').waitFor();
 }
 await page.goto('http://localhost:3101/library');await page.locator('.content-type-emblem').first().waitFor();
 const types=await page.locator('.content-type-emblem').evaluateAll(els=>[...new Set(els.map(e=>e.dataset.contentEmblem))]);
 assert.equal(types.length,8,types.join(','));
 for(const width of [1440,390,320]) {
 await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:`${dir}/library-${width}.png`,fullPage:true});
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('.global-home-button').screenshot({path:`${dir}/logo.png`});
 assert.deepEqual(errors,[]);console.log('PASS eight unique category emblems, three widths, no browser errors');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
