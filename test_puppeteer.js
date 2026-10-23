const puppeteer = require('puppeteer');

(async () => {
  let executablePath = '';
  try {
    executablePath = require('child_process').execSync('where chrome').toString().split('\n')[0].trim();
  } catch (e) {
    try {
      executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    } catch(e) {}
  }
  
  if (!executablePath) executablePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';

  console.log("Using Chrome at:", executablePath);

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.toString());
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
    }
  });

  console.log("Navigating to login...");
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  
  await page.type('input[type="email"]', 'test_report_user@example.com');
  await page.type('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  console.log("Logged in!");

  console.log("Navigating to reports...");
  await page.goto('http://localhost:3000/reports', { waitUntil: 'networkidle2' });
  
  await page.waitForTimeout(2000);
  
  const content = await page.content();
  if (content.includes('SEE THE STORY')) {
    console.log("Reports page rendered successfully.");
  } else {
    console.log("Reports page did not render successfully. Content snippet:", content.substring(0, 500));
  }
  
  await browser.close();
})();
