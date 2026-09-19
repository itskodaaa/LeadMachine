import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  specs: 'Standard precision CNC machining and engineering tolerances.',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function runTitanium() {
  console.log('\n--- Testing Titanium Clicking a.wsite-button ---');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    page.on('response', async resp => {
      if (resp.url().includes('formSubmitAjax.php')) {
        console.log('[Titanium AJAX Resp]', resp.status(), await resp.text());
      }
    });

    await page.goto('https://www.titaniumengineers.com/request-a-quote.html', { waitUntil: 'networkidle2', timeout: 20000 });

    await page.type('#input-825472944891523769', OUTREACH_PROFILE.firstName);
    await page.type('#input-825472944891523769-1', OUTREACH_PROFILE.lastName);
    await page.type('#input-346001875812142730', OUTREACH_PROFILE.company);
    await page.type('#input-639320241662572479', OUTREACH_PROFILE.email);
    await page.click('#radio-0-_u551446107367226383');
    await page.type('#input-797669080850384012', OUTREACH_PROFILE.message);
    await page.type('#input-722875732142785503', OUTREACH_PROFILE.specs);

    console.log('All required fields populated. Clicking a.wsite-button...');
    await page.click('a.wsite-button');

    await new Promise(r => setTimeout(r, 6000));
    const result = await page.evaluate(() => {
      return document.body.innerText.slice(0, 600);
    });
    console.log('Titanium text after submission:\n', result);

  } catch (e) {
    console.log('Titanium error:', e.message);
  } finally {
    await browser.close();
  }
}

runTitanium();
