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
  
  await page.evaluate(() => {
    const f = document.querySelector('form#cf7-form-4');
    f.querySelector('select[name="states"]').value = 'Illinois';
    f.querySelector('select[name="states"]').dispatchEvent(new Event('change', { bubbles: true }));

    const cat = f.querySelector('select[name="contact-categories[]"]');
    for (const opt of cat.options) {
      if (opt.value === 'Other') opt.selected = true;
      else opt.selected = false;
    }
    cat.dispatchEvent(new Event('change', { bubbles: true }));

    f.querySelector('input[name="your-name"]').value = 'Pamela Jameson';
    f.querySelector('input[name="your-email"]').value = 'pamela.jameson@nortiheastprecision.com';
    f.querySelector('input[name="phone-num"]').value = '708-568-3708';
    f.querySelector('input[name="city"]').value = 'Chicago';
    f.querySelector('input[name="company_name"]').value = 'Northeast Precision Machinery, Inc.';
    f.querySelector('input[name="company_website"]').value = 'https://northeastprecision.com';
    f.querySelector('textarea[name="your-message"]').value = 'Exploring Collaboration Opportunities - Interested in your consulting engineering services and discussing potential partnership. Kindly arrange for a representative to contact us. Phone: 708-568-3708. Thank you, Pamela Jameson';
  });

  console.log('Clicking Submit on form#cf7-form-4...');
  await page.evaluate(() => {
    const f = document.querySelector('form#cf7-form-4');
    f.querySelector('input[type="submit"]').click();
  });

  await new Promise(r => setTimeout(r, 7000));

  const postSubmit = await page.evaluate(() => {
    const output = document.querySelector('form#cf7-form-4 .wpcf7-response-output');
    const errors = Array.from(document.querySelectorAll('form#cf7-form-4 .wpcf7-not-valid-tip')).map(e => e.innerText);
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
