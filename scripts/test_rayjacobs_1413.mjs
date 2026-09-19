import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  message: `Hello,

I am reaching out to express our interest in your industrial equipment and machinery services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function testRayJacobs() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--ignore-certificate-errors']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  console.log('Navigating to https://www.rayjacobs.com/contact-us/ ...');
  await page.goto('https://www.rayjacobs.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));

  console.log('Filling Gravity Form fields...');
  await page.type('#input_3_1', OUTREACH_PROFILE.fullName, { delay: 20 });
  await page.type('#input_3_2', OUTREACH_PROFILE.phone, { delay: 20 });
  await page.type('#input_3_3', OUTREACH_PROFILE.email, { delay: 20 });
  await page.type('#input_3_4', OUTREACH_PROFILE.message, { delay: 10 });

  console.log('Clicking Submit button...');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {}),
    page.click('#gform_submit_button_3')
  ]);

  console.log('After submit, current URL:', page.url());
  const result = await page.evaluate(() => {
    const confirmation = document.querySelector('.gform_confirmation_message, .gforms_confirmation_message, .validation_error, .gfield_description.validation_message');
    return {
      msg: confirmation ? confirmation.innerText : null,
      html: confirmation ? confirmation.outerHTML : null,
      pageSnippet: document.body.innerText.slice(0, 600)
    };
  });

  console.log('Result:\n', JSON.stringify(result, null, 2));
  await browser.close();
}

testRayJacobs();
