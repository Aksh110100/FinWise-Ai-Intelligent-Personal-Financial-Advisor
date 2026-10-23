const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  await page.goto('http://localhost:3000/login');
  await page.type('input[type="email"]', 'patel@gmail.com');
  await page.type('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
  console.log('Navigated to dashboard, going to reports...');
  await page.goto('http://localhost:3000/reports');
  
  // wait a bit for react to crash or render
  await new Promise(r => setTimeout(r, 5000));
  
  await browser.close();
})();
