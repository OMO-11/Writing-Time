const {chromium}=require('C:/Users/fufu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const sharp=require('sharp');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-webgl','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error' && !m.text().includes('404'))errors.push(m.text())});
 await page.goto('http://localhost:3100',{waitUntil:'networkidle'});
 await page.locator('canvas[data-ready="true"]').waitFor();
 assert.equal(await page.locator('canvas').getAttribute('data-pipeline'),'hdr-bloom');
 await page.getByRole('button',{name:/光影随时间流转/}).click();
 const hide=await page.addStyleTag({content:'.dream-header,.dream-welcome,.dream-footer,nextjs-portal{opacity:0!important;pointer-events:auto!important}'});
 const hours=[0,4,6,8,10,12,14,16,17.5,18.5,20,23.95];const frames=[];
 for(let i=0;i<hours.length;i++){
  await page.locator('#dream-hour').fill(String(hours[i]));await page.waitForTimeout(100);
  const shot=await page.screenshot({clip:{x:760,y:80,width:400,height:400}});
  frames.push({input:await sharp(shot).resize(300,300).toBuffer(),left:(i%4)*300,top:Math.floor(i/4)*300});
 }
 await sharp({create:{width:1200,height:900,channels:3,background:'#111'}}).composite(frames).png().toFile('tmp/home-preview/face-day-cycle.png');
 await page.locator('#dream-hour').fill('16');await page.locator('#dream-atmosphere').fill('0');await page.waitForTimeout(100);
 const raw=async()=>sharp(await page.locator('canvas').screenshot()).removeAlpha().raw().toBuffer();
 const without=await raw();await page.locator('#dream-atmosphere').fill('1.5');await page.waitForTimeout(100);const withRays=await raw();
 const diff=(a,b)=>a.reduce((sum,n,i)=>sum+Math.abs(n-b[i]),0)/a.length;
 assert(diff(without,withRays)>.15,'Atmosphere must visibly affect pixels');
 const still1=await raw();await page.waitForTimeout(600);const still2=await raw();assert(diff(still1,still2)<.00001,'Reduced motion must freeze dust (allow GPU rounding)');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(100);const moving1=await raw();await page.waitForTimeout(1500);const moving2=await raw();assert(diff(moving1,moving2)>0,'Dust must animate');
 await page.getByRole('button',{name:'暂停场景动效'}).click();await page.waitForTimeout(100);const paused1=await raw();await page.waitForTimeout(500);const paused2=await raw();assert(diff(paused1,paused2)<.00001,'Pause must freeze dust (allow GPU rounding)');
 assert.equal(await page.locator('canvas').evaluate(c=>c.getContext('webgl').getError()),0,'WebGL errors');
 await page.evaluate(()=>{window.lose=document.querySelector('canvas').getContext('webgl').getExtension('WEBGL_lose_context');window.lose.loseContext()});await page.locator('canvas[data-ready="false"]').waitFor();await page.evaluate(()=>window.lose.restoreContext());await page.locator('canvas[data-ready="true"]').waitFor();
 await hide.evaluate(el=>el.remove());await page.locator('#dream-atmosphere').fill('0.75');await page.locator('#dream-hour').fill('16');await page.waitForTimeout(1500);await page.getByRole('button',{name:/正在预览光影/}).click();await page.screenshot({path:'tmp/home-preview/atmosphere-day-final.png'});
 await page.getByRole('button',{name:/正在预览光影/}).click();await page.locator('#dream-hour').fill('0');await page.waitForTimeout(1800);await page.getByRole('button',{name:/正在预览光影/}).click();await page.screenshot({path:'tmp/home-preview/atmosphere-night-final.png'});
 await page.setViewportSize({width:375,height:812});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(100);await page.screenshot({path:'tmp/home-preview/atmosphere-mobile.png'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.getByRole('button',{name:'开启我的空间'}).click();await page.waitForTimeout(850);await page.keyboard.press('Escape');assert(await page.getByRole('button',{name:'开启我的空间'}).evaluate(el=>el===document.activeElement));
 console.log(JSON.stringify({hours,scatteringDifference:diff(without,withRays),movingDifference:diff(moving1,moving2),pauseDifference:diff(paused1,paused2),contextRecovery:true,errors},null,2));assert.deepEqual(errors,[]);await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});



