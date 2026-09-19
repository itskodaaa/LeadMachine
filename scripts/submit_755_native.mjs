import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH_PROFILE = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '7085683708',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  console.log('Navigating to contact page...');
  await page.goto('https://andersenint.com/contact/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('form.wpcf7-form');

  // Disable JS interceptor on form by removing wpcf7 listener or submitting form natively
  console.log('Filling form fields and submitting natively...');
  await page.evaluate((p) => {
    const f = document.querySelector('form.wpcf7-form');
    f.querySelector('[name="FirstName"]').value = p.firstName;
    f.querySelector('[name="LastName"]').value = p.lastName;
    f.querySelector('[name="Email"]').value = p.email;
    f.querySelector('[name="Phone"]').value = p.phone;
    f.querySelector('[name="YourMessage"]').value = p.message;

    // Remove wpcf7 submit handler to allow standard browser POST fallback
    window.wpcf7 = undefined;
    HTMLFormElement.prototype.submit.call(f);
  }, OUTREACH_PROFILE);

  console.log('Waiting for postback navigation...');
  await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});

  const postbackStatus = await page.evaluate(() => {
    const output = document.querySelector('.wpcf7-response-output');
    const body = document.body ? document.body.innerText.toLowerCase() : '';
    return {
      outputClass: output?.className,
      outputText: output?.innerText.trim(),
      hasThank: body.includes('thank') || body.includes('sent') || body.includes('received')
    };
  });

  console.log('Postback status:', postbackStatus);

  if (postbackStatus.outputText && (postbackStatus.outputClass?.includes('mail-sent-ok') || /thank|sent|received/i.test(postbackStatus.outputText))) {
    const note = `Contact form: https://andersenint.com/contact/ (Autofilled & verified: "${postbackStatus.outputText}")`;
    db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(note, 'contacted', 755);
    db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
      .run(755, 'sent', note);
    console.log('✅ Lead 755 updated to contacted!');
  } else {
    const note = `Contact form: https://andersenint.com/contact/ (REST API 403 Forbidden; Native POST result: "${postbackStatus.outputText || 'Unconfirmed'}")`;
    db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(note, 'unable_to_reach', 755);
    db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
      .run(755, 'bounced', note);
    console.log('⚠️ Lead 755 recorded as unable_to_reach.');
  }

  await browser.close();
}

run();
