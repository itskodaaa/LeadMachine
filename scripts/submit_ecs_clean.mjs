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
    if (res.url().includes('feedback')) {
      console.log('CF7 Feedback Response:', res.status(), res.url());
      try {
        console.log('Body:', await res.text());
      } catch(e) {}
    }
  });

  await page.goto('https://www.ecslimited.com/contact-us/', { waitUntil: 'networkidle2' });
  
  // Set values according to schema
  await page.evaluate(() => {
    // Select contact categories
    const catSelect = document.querySelector('select[name="contact-categories[]"]');
    if (catSelect) {
      for (const opt of catSelect.options) {
        if (opt.value === 'Other' || opt.text.includes('Other')) {
          opt.selected = true;
          break;
        }
      }
      catSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Select state = Illinois
    const stateSelect = document.querySelector('select[name="states"]');
    if (stateSelect) {
      for (const opt of stateSelect.options) {
        if (opt.value === 'Illinois') {
          opt.selected = true;
          break;
        }
      }
      stateSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  await page.type('input[name="your-name"]', 'Pamela Jameson', { delay: 10 });
  await page.type('input[name="your-email"]', 'pamela.jameson@nortiheastprecision.com', { delay: 10 });
  await page.type('input[name="phone-num"]', '7085683708', { delay: 10 });
  await page.type('input[name="city"]', 'Chicago', { delay: 10 });
  await page.type('input[name="company_name"]', 'Northeast Precision Machinery, Inc.', { delay: 10 });
  await page.type('input[name="company_website"]', 'https://northeastprecision.com', { delay: 10 });
  await page.type('textarea[name="your-message"]', 'Exploring Collaboration Opportunities - Interested in your consulting and engineering services and discussing potential partnership. Kindly arrange for a representative to contact us. Thank you, Pamela Jameson', { delay: 5 });

  console.log('Submitting CF7 on ECS Limited...');
  await page.click('form#cf7-form-4 input[type="submit"], form.wpcf7-form input[type="submit"]');

  await new Promise(r => setTimeout(r, 7000));

  const postSubmit = await page.evaluate(() => {
    const output = document.querySelector('.wpcf7-response-output');
    const errors = Array.from(document.querySelectorAll('.wpcf7-not-valid-tip')).map(e => e.innerText);
    return {
      outputClass: output?.className,
      outputText: output?.innerText.trim(),
      errors
    };
  });

  console.log('Post Submit Result:', postSubmit);

  if (postSubmit.outputText && (postSubmit.outputText.toLowerCase().includes('thank') || postSubmit.outputText.toLowerCase().includes('sent') || postSubmit.outputClass?.includes('mail-sent-ok'))) {
    console.log('SUCCESS! Updating database for #1039...');
    const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
    const note = `Contact form: https://www.ecslimited.com/contact-us/ (Autofilled & verified: "${postSubmit.outputText}")`;
    updateStmt.run(note, 'contacted', 1039);
    logStmt.run(1039, 'sent', note);
    console.log('Lead 1039 marked contacted!');
  } else {
    console.log('Not yet confirmed.');
  }

  await browser.close();
})();
