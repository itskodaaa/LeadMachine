import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function testLandHuman() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.goto('https://www.land.engineering/contact', { waitUntil: 'networkidle2', timeout: 25000 });

  async function typeInto(selector, text) {
    const el = await page.$(selector);
    await el.focus();
    await el.click();
    await new Promise(r => setTimeout(r, 100));
    await page.keyboard.type(text, { delay: 40 });
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('Typing fields...');
  await typeInto('input[aria-label="First name"]', 'Pamela');
  await typeInto('input[aria-label="Last name"]', 'Jameson');
  await typeInto('input[aria-label="Email"]', 'pamela.jameson@nortiheastprecision.com');
  await typeInto('input[aria-label="Subject"]', 'Exploring Collaboration Opportunities');
  await typeInto('textarea[aria-label="Message"]', 'Hello, I am reaching out to express interest in your services and discuss potential project quotes.');

  const submitBtn = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim().toLowerCase() === 'submit');
  });

  console.log('Clicking Submit...');
  await submitBtn.click();
  await new Promise(r => setTimeout(r, 6000));

  const afterText = await page.evaluate(() => {
    return {
      formText: document.querySelector('form')?.innerText
    };
  });
  console.log('After submit form text:\n', afterText.formText);

  await browser.close();
}

testLandHuman();
