/* eslint-disable @typescript-eslint/no-require-imports -- Optional Playwright browser regression. */
const {chromium}=require("playwright");
const assert=require('node:assert/strict');
const baseUrl = process.env.BASE_URL || "http://localhost:3000";
(async()=>{
 const browser=await chromium.launch({headless:true, channel:process.env.BROWSER_CHANNEL || "msedge"});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}); const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const nameDialog = async (trigger, label, value, submit) => {
   await page.getByRole('button',{name:trigger,exact:true}).click();
   const dialog=page.getByRole('dialog');
   await dialog.getByLabel(label,{exact:true}).fill(value);
   await dialog.getByRole('button',{name:submit,exact:true}).click();
   await dialog.waitFor({state:'hidden'});
 };
 const collectOne = async (chapter, title) => {
   await page.getByRole('button',{name:'向 '+chapter+' 添加作品',exact:true}).click();
   await page.getByRole('checkbox',{name:new RegExp(title)}).check();
   await page.getByRole('button',{name:'收录到章节',exact:true}).click();
   await page.getByRole('dialog').waitFor({state:'hidden'});
 };
 try{
 await page.goto(baseUrl + "/workbench");
 await page.getByRole('textbox',{name:'作品标题',exact:true}).waitFor({timeout:60000});
 await page.getByRole('textbox',{name:'作品标题',exact:true}).fill('定稿验证作品');
 await page.getByRole('button',{name:'完全保存',exact:true}).click(); await page.getByRole('button',{name:'确认完全保存',exact:true}).click();
 await page.waitForURL('**/library?type=finished',{timeout:60000});
 await page.getByRole('link',{name:'定稿验证作品',exact:true}).waitFor();
 await page.getByRole('link',{name:'项目',exact:true}).click();
 await page.waitForURL('**/projects');
 await nameDialog('创建书籍','书籍名称','验证书籍','创建书籍');
 await page.getByRole('heading',{name:'验证书籍',exact:true}).waitFor();
 await nameDialog('添加章节','章节名称','第一章','添加章节');
 await collectOne('第一章','定稿验证作品');
 await page.getByRole('link',{name:'定稿验证作品',exact:true}).waitFor();
 await page.reload(); await page.getByRole('button',{name:/验证书籍/}).click();
 await page.getByRole('link',{name:'定稿验证作品',exact:true}).click();
 await page.getByText('已完全保存 · 只读').waitFor();
 assert.equal(await page.getByRole('link',{name:'继续编辑',exact:true}).count(),0);
 const record=await page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('FantasyWorkshop');r.onsuccess=()=>{const d=r.result;const q=d.transaction('works').objectStore('works').getAll();q.onsuccess=()=>{resolve(q.result.find(w=>w.title==='定稿验证作品'));d.close();};};r.onerror=()=>reject(r.error);}));
 await page.goto(baseUrl+'/workbench?work='+record.id);await page.waitForURL('**/work/'+record.slug);
 for (const title of ['批量作品甲', '批量作品乙']) {
   await page.goto(baseUrl+'/work/'+record.slug);
   await page.getByRole('button',{name:'创建修订草稿',exact:true}).click();
   await page.getByRole('textbox',{name:'作品标题',exact:true}).fill(title);
   assert.equal(await page.getByRole('textbox',{name:'作品标题',exact:true}).inputValue(),title);
   await page.getByRole('button',{name:'完全保存',exact:true}).click();
   assert.ok((await page.getByRole('dialog').innerText()).includes(title), 'confirmation must show latest title: '+title);
   await page.getByRole('button',{name:'确认完全保存',exact:true}).click();
   await page.waitForURL('**/library?type=finished');
 }
 await page.goto(baseUrl+'/projects');
 await page.getByRole('heading',{name:'验证书籍',exact:true}).waitFor();
 await nameDialog('添加章节','章节名称','第二章','添加章节');
 await page.getByRole('button',{name:'收录作品',exact:true}).click();
 await page.getByRole('checkbox',{name:/批量作品乙/}).check();
 await page.getByRole('checkbox',{name:/批量作品甲/}).check();
 await page.getByLabel('搜索候选作品').fill('不存在的标题');
 await page.getByText(/已选 2 篇/).waitFor();
 await page.getByLabel('目标章节').selectOption({label:'第二章'});
 await page.getByRole('button',{name:'收录到章节',exact:true}).click();
 const second = page.locator('.book-chapter').filter({has:page.getByRole('heading',{name:'2. 第二章',exact:true})});
 await second.getByRole('link',{name:/批量作品甲/}).waitFor();
 assert.deepEqual(await second.locator('li > a').allTextContents(),['批量作品乙','批量作品甲']);
 await second.getByRole('button',{name:'上移作品 批量作品甲',exact:true}).click();
 await page.waitForFunction(()=>document.querySelectorAll('.book-chapter')[1]?.querySelector('li > a')?.textContent==='批量作品甲');
 await page.getByLabel('作品操作 批量作品乙',{exact:true}).click();
 await page.getByLabel('将 批量作品乙 移到章节').selectOption({label:'第一章'});
 await page.reload();
 await page.getByRole('link',{name:/批量作品甲/}).waitFor();
 assert.deepEqual(await page.locator('.book-chapter').first().locator('li > a').allTextContents(),['定稿验证作品','批量作品乙']);
 assert.deepEqual(await page.locator('.book-chapter').nth(1).locator('li > a').allTextContents(),['批量作品甲']);
 await nameDialog('创建书籍','书籍名称','另一部书','创建书籍');
 await page.getByRole('heading',{name:'另一部书',exact:true}).waitFor();
 await nameDialog('添加章节','章节名称','共享章节','添加章节');
 await collectOne('共享章节','定稿验证作品');
 await page.getByRole('link',{name:'定稿验证作品',exact:true}).waitFor();
 await page.setViewportSize({width:390,height:844});await page.goto(baseUrl+'/projects');await page.getByLabel('当前书籍').selectOption({label:'验证书籍'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.getByRole('button',{name:'收录作品',exact:true}).click();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.getByRole('button',{name:'关闭对话框',exact:true}).click();
 for (const width of [320,390,768,1440]) {
   await page.setViewportSize({width,height:1000});
   await page.screenshot({path:'tmp/books-ui-'+width+'.png',fullPage:true});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow at '+width);
 }
 // New dialogs: cancellation, focus restoration, search-retained selection and mobile reader.
 await page.getByRole('button',{name:'创建书籍',exact:true}).click();
 assert.equal(await page.getByLabel('书籍名称',{exact:true}).evaluate(el=>el===document.activeElement),true);
 await page.getByLabel('书籍名称',{exact:true}).fill('不应创建');
 await page.keyboard.press('Escape');
 assert.equal(await page.getByRole('dialog').count(),0);
 assert.equal(await page.getByRole('button',{name:'创建书籍',exact:true}).evaluate(el=>el===document.activeElement),true);
 assert.equal(await page.getByRole('button',{name:/不应创建/}).count(),0);
 await page.getByRole('button',{name:/另一部书/}).click();
 await page.getByRole('button',{name:'收录作品',exact:true}).click();
 await page.getByRole('checkbox',{name:/批量作品乙/}).check();
 await page.getByLabel('搜索候选作品').fill('无匹配');
 await page.getByRole('button',{name:'仅看已选 1',exact:true}).click();
 assert.equal(await page.getByRole('checkbox',{name:/批量作品乙/}).isChecked(),true);
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'tmp/books-drawer-mobile.png'});
 await page.keyboard.press('Escape');
 await page.getByText('还有未收录的选择，是否放弃？',{exact:true}).waitFor();
 await page.getByRole('button',{name:'继续选择',exact:true}).click();
 assert.equal(await page.getByRole('checkbox',{name:/批量作品乙/}).isChecked(),true);
 await page.getByRole('button',{name:'关闭对话框',exact:true}).click();
 await page.getByRole('button',{name:'放弃并关闭',exact:true}).click();
 await page.getByRole('link',{name:'整书阅读',exact:true}).click();
 await page.getByRole('button',{name:'打开目录',exact:true}).click();
 await page.getByRole('dialog').getByRole('link',{name:'定稿验证作品',exact:true}).click();
 await page.getByRole('dialog').waitFor({state:'hidden'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:'tmp/books-reader-mobile.png',fullPage:true});
 await page.goto(baseUrl+'/library?type=finished');
 await page.getByRole('link',{name:'定稿验证作品',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:'tmp/books-workspace-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]); console.log('PASS: finalize, finished partition, projects, batch selection/order, search retention, sorting, cross-chapter move, shared works, persistence, readonly redirect, mobile layout');
 }catch(error){ await page.screenshot({path:'tmp/books-ui-failure.png',fullPage:true}); console.error(await page.evaluate(()=>new Promise(resolve=>{const r=indexedDB.open('FantasyWorkshop');r.onsuccess=()=>{const d=r.result;const q=d.transaction('works').objectStore('works').getAll();q.onsuccess=()=>{resolve(q.result.map(w=>({title:w.title,finalizedAt:w.finalizedAt})));d.close();};};}))); throw error; }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

