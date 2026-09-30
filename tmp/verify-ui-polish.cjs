/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium }=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{const b=await chromium.launch({channel:'msedge'}); const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));fs.mkdirSync('docs/workshop-ui-evidence/polish',{recursive:true});
try { await p.goto('http://localhost:3101/projects');await p.getByRole('heading',{name:'让散落的故事，'}).waitFor().catch(()=>p.getByRole('heading',{name:/在这里成册/}).waitFor());
for(const width of [1440,1121,768,390,320]){await p.setViewportSize({width,height:1000});await p.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));await p.screenshot({path:`docs/workshop-ui-evidence/polish/empty-${width}.png`,fullPage:true});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
const fonts=await p.evaluate(()=>['.book-page-intro h1','.book-page-heading p','.book-primary','.book-welcome-copy h2'].map(s=>getComputedStyle(document.querySelector(s)).fontFamily));assert.equal(new Set(fonts).size,1);console.log('Fonts:',fonts[0]);
await p.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('FantasyWorkshop');r.onsuccess=()=>{const d=r.result;const tx=d.transaction('settings','readwrite');tx.objectStore('settings').put({key:'character-display-preferences',value:{illustrationMode:'off'}});tx.oncomplete=()=>{d.close();resolve();};tx.onerror=()=>reject(tx.error);};}));
await p.reload();await p.getByRole('heading',{name:/在这里成册/}).waitFor();await p.waitForFunction(()=>document.documentElement.dataset.characterDisplay==='off');
assert.equal(await p.locator('.book-welcome-companions').count(),0);assert.equal(await p.locator('.book-art-scene').count(),1);
await p.screenshot({path:'docs/workshop-ui-evidence/polish/empty-art-off.png',fullPage:true});

await p.getByRole('button',{name:'创建第一本书',exact:true}).click();await p.getByLabel('书籍名称',{exact:true}).fill('晨雾与旅人的故事');await p.getByRole('dialog').getByRole('button',{name:'创建书籍',exact:true}).click();await p.getByRole('heading',{name:'晨雾与旅人的故事',exact:true}).waitFor();
for(const width of [1440,390]){await p.setViewportSize({width,height:1000});await p.screenshot({path:`docs/workshop-ui-evidence/polish/new-book-${width}.png`,fullPage:true});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
await p.emulateMedia({reducedMotion:'reduce'});await p.getByRole('button',{name:'添加第一个章节',exact:true}).click();assert.equal(await p.getByRole('dialog').evaluate(el=>getComputedStyle(el).animationName),'none');await p.keyboard.press('Escape');assert.deepEqual(errors,[]);console.log('PASS empty/new book, 4 widths, unified typography and reduced motion');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
