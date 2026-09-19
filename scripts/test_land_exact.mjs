import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function testLand() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.goto('https://www.land.engineering/contact', { waitUntil: 'networkidle2', timeout: 25000 });

  // Listen to network requests on submit
  page.on('response', async res => {
    if (res.url().includes('wix') || res.url().includes('form')) {
      console.log('Response:', res.status(), res.url());
      try {
        const text = await res.text();
        if (text.length < 500) console.log('Resp body:', text);
      } catch (e) {}
    }
  });

  await page.type('input[aria-label="First name"]', 'Pamela', { delay: 30 });
  await page.type('input[aria-label="Last name"]', 'Jameson', { delay: 30 });
  await page.type('input[aria-label="Email"]', 'pamela.jameson@nortiheastprecision.com', { delay: 30 });
  // Skip phone or enter valid phone
  // Wix phone with country code:
  // Let's click the country code button if present, or just leave phone blank since it's optional!
  await page.type('input[aria-label="Subject"]', 'Exploring Collaboration Opportunities', { delay: 30 });
  await page.type('textarea[aria-label="Message"]', 'Hello, I am reaching out to express our interest in your services and discuss potential project quotes. Please contact me at your convenience.', { delay: 30 });

  const submitBtn = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim().toLowerCase() === 'submit');
  });

  console.log('Clicking Submit button on Land Engineering...');
  await submitBtn.click();

  await new Promise(r => setTimeout(r, 6000));

  const status = await page.evaluate(() => {
    // Check for success or error elements in the form
    const form = document.querySelector('form');
    return {
      formText: form ? form.innerText : '',
      allAlerts: Array.from(document.querySelectorAll('[role="alert"], [class*="notification"], [class*="success"], [class*="message"]')).map(el => el.innerText)
    };
  });

  console.log('Land Engineering status:', status);

  await browser.close();
}

testLand();
