const {chromium}=require('C:/Users/fufu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sharp=require('sharp');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-webgl','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 await page.goto('http://localhost:3100',{waitUntil:'networkidle'});await page.locator('canvas[data-ready="true"]').waitFor();
 await page.getByRole('button',{name:/光影随时间流转/}).click();
 await page.locator('#dream-softness').fill('0');
 const frames=[];let i=0;
 for(const hour of [6,8,10,12,14,16,18,0]){
  await page.locator('#dream-hour').fill(String(hour));await page.waitForTimeout(100);
  const shot=await page.screenshot({clip:{x:740,y:60,width:440,height:500}});
  frames.push({input:await sharp(shot).resize(264,300).toBuffer(),left:(i%4)*264,top:Math.floor(i/4)*300});i++;
 }
 await sharp({create:{width:1056,height:600,channels:3,background:'#111'}}).composite(frames).png().toFile('tmp/home-preview/hard-light-cycle.png');
 await page.locator('#dream-hour').fill('16');await page.waitForTimeout(100);await page.getByRole('button',{name:/正在预览光影/}).click();await page.screenshot({path:'tmp/home-preview/hard-light-final.png'});
 console.log('Minimum-softness sweep captured');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
