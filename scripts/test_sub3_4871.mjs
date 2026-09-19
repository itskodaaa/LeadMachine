import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: CHROME_BIN, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  page.on('response', async (res) => {
    if (res.url().includes('SaveFormSubmission') || res.url().includes('form')) {
      console.log('Response:', res.url(), res.status());
      try {
        console.log('Body:', (await res.text()).slice(0, 300));
      } catch (e) {}
    }
  });

  await page.goto('https://www.qualitysteelfab.com/contact', { waitUntil: 'networkidle2', timeout: 30000 });

  // Type directly into selectors
  console.log('Typing fields...');
  await page.type('input[name="fname"]', 'Pamela', { delay: 30 });
  await page.type('input[name="lname"]', 'Jameson', { delay: 30 });
  await page.type('input[id*="email"]', 'pamela.jameson@nortiheastprecision.com', { delay: 20 });
  await page.type('input[id*="text"]', 'Exploring Collaboration Opportunities', { delay: 20 });
  await page.type('textarea[id*="textarea"]', 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you for your time and attention.', { delay: 10 });

  await new Promise(r => setTimeout(r, 1000));
  console.log('Clicking submit...');
  await page.click('button[type="submit"]');

  await new Promise(r => setTimeout(r, 6000));
  const result = await page.evaluate(() => {
    const success = document.querySelector('.form-submission-text, .form-submission-html, .form-submitted')?.innerText;
    return { success, bodyExcerpt: document.body.innerText.slice(0, 400) };
  });
  console.log('Result:', result);

  await browser.close();
})();
