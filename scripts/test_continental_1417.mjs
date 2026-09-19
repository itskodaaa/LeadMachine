import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  company: 'Northeast Precision Machinery, Inc.',
  message: `Hello,

I am reaching out to express our interest in your precision machining and specialty components manufacturing services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function testContinental() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  console.log('Navigating to https://continentalprecision.com/contactPage2.html ...');
  await page.goto('https://continentalprecision.com/contactPage2.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  console.log('Filling EmailMeForm fields...');
  await page.type('#element_0', OUTREACH_PROFILE.fullName, { delay: 20 });
  await page.type('#element_1', OUTREACH_PROFILE.email, { delay: 20 });
  await page.type('#element_1_confirm', OUTREACH_PROFILE.email, { delay: 20 });
  await page.type('#element_2', OUTREACH_PROFILE.company, { delay: 20 });
  await page.type('#element_3', OUTREACH_PROFILE.message, { delay: 10 });

  console.log('Clicking submit...');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {}),
    page.click('input[type="submit"]')
  ]);

  console.log('After submit URL:', page.url());
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Body snippet:\n', bodyText.slice(0, 600));

  await browser.close();
}

testContinental();
