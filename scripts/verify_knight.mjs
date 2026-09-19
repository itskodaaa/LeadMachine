import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '7085683708',
  message: `Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.`
};

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.goto('https://www.123formbuilder.com/form-1484936/', { waitUntil: 'networkidle2', timeout: 20000 });
  const inputs = await page.$$('input[type="text"], input[type="email"], textarea');
  await inputs[0].type(OUTREACH_PROFILE.fullName);
  await inputs[1].type(OUTREACH_PROFILE.email);
  await inputs[2].type(OUTREACH_PROFILE.phone);
  await inputs[3].type(OUTREACH_PROFILE.message);

  console.log('Submitting...');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(e => console.log('Nav:', e.message)),
    page.click('button[type="submit"], input[type="submit"]')
  ]);

  console.log('Final URL:', page.url());
  console.log('Final Title:', await page.title());
  const text = await page.evaluate(() => document.body.innerText);
  console.log('Page text snippet:', text.substring(0, 300));

  await browser.close();
}

run();
