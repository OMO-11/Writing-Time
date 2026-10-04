/* eslint-disable @typescript-eslint/no-require-imports */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.BASE_URL || 'http://localhost:3101';
(async()=>{const b=await chromium.launch({channel:'msedge'});const p=await b.newPage({viewport:{width:1440,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));const out='docs/workshop-ui-evidence/home-continuity';fs.mkdirSync(out,{recursive:true});
try {
 await p.goto(base+'/workbench');
 await p.getByRole('textbox',{name:'作品标题',exact:true}).fill('已定稿的旅行札记');
 await p.getByRole('button',{name:'完全保存',exact:true}).click();
 await p.getByRole('button',{name:'确认完全保存',exact:true}).click();await p.waitForURL('**/library?type=finished');
 await p.goto(base+'/workshop');
 await p.getByRole('link',{name:'阅读定稿',exact:true}).waitFor();
 assert.match(await p.locator('.hero-continue').getAttribute('href'),/^\/work\//);
 assert.match(await p.getByRole('link',{name:'阅读《已定稿的旅行札记》',exact:true}).getAttribute('href'),/^\/work\//);
 assert.equal(await p.getByRole('link',{name:'编辑《已定稿的旅行札记》',exact:true}).count(),0);
 await p.getByRole('link',{name:/开启第一本书/}).click();
 for(const title of ['早先的书','最新编订的书']) {
  await p.getByRole('button',{name:'创建书籍',exact:true}).click();
  await p.getByLabel('书籍名称',{exact:true}).fill(title);
  await p.getByRole('dialog').getByRole('button',{name:'创建书籍',exact:true}).click();
  await p.getByRole('heading',{name:title,exact:true}).waitFor();
 }
 await p.getByRole('button',{name:'添加章节',exact:true}).click();
 await p.getByLabel('章节名称',{exact:true}).fill('雾中的第一封信');
 await p.getByRole('dialog').getByRole('button',{name:'添加章节',exact:true}).click();await p.getByRole('dialog').waitFor({state:'hidden'});
 await p.goto(base+'/workshop');await p.locator('.home-book-entry').filter({hasText:'最新编订的书'}).waitFor();
 assert.equal(await p.locator('.home-book-entry').count(),1);
 assert.ok((await p.locator('.home-book-entry').innerText()).includes('1 章 · 0 篇定稿'));
 for(const width of [1440,768,390,320]) {await p.setViewportSize({width,height:1000});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);if(width===1440||width===390) await p.screenshot({path:`${out}/home-${width}.png`,fullPage:true});}
 await p.locator('.home-book-entry').click();await p.getByRole('heading',{name:'最新编订的书',exact:true}).waitFor();
 await p.goto(base+'/workshop');await p.getByText('定制主页模块',{exact:true}).click();await p.getByRole('button',{name:'隐藏最近编订',exact:true}).click();await p.reload();await p.locator('#welcome-title').waitFor();
 await p.getByText('定制主页模块',{exact:true}).click();await p.getByRole('button',{name:'显示最近编订',exact:true}).waitFor();assert.equal(await p.locator('.recent-book-module').count(),0);await p.getByRole('button',{name:'显示最近编订',exact:true}).click();await p.locator('.home-book-entry').waitFor();
 await p.getByRole('button',{name:/新建文章/}).click();await p.waitForURL('**/workbench?work=*');await p.getByRole('textbox',{name:'作品标题',exact:true}).fill('仍在书写的草稿');
 await p.getByRole('link',{name:'保存并返回 Fantasy Workshop 首页',exact:true}).click();await p.waitForURL('**/workshop');await p.getByRole('link',{name:'继续编辑',exact:true}).waitFor();assert.match(await p.locator('.hero-continue').getAttribute('href'),/^\/workbench\?work=/);
 assert.deepEqual(errors,[]);console.log('PASS readonly/draft home actions, latest book and chapter counts, shared directory navigation, saved module preference, four widths');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
