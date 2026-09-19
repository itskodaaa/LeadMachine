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
  phone: '(708) 568-3708',
  subject: 'Exploring Collaboration Opportunities',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you. Sincerely, Pamela Jameson'
};

async function testUzunHoneypot() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });

  const page = await browser.newPage();
  await page.goto('https://uzuncase.com/contact/', { waitUntil: 'networkidle2', timeout: 25000 });

  // DO NOT touch input_7 (honeypot!)
  await page.type('#input_1_6', OUTREACH_PROFILE.fullName);
  await page.type('#input_1_2', OUTREACH_PROFILE.phone);
  await page.type('#input_1_3', OUTREACH_PROFILE.email);
  await page.select('#input_1_4', 'General Information Request / Other');
  await page.type('#input_1_5', OUTREACH_PROFILE.message);

  console.log('Uzun+Case form filled correctly without touching honeypot. Submitting...');
  const submitBtn = await page.$('#gform_submit_button_1');
  if (submitBtn) {
    await Promise.all([
      submitBtn.click(),
      page.waitForNavigation({ timeout: 15000, waitUntil: 'domcontentloaded' }).catch(() => {})
    ]);
  }

  await new Promise(r => setTimeout(r, 5000));
  const postHtml = await page.evaluate(() => {
    const confirmation = document.querySelector('.gform_confirmation_message, #gforms_confirmation_message_1, .gform_validation_errors');
    return {
      confirmation: confirmation ? confirmation.innerText : null,
      bodyExcerpt: document.body.innerText.substring(0, 500)
    };
  });
  console.log('Uzun+Case post-submission result:', postHtml);

  await page.close();
  await browser.close();
}

testUzunHoneypot();
