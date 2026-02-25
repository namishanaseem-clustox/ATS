const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({headless: "new"});
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/login');
  await page.waitForSelector('input[name="email"]');
  await page.type('input[name="email"]', 'owner@clustox.com');
  await page.type('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
  
  // Go to settings profile
  await page.goto('http://localhost:5173/settings');
  await page.waitForSelector('h3'); // wait for Profile Picture 
  // Add 1 second delay just to make sure rendering is complete
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: '/home/ct-20032/.gemini/antigravity/brain/7ff56c4b-d37a-4c8b-b7c0-bd0a284c6845/verify_proper_saas_ui.png' });
  await browser.close();
  console.log('Screenshot saved');
})();
