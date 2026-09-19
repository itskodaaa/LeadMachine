import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  page.on('response', async res => {
    if (res.url().includes('submissions') || (res.request().method() === 'POST' && res.url().includes('hsforms'))) {
      console.log('HubSpot POST Response:', res.status(), res.url());
      try {
        console.log('Body:', (await res.text()).slice(0, 300));
      } catch(e) {}
    }
  });

  await page.goto('https://info.burnsmcd.com/contact-us', { waitUntil: 'domcontentloaded', timeout: 20000 });
  
  await page.waitForSelector('input[name="firstname"]', { timeout: 15000 });

  await page.type('input[name="firstname"]', 'Pamela');
  await page.type('input[name="lastname"]', 'Jameson');
  await page.type('input[name="email"]', 'pamela.jameson@nortiheastprecision.com');
  await page.type('input[name="phone"]', '708-568-3708');
  await page.type('input[name="company"]', 'Northeast Precision Machinery, Inc.');
  
  await page.select('select[name="industry_dropdown"]', 'Manufacturing');
  await page.select('select[name="inquiry_type"]', 'General Inquiry');
  
  await page.type('textarea[name="message_website"]', 'Exploring Collaboration Opportunities - Interested in your engineering services and discussing potential partnership.');

  console.log('Clicking Submit on Burns & McDonnell...');
  await page.click('input[type="submit"]');

  await new Promise(r => setTimeout(r, 6000));

  const postState = await page.evaluate(() => {
    const thank = document.querySelector('.submitted-message, .hs-form-submitted, [data-test-id="submitted-message"]');
    const errors = Array.from(document.querySelectorAll('.hs-error-msg, [role="alert"]')).map(e => e.innerText);
    return {
      thankText: thank ? thank.innerText.trim() : null,
      errors,
      bodySnippet: document.body.innerText.slice(0, 500)
    };
  });
  console.log('Post state:', postState);

  await browser.close();
})();
