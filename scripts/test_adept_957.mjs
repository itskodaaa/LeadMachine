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
    if (res.url().includes('wp-admin/admin-ajax.php') || res.request().method() === 'POST') {
      console.log('AJAX/POST Response:', res.status(), res.url());
      try {
        console.log('Body:', await res.text());
      } catch(e) {}
    }
  });

  await page.goto('https://adeptengineering.com/', { waitUntil: 'networkidle2' });
  
  // Inspect all fields in the form
  const formFields = await page.evaluate(() => {
    const form = document.querySelector('form.wpforms-form');
    if (!form) return 'No wpforms';
    return Array.from(form.querySelectorAll('input, textarea, select')).map(i => ({
      name: i.name,
      id: i.id,
      type: i.type,
      placeholder: i.placeholder,
      label: i.closest('.wpforms-field')?.querySelector('label')?.innerText
    }));
  });
  console.log('Adept form fields:', JSON.stringify(formFields, null, 2));

  // Fill the form
  await page.type('input[name="wpforms[fields][1][first]"]', 'Pamela', { delay: 10 });
  await page.type('input[name="wpforms[fields][1][last]"]', 'Jameson', { delay: 10 });
  await page.type('input[name="wpforms[fields][5]"]', 'Northeast Precision Machinery, Inc.', { delay: 10 });
  await page.type('input[name="wpforms[fields][6]"]', '708-568-3708', { delay: 10 });
  await page.type('input[name="wpforms[fields][2]"]', 'pamela.jameson@nortiheastprecision.com', { delay: 10 });
  
  // Check field 3
  const field3 = await page.$('input[name="wpforms[fields][3]"], textarea[name="wpforms[fields][3]"]');
  if (field3) {
    await field3.type('Exploring Collaboration Opportunities - Interested in your engineering services and discussing potential partnership.', { delay: 5 });
  }

  console.log('Submitting Adept form...');
  const submitBtn = await page.$('button.wpforms-submit, input.wpforms-submit, button[type="submit"]');
  await submitBtn.click();

  await new Promise(r => setTimeout(r, 6000));

  const postSubmit = await page.evaluate(() => {
    const confirmation = document.querySelector('.wpforms-confirmation-container, .wpforms-confirmation-scroll');
    return {
      confirmationText: confirmation ? confirmation.innerText.trim() : null,
      bodySnippet: document.body.innerText.slice(0, 500)
    };
  });
  console.log('Post submit:', postSubmit);

  if (postSubmit.confirmationText && (postSubmit.confirmationText.toLowerCase().includes('thank') || postSubmit.confirmationText.toLowerCase().includes('contact'))) {
    console.log('SUCCESS! Updating database for #957...');
    const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
    const note = `Contact form: https://adeptengineering.com/ (Autofilled & verified: "${postSubmit.confirmationText}")`;
    updateStmt.run(note, 'contacted', 957);
    logStmt.run(957, 'sent', note);
    console.log('Lead 957 marked contacted!');
  }

  await browser.close();
})();
