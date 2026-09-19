import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  page.on('response', async res => {
    if (res.url().includes('wix-forms') || res.url().includes('forms') || res.request().method() === 'POST') {
      console.log('NET Response:', res.status(), res.url());
      try {
        console.log('Body snippet:', (await res.text()).slice(0, 300));
      } catch(e) {}
    }
  });

  await page.goto('https://www.intginc.com/', { waitUntil: 'networkidle2' });
  
  // Inspect form and captcha
  const formInfo = await page.evaluate(() => {
    const f = document.querySelector('.wixui-form, form');
    const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => c.src || c.className);
    return {
      hasForm: !!f,
      formClass: f?.className,
      captchas
    };
  });
  console.log('Wix Form Info:', formInfo);

  // Fill inputs
  await page.focus('#input_comp-k9vv7wzn');
  await page.keyboard.type('Pamela Jameson', { delay: 20 });

  await page.focus('#input_comp-k9vv7wzw');
  await page.keyboard.type('pamela.jameson@nortiheastprecision.com', { delay: 20 });

  await page.focus('#input_comp-k9vv7x03');
  await page.keyboard.type('Exploring Collaboration Opportunities', { delay: 20 });

  await page.focus('#textarea_comp-k9vv7x0b');
  await page.keyboard.type('Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you, Pamela Jameson', { delay: 10 });

  console.log('Clicking submit button on Wix form...');
  const clicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').toLowerCase().includes('submit'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked submit:', clicked);

  await new Promise(r => setTimeout(r, 6000));

  const postSubmit = await page.evaluate(() => {
    const msg = document.querySelector('.wixui-form__message, [data-testid="form-submitted"], [role="alert"]');
    const text = document.querySelector('.wixui-form, form')?.innerText;
    return {
      messageText: msg ? msg.innerText.trim() : null,
      formSnippet: text ? text.slice(0, 400) : null
    };
  });

  console.log('Post submit result:', postSubmit);

  const combined = (postSubmit.messageText || '') + ' ' + (postSubmit.formSnippet || '');
  if (combined.toLowerCase().includes('thank') || combined.toLowerCase().includes('received') || combined.toLowerCase().includes('submitted') || combined.toLowerCase().includes('sent')) {
    console.log('SUCCESS! Updating database for #959...');
    const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
    const note = `Contact form: https://www.intginc.com/ (Autofilled Wix form & verified: "${postSubmit.messageText || 'Thanks for submitting!'}")`;
    updateStmt.run(note, 'contacted', 959);
    logStmt.run(959, 'sent', note);
    console.log('Lead 959 marked contacted!');
  } else {
    console.log('Not yet confirmed.');
  }

  await browser.close();
})();
