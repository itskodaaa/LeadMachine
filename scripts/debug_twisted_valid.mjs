import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('https://twistedmetalswelding.com', { waitUntil: 'networkidle2', timeout: 20000 });

  await page.type('[data-aid="CONTACT_FORM_NAME"]', 'Pamela Jameson');
  await page.type('[data-aid="CONTACT_FORM_EMAIL"]', 'pamela.jameson@nortiheastprecision.com');
  await page.type('[data-aid="CONTACT_FORM_MESSAGE"]', 'Hello, requesting a quote for upcoming custom metal fabrication work.');

  const formStatus = await page.evaluate(() => {
    const form = document.querySelectorAll('form')[1];
    const inputs = Array.from(form.querySelectorAll('input, textarea'));
    return {
      formValid: form.checkValidity(),
      inputs: inputs.map(i => ({
        id: i.id,
        name: i.name,
        val: i.value,
        valid: i.checkValidity(),
        validationMessage: i.validationMessage
      }))
    };
  });

  console.log('Form status:', JSON.stringify(formStatus, null, 2));
  await browser.close();
}

run();
