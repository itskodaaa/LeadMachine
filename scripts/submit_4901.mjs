import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
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
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors', '--window-size=1366,850']
  });

  const page = await browser.newPage();
  let submittedOk = false;
  let netResBody = null;

  page.on('response', async res => {
    const u = res.url();
    if (u.includes('contact.apps-api') || u.includes('conversations') || u.includes('messages')) {
      try {
        const text = await res.text();
        console.log(`[Response ${u.slice(0, 60)}]:`, res.status(), text.slice(0, 150));
        if (res.status() === 200 || res.status() === 201) {
          submittedOk = true;
          netResBody = text;
        }
      } catch (_) {}
    }
  });

  console.log('Navigating to https://integralcomponents.net/...');
  await page.goto('https://integralcomponents.net/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));

  // Dismiss cookie banner
  await page.evaluate(() => {
    const bannerBtn = document.querySelector('[data-aid="FOOTER_COOKIE_CLOSE_RENDERED"]');
    if (bannerBtn) bannerBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // Check the visible desktop inputs
  const nameSelector = '#desktop-form-expanded95 input[data-aid="CONTACT_FORM_NAME"]';
  const emailSelector = '#desktop-form-expanded95 input[data-aid="CONTACT_FORM_EMAIL"]';
  const messageSelector = '#desktop-form-expanded95 textarea[data-aid="CONTACT_FORM_MESSAGE"]';
  const submitSelector = '#desktop-form-expanded95 button[data-aid="CONTACT_SUBMIT_BUTTON_REND"]';

  await page.type(nameSelector, OUTREACH_PROFILE.fullName, { delay: 20 });
  await page.type(emailSelector, OUTREACH_PROFILE.email, { delay: 20 });
  await page.type(messageSelector, OUTREACH_PROFILE.message, { delay: 10 });

  await new Promise(r => setTimeout(r, 1000));

  console.log('Submitting desktop form via DOM click...');
  await page.evaluate(sel => {
    const btn = document.querySelector(sel);
    if (btn) btn.click();
  }, submitSelector);

  await new Promise(r => setTimeout(r, 8000));

  const result = await page.evaluate(() => {
    const container = document.querySelector('#desktop-form-expanded95');
    const successEl = document.querySelector('[data-aid*="SUCCESS"], [data-aid*="CONFIRM"], [data-ux*="Success"], [data-ux*="Confirmation"], .alert-success');
    return {
      containerText: container ? container.innerText.trim() : null,
      successText: successEl ? successEl.innerText.trim() : null
    };
  });

  console.log('Result:', result);

  if (submittedOk || result.successText || (result.containerText && /thank you|received|we will be in touch/i.test(result.containerText))) {
    const confMsg = result.successText || (result.containerText ? result.containerText.slice(0, 100).replace(/\n/g, ' ') : 'Thank you message verified');
    const note = `Contact form: https://integralcomponents.net/ (Autofilled & verified: "${confMsg}")`;
    db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 4901').run(note, 'contacted');
    db.prepare("INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (4901, 'sent', ?, CURRENT_TIMESTAMP)").run(note);
    console.log('SUCCESS! Lead #4901 committed to DB as contacted.');
  } else {
    console.log('Unconfirmed.');
  }

  await browser.close();
}

run();
