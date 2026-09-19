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
  await new Promise(r => setTimeout(r, 2000));
  
  await page.evaluate(() => {
    const btn = document.querySelector('#onetrust-accept-btn-handler');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Business enquiries'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2500));

  const result = await page.evaluate(async () => {
    return new Promise((resolve) => {
      if (!window.MktoForms2) {
        resolve({ error: 'No MktoForms2' });
        return;
      }
      const form = window.MktoForms2.allForms()[0];
      if (!form) {
        resolve({ error: 'No form instance' });
        return;
      }

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
        City: 'Chicago',
        formComments: 'Hello, I am reaching out to express our interest in your engineering services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you, Pamela Jameson',
        marketoOptinTicked: 'yes'
      });

      form.onSuccess((vals, followUpUrl) => {
        resolve({ success: true, followUpUrl });
        return false;
      });

      console.log('Calling form.submit()...');
      form.submit();

      setTimeout(() => {
        resolve({ success: false, timeout: true, submittable: form.submittable() });
      }, 10000);
    });
  });

  console.log('Submission result:', result);

  if (result.success) {
    console.log('SUCCESS! Updating database for #897...');
    const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
    const note = `Contact form: https://www.arup.com/contact-us/ (Autofilled Marketo form #3301 & verified: onSuccess fired, followUpUrl: ${result.followUpUrl || 'modal confirmation'})`;
    updateStmt.run(note, 'contacted', 897);
    logStmt.run(897, 'sent', note);
    console.log('Lead 897 updated to contacted!');
  }

  await browser.close();
})();
