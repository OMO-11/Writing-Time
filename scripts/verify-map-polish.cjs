/* eslint-disable @typescript-eslint/no-require-imports -- Browser regression utility. */
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'C:/Users/fufu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.HOME_URL || 'http://localhost:3100';
const output = path.join(process.cwd(),'docs/world-map-evidence/polish');
fs.mkdirSync(output,{recursive:true});
const idle = page => page.locator('.portal-root[data-scene="map"][data-phase="idle"]').waitFor({timeout:45000});
const shot = (page,name) => page.screenshot({path:path.join(output,name+'.png')});
async function enter(page) {
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.locator('.portal-root[data-booting="false"]').waitFor({timeout:45000});
  await page.getByRole('button',{name:'开启我的空间',exact:true}).click(); await idle(page);
}
async function visit(page,id) {
  await page.getByRole('button',{name:'目的地',exact:true}).click();
  await page.getByRole('link',{name:id==='gallery'?'进入拾光画廊':'进入幻想工坊',exact:true}).click();
}
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-webgl','--enable-unsafe-swiftshader']});
  const errors=[]; const results={};
  try {
    const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
    page.on('pageerror',error=>errors.push(error.message));
    await enter(page); await page.mouse.move(10,450);
    await page.waitForTimeout(200); await shot(page,'desktop');
    assert.equal(await page.locator('.world-map').getAttribute('data-location'),'home');
    assert.equal(await page.locator('[data-map-place="gallery"] .world-map-label').evaluate(n=>getComputedStyle(n).visibility),'hidden');
    await page.locator('[data-map-place="gallery"]').hover();await page.waitForTimeout(200);
    assert.equal(await page.locator('[data-map-place="gallery"] .world-map-label').evaluate(n=>getComputedStyle(n).opacity),'1');
    await shot(page,'hover');
    await page.mouse.move(790,660);await page.mouse.down();
    const drifts=[];
    for(let i=0;i<16;i++) {
      await page.mouse.move(790+(i%2?135:-130),660+(i%3-1)*40);
      drifts.push(await page.locator('[data-map-place="gallery"]').evaluate(node=>{
        const world=node.closest('.world-map-world'), rect=world.getBoundingClientRect(), m=new DOMMatrix(getComputedStyle(world).transform), r=node.getBoundingClientRect();
        return Math.max(Math.abs(r.x+r.width/2-(rect.x+1070*m.a)),Math.abs(r.bottom-(rect.y+480*m.a)));
      }));
    }
    await page.mouse.up();
    assert(Math.max(...drifts)<.2,`landmarks drifted ${Math.max(...drifts)}px`);
    results.maxLandmarkDriftPx=Math.max(...drifts);
    assert.equal(new URL(page.url()).pathname,'/');
    await page.getByRole('button',{name:'查看世界总览'}).click();await page.mouse.move(1,450);await page.waitForTimeout(200);await shot(page,'overview');
    await page.getByRole('button',{name:'定位当前位置'}).click();
    assert.equal(await page.locator('.world-map-pieces,.world-map-location-ring').count(),0);
    assert.equal(await page.locator('img[src*="/pieces/"]').count(),0);
    await visit(page,'gallery');
    await page.locator('.world-map[data-departing="true"]').waitFor();
    await page.waitForURL('**/archive-gallery',{timeout:60000});
    await page.getByRole('link',{name:'保存并返回地图'}).waitFor();await shot(page,'gallery-return');
    await page.getByRole('link',{name:'保存并返回地图'}).click();await idle(page);
    assert.equal(await page.locator('.world-map').getAttribute('data-location'),'gallery');
    await shot(page,'returned-gallery');
    await visit(page,'workshop');await page.waitForTimeout(30);await page.keyboard.press('Escape');
    await page.waitForTimeout(1500);
    assert.equal(new URL(page.url()).pathname,'/','cancelled travel must not navigate later');
    assert.equal(await page.locator('.world-map').getAttribute('data-departing'),'false');
    assert.equal(await page.locator('.world-map').getAttribute('data-location'),'gallery');
    await idle(page);
    await visit(page,'workshop');await page.waitForURL('**/workshop',{timeout:60000});
    await page.getByRole('link',{name:'保存并返回地图'}).click();await idle(page);
    assert.equal(await page.locator('.world-map').getAttribute('data-location'),'workshop');
    await page.getByRole('button',{name:'返回窗边',exact:true}).click();
    await page.locator('.portal-root[data-scene="home"][data-phase="idle"]').waitFor();
    await page.getByRole('button',{name:'开启我的空间',exact:true}).click();await idle(page);
    assert.equal(await page.locator('.world-map').getAttribute('data-location'),'home');
    results.navigation='gallery → map → cancelled workshop → workshop → map → home → map';
    await page.close();
    for(const [name,width,height] of [['mobile',390,844],['small',360,640],['landscape',844,390]]) {
      const mobile=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
      mobile.on('pageerror',error=>errors.push(error.message));
      await enter(mobile);
      assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await shot(mobile,name);
      await visit(mobile,'gallery');await mobile.waitForURL('**/archive-gallery',{timeout:60000});
      await mobile.getByRole('link',{name:'保存并返回地图'}).click();await idle(mobile);
      assert.equal(await mobile.locator('.world-map').getAttribute('data-location'),'gallery');
      await mobile.close();
    }
    results.responsive='390x844, 360x640, 844x390; reduced motion round trips';
    assert.deepEqual(errors,[]);
    results.pageErrors=errors;
    fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(results,null,2));
    console.log(JSON.stringify(results,null,2));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
