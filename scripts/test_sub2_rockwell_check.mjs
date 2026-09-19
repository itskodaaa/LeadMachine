import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  zip: '60601',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function testRockwell() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  page.on('response', async resp => {
    const u = resp.url();
    if (u.includes('admin-ajax.php') || (u.includes('rockwellprecision.com') && resp.request().method() === 'POST')) {
      console.log(`[Rockwell POST Resp] ${resp.status()} ${u}`);
      try {
        const text = await resp.text();
        console.log(`[Rockwell POST Body snippet] ${text.slice(0, 300)}`);
      } catch (e) {}
    }
  });

  await page.goto('https://rockwellprecision.com/contact/', { waitUntil: 'networkidle2', timeout: 20000 });

  // Fill form
  await page.type('#input_7_100', OUTREACH_PROFILE.firstName);
  await page.type('#input_7_101', OUTREACH_PROFILE.lastName);
  await page.type('#input_7_103', OUTREACH_PROFILE.phone);
  await page.type('#input_7_102', OUTREACH_PROFILE.email);
  await page.type('#input_7_7', OUTREACH_PROFILE.zip);
  await page.type('#input_7_104', OUTREACH_PROFILE.message);

  console.log('Filled form. Submitting using click on #gform_submit_button_7...');
  await page.click('#gform_submit_button_7');

  await new Promise(r => setTimeout(r, 6000));

  const afterSubmit = await page.evaluate(() => {
    const alerts = Array.from(document.querySelectorAll('.gform_confirmation_message, .gfield_error, .validation_error, .gform_footer, .gform_wrapper')).map(el => ({
      class: el.className,
      text: el.innerText
    }));
    return {
      alerts,
      bodySnippet: document.body.innerText.slice(0, 500)
    };
  });
  console.log('After submit info:', JSON.stringify(afterSubmit, null, 2));

  await browser.close();
}

testRockwell();
