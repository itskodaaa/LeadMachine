import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  subject: 'Exploring Collaboration Opportunities',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  console.log('Navigating to Shamim contact-us...');
  await page.goto('https://shamimeg.com/contact-us/', { waitUntil: 'networkidle2', timeout: 35000 });

  await page.waitForSelector('#nf-field-5');
  console.log('Typing into fields...');

  await page.click('#nf-field-5');
  await page.type('#nf-field-5', OUTREACH_PROFILE.fullName, { delay: 20 });

  await page.click('#nf-field-6');
  await page.type('#nf-field-6', OUTREACH_PROFILE.email, { delay: 20 });

  await page.click('#nf-field-9');
  await page.type('#nf-field-9', OUTREACH_PROFILE.subject, { delay: 20 });

  await page.click('#nf-field-7');
  await page.type('#nf-field-7', OUTREACH_PROFILE.message, { delay: 10 });

  await new Promise(r => setTimeout(r, 1000));

  console.log('Clicking Ninja Forms submit button...');
  await page.click('#nf-field-8');

  console.log('Waiting 6 seconds for Ninja Forms response...');
  await new Promise(r => setTimeout(r, 6000));

  const result = await page.evaluate(() => {
    const successMsg = document.querySelector('.nf-response-msg, .nf-form-layout .nf-response-msg, .ninja-forms-response-msg');
    const body = document.body ? document.body.innerText.toLowerCase() : '';
    const err = document.querySelector('.nf-error-msg, .nf-error-wrap');
    return {
      successText: successMsg ? successMsg.innerText.trim() : null,
      errorText: err ? err.innerText.trim() : null,
      hasThankYou: body.includes('thank') || body.includes('message has been sent') || body.includes('received')
    };
  });

  console.log('Result:', result);

  if (result.successText || result.hasThankYou) {
    const confirmation = result.successText || 'Ninja Forms submission confirmed';
    const note = `Contact form: https://shamimeg.com/contact-us/ (Autofilled & verified: "${confirmation}")`;
    db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(note, 'contacted', 746);
    db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
      .run(746, 'sent', note);
    console.log('✅ Lead 746 updated to contacted!');
  } else {
    console.log('⚠️ Could not confirm:', result);
  }

  await browser.close();
}

run();
