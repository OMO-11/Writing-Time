const {chromium}=require('C:/Users/fufu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-webgl','--enable-unsafe-swiftshader']});
 try {
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
 const page=await context.newPage();await page.goto('http://localhost:3100',{waitUntil:'domcontentloaded'});
 await page.locator('.portal-root[data-booting="false"]').waitFor();
 await page.getByRole('button',{name:'开启我的空间',exact:true}).click();
 await page.locator('.portal-root[data-scene="map"][data-phase="idle"]').waitFor();
 const cdp=await context.newCDPSession(page),frames=[];
 cdp.on('Page.screencastFrame',async f=>{frames.push({data:f.data,time:f.metadata.timestamp});await cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId}).catch(()=>{});});
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:78,maxWidth:960,maxHeight:600,everyNthFrame:1});
 await page.waitForTimeout(300);
 await page.locator('[data-map-place="gallery"]').click();
 await page.waitForURL('**/archive-gallery');
 await page.getByRole('link',{name:'保存并返回地图'}).waitFor();
 await page.waitForTimeout(350);await page.getByRole('link',{name:'保存并返回地图'}).click();
 await page.locator('.portal-root[data-scene="map"][data-phase="idle"]').waitFor();
 await page.waitForTimeout(350);await cdp.send('Page.stopScreencast');
 const b64=await page.evaluate(async frames=>{
  const canvas=document.createElement('canvas');canvas.width=960;canvas.height=600;
  const ctx=canvas.getContext('2d'),stream=canvas.captureStream(24),chunks=[];
  const recorder=new MediaRecorder(stream,{mimeType:'video/webm',videoBitsPerSecond:2200000});
  const stopped=new Promise(resolve=>recorder.onstop=resolve);recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();
  for(let i=0;i<frames.length;i++) {
   const image=new Image();image.src='data:image/jpeg;base64,'+frames[i].data;await image.decode();ctx.drawImage(image,0,0,960,600);
   const delay=i+1<frames.length?Math.max(20,Math.min(250,(frames[i+1].time-frames[i].time)*1000)):200;
   await new Promise(resolve=>setTimeout(resolve,delay));
  }
  recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());
  return await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(new Blob(chunks,{type:'video/webm'}));});
 },frames);
 fs.writeFileSync('docs/world-map-evidence/polish/journey-roundtrip.webm',Buffer.from(b64,'base64'));console.log('Recorded',frames.length,'frames');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
