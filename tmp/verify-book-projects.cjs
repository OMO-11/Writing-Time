const {chromium}=require('C:/Users/Thewo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true, channel:"msedge"});
 const page=await browser.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
 await page.goto('http://localhost:3101/workbench');
 await page.getByRole('textbox',{name:'作品标题',exact:true}).waitFor({timeout:60000});
 await page.getByRole('textbox',{name:'作品标题',exact:true}).fill('定稿验证作品');
 page.once('dialog',d=>d.accept()); await page.getByRole('button',{name:'完全保存',exact:true}).click();
 await page.waitForURL('**/library?type=finished',{timeout:60000});
 await page.getByRole('link',{name:'定稿验证作品',exact:true}).waitFor();
 await page.getByRole('link',{name:'项目',exact:true}).click();
 await page.waitForURL('**/projects');
 page.once('dialog',d=>d.accept('验证书籍')); await page.getByRole('button',{name:'创建书籍',exact:true}).click();
 await page.getByRole('heading',{name:'验证书籍',exact:true}).waitFor();
 page.once('dialog',d=>d.accept('第一章')); await page.getByRole('button',{name:'添加章节',exact:true}).click();
 await page.getByLabel('向 第一章 添加作品').selectOption({label:'定稿验证作品'});
 await page.getByRole('link',{name:'定稿验证作品',exact:true}).waitFor();
 await page.reload(); await page.getByRole('button',{name:/验证书籍/}).click();
 await page.getByRole('link',{name:'定稿验证作品',exact:true}).click();
 await page.getByText('已完全保存 · 只读').waitFor();
 assert.equal(await page.getByRole('link',{name:'继续编辑',exact:true}).count(),0);
 const record=await page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('FantasyWorkshop');r.onsuccess=()=>{const d=r.result;const q=d.transaction('works').objectStore('works').getAll();q.onsuccess=()=>{resolve(q.result.find(w=>w.title==='定稿验证作品'));d.close();};};r.onerror=()=>reject(r.error);}));
 await page.goto('http://localhost:3101/workbench?work='+record.id);await page.waitForURL('**/work/'+record.slug);
 await page.setViewportSize({width:390,height:844});await page.goto('http://localhost:3101/projects');await page.getByRole('button',{name:/验证书籍/}).click();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]); console.log('PASS: finalize, finished partition, separate projects, create book/chapter, collect work, reload, readonly redirect, mobile layout');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

