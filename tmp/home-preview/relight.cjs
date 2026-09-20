const {chromium}=require('C:/Users/fufu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-webgl','--enable-unsafe-swiftshader']});
 const p=await b.newPage({viewport:{width:1440,height:900}}); const errors=[]; p.on('pageerror',e=>errors.push(e.message)); p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await p.goto('http://localhost:3100',{waitUntil:'networkidle'});
 await p.locator('canvas[data-ready="true"]').waitFor({timeout:20000});
 await p.getByRole('button',{name:/光影随时间流转/}).click();
 for(const [name,hour] of [['morning','8'],['noon','12'],['evening','17'],['night','0']]){
  await p.locator('#dream-hour').fill(hour); await p.waitForTimeout(1700);
  await p.screenshot({path:`tmp/home-preview/relight-${name}.png`});
 }
 await p.getByRole('button',{name:'法线图',exact:true}).click();
 await p.screenshot({path:'tmp/home-preview/relight-normal.png'});
 console.log('errors',errors); await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
