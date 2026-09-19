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
  page.on('console', msg => console.log('PAGE:', msg.text()));

  await page.goto('https://www.arup.com/contact-us/', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 3000));
  
  await page.evaluate(() => {
    const btn = document.querySelector('#onetrust-accept-btn-handler');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Business enquiries'));
    if (btn) btn.click();
  });
  
  // Wait for Marketo form to be ready
  await page.waitForFunction(() => typeof window.MktoForms2 !== 'undefined' && window.MktoForms2.allForms().length > 0, { timeout: 15000 });

  console.log('MktoForms2 ready! Populating and submitting...');

  const submission = await page.evaluate(async () => {
    return new Promise((resolve) => {
      const form = window.MktoForms2.allForms()[0];
      
      // Select Country to trigger State field
      form.setValues({ Country: 'United States Of America' });
      const countryEl = document.querySelector('select[name="Country"]');
      if (countryEl) countryEl.dispatchEvent(new Event('change', { bubbles: true }));

      setTimeout(() => {
        form.setValues({
          businessUnit: 'Property',
          serviceInterest: 'Building services engineering',
          FirstName: 'Pamela',
          LastName: 'Jameson',
          Email: 'pamela.jameson@nortiheastprecision.com',
          Phone: '708-568-3708',
          Company: 'Northeast Precision Machinery, Inc.',
          Title: 'Procurement Manager',
          Country: 'United States Of America',
          State: 'Illinois',
          City: 'Chicago',
          formComments: 'Hello, I am reaching out to express our interest in your engineering services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you, Pamela Jameson',
          marketoOptinTicked: 'yes'
        });

        const valid = form.validate();
        console.log('Form valid:', valid);

        form.onSuccess((vals, followUpUrl) => {
          console.log('Form onSuccess fired! URL:', followUpUrl);
          resolve({ success: true, followUpUrl });
          return false;
        });

        form.submit();

        setTimeout(() => {
          resolve({ success: false, valid, submittable: form.submittable() });
        }, 10000);
      }, 1000);
    });
  });

  console.log('Submission result:', submission);

  if (submission.success) {
    console.log('Arup submission CONFIRMED! Updating database for #897...');
    const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
    const note = `Contact form: https://www.arup.com/contact-us/ (Autofilled Marketo form #3301 & verified: onSuccess fired, followUpUrl: ${submission.followUpUrl || 'modal confirmation'})`;
    updateStmt.run(note, 'contacted', 897);
    logStmt.run(897, 'sent', note);
    console.log('Lead 897 committed to database!');
  } else {
    console.log('Submission did not complete.');
  }

  await browser.close();
})();
