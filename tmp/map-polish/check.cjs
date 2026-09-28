const { chromium } = require('C:/Users/fufu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-webgl','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:3100',{waitUntil:'domcontentloaded'});
 await page.locator('.portal-root[data-booting="false"]').waitFor({timeout:60000});
 await page.getByRole('button',{name:'开启我的空间',exact:true}).click();
 await page.locator('.portal-root[data-scene="map"][data-phase="idle"]').waitFor({timeout:30000});
 await page.screenshot({path:'tmp/map-polish/map-start.png'});
 await page.locator('[data-map-place="gallery"]').hover();await page.waitForTimeout(250);
 await page.screenshot({path:'tmp/map-polish/map-hover.png'});
 await page.getByRole('button',{name:'查看世界总览'}).click();await page.mouse.move(5,890);
 await page.screenshot({path:'tmp/map-polish/map-overview.png'});
 console.log(JSON.stringify({errors,images:await page.locator('.world-map img').evaluateAll(nodes=>nodes.map(n=>({src:n.getAttribute('src'),width:n.naturalWidth,loaded:n.complete}))),landmark:await page.locator('[data-map-place="gallery"]').boundingBox()},null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
