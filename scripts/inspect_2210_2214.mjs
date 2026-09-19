import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH = {
  first: 'Pamela',
  last: 'Jameson',
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express our interest in your metal fabrication services and explore potential collaboration on upcoming commercial projects. Kindly arrange for a representative to contact us. Thank you.'
};

const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
const getStmt = db.prepare('SELECT id, notes FROM leads WHERE id = ?');

function commitStatus(id, status, note) {
  const current = getStmt.get(id);
  const newNotes = current?.notes ? current.notes + ' | ' + note : note;
  db.transaction(() => {
    updateStmt.run(newNotes, status, id);
    const action = status === 'contacted' ? 'sent' : 'bounced';
    logStmt.run(id, action, note);
  })();
  console.log(`[DB COMMIT] Lead #${id} -> status: ${status}, note: ${note}`);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. Inspect Lead #2210 Elite Custom Metal Fab
  try {
    console.log('\n=== Lead #2210 Elite Custom Metal Fab ===');
    const page = await browser.newPage();
    await page.goto('https://elitecustommetal.com/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));

    const fields2210 = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('form input, form textarea'));
      return inputs.map(i => ({
        tag: i.tagName,
        type: i.type,
        id: i.id,
        name: i.name,
        placeholder: i.placeholder,
        label: i.labels ? Array.from(i.labels).map(l => l.innerText) : null,
        parentText: i.parentElement?.innerText?.trim(),
        outerHTML: i.outerHTML
      }));
    });
    console.log('Fields on 2210:', JSON.stringify(fields2210, null, 2));

    await page.close();
  } catch (e) {
    console.error('Error on 2210:', e.message);
  }

  // 2. Inspect Lead #2214 Custom Tube Works Contact Page
  try {
    console.log('\n=== Lead #2214 Custom Tube Works Contact Page ===');
    const page = await browser.newPage();
    await page.goto('https://customtubeworks.com/contact/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));

    const fields2214 = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      const captchas = document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile');
      return {
        captcha: captchas.length > 0,
        forms: forms.map(f => ({
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea, select, button')).map(i => ({
            tag: i.tagName,
            type: i.type,
            name: i.name,
            id: i.id,
            placeholder: i.placeholder,
            text: i.innerText
          }))
        }))
      };
    });
    console.log('Fields on 2214 /contact/:', JSON.stringify(fields2214, null, 2));

    await page.close();
  } catch (e) {
    console.error('Error on 2214:', e.message);
  }

  await browser.close();
})();
