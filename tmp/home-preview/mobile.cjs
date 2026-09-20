const { chromium } = require('C:/Users/fufu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:375,height:812},isMobile:true,hasTouch:true});
 await page.goto('http://localhost:3100',{waitUntil:'networkidle'});
 await page.screenshot({path:'tmp/home-preview/mobile-fresh.png'});
 console.log(await page.evaluate(()=>({scroll:scrollY,height:innerHeight,body:document.body.scrollHeight,main:document.querySelector('main').getBoundingClientRect().toJSON()})));
 await page.getByRole('button',{name:'开启我的空间'}).click();
 await page.waitForTimeout(900);
 await page.getByText('故事，还在延续').scrollIntoViewIfNeeded();
 await page.getByRole('button',{name:'关闭空间选择'}).click();
 await page.waitForTimeout(900);
 console.log('close focus',await page.getByRole('button',{name:'开启我的空间'}).evaluate(el=>document.activeElement===el));
 await page.setViewportSize({width:812,height:375});
 await page.screenshot({path:'tmp/home-preview/landscape.png',fullPage:true});
 console.log('landscape overflow',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
 await browser.close();
})()
