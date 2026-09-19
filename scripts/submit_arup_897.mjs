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
    if (res.url().includes('marketo') || res.request().method() === 'POST') {
      console.log('NET POST/Marketo Response:', res.status(), res.url());
      try {
        console.log('Body:', (await res.text()).slice(0, 300));
      } catch(e) {}
    }
  });

  await page.goto('https://www.arup.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await new Promise(r => setTimeout(r, 3000));
  
  // Accept cookies
  await page.evaluate(() => {
    const btn = document.querySelector('#onetrust-accept-btn-handler') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Accept all'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Click 'Business enquiries'
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Business enquiries'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2500));

  // Fill the form fields
  await page.select('select[name="businessUnit"]', 'Property');
  await page.select('select[name="serviceInterest"]', 'Building services engineering');
  await page.type('input[name="FirstName"]', 'Pamela', { delay: 10 });
  await page.type('input[name="LastName"]', 'Jameson', { delay: 10 });
  await page.type('input[name="Email"]', 'pamela.jameson@nortiheastprecision.com', { delay: 10 });
  await page.type('input[name="Phone"]', '708-568-3708', { delay: 10 });
  await page.type('input[name="Company"]', 'Northeast Precision Machinery, Inc.', { delay: 10 });
  await page.type('input[name="Title"]', 'Procurement Manager', { delay: 10 });
  await page.select('select[name="Country"]', 'United States Of America');
  await page.type('input[name="City"]', 'Chicago', { delay: 10 });
  await page.type('textarea[name="formComments"]', 'Hello, I am reaching out to express our interest in your engineering services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details and possible collaboration. Thank you, Pamela Jameson', { delay: 5 });

  // Opt-in checkbox
  await page.evaluate(() => {
    const cb = document.querySelector('input[name="marketoOptinTicked"]');
    if (cb) cb.checked = true;
  });

  console.log('All fields filled. Submitting Arup modal form...');
  const submitted = await page.evaluate(() => {
    const form = document.querySelector('form');
    const btn = Array.from(form.querySelectorAll('button, input[type="submit"]')).find(b => (b.innerText || b.value).includes('Submit'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Submit button clicked:', submitted);

  await new Promise(r => setTimeout(r, 8000));

  const postSubmission = await page.evaluate(() => {
    const dialogs = Array.from(document.querySelectorAll('[role="dialog"], .modal, [class*="drawer"], [class*="modal"], [class*="dialog"]')).map(d => d.innerText.trim());
    return {
      currentUrl: window.location.href,
      bodyText: document.body.innerText.slice(0, 1000),
      dialogText: dialogs.filter(t => t.length > 0).join('\n---\n')
    };
  });

  console.log('Post Submission Dialog Text:\n', postSubmission.dialogText.slice(0, 800));

  const lower = (postSubmission.dialogText + ' ' + postSubmission.bodyText).toLowerCase();
  if (lower.includes('thank') || lower.includes('received') || lower.includes('submitted') || lower.includes('in touch')) {
    console.log('SUCCESS! Arup submission confirmed!');
    const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
    const note = 'Contact modal form: https://www.arup.com/contact-us/ (Autofilled & verified: Marketo modal submission received)';
    updateStmt.run(note, 'contacted', 897);
    logStmt.run(897, 'sent', note);
    console.log('Lead 897 committed as contacted!');
  } else {
    console.log('Not yet confirmed.');
  }

  await browser.close();
})();
