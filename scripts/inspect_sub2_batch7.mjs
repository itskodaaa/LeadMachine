import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express our interest in your contracting services and explore potential collaboration on upcoming commercial projects. Kindly arrange for a representative to contact us. Thank you.'
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

const targets = [
  { id: 2853, name: 'California Dream Remodeling', url: 'https://californiadreamremodeling.com' },
  { id: 2859, name: 'Alta California Construction', url: 'https://altacaliforniaconstruction.com' },
  { id: 2861, name: 'Rsbinn Licensed Contractor', url: 'https://rsbinn.com' }
];

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const t of targets) {
    console.log(`\n=== Checking #${t.id} ${t.name} (${t.url}) ===`);
    const page = await browser.newPage();
    try {
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          id: f.id,
          className: f.className,
          inputs: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, button, select')).map(i => ({
            tag: i.tagName, name: i.name, id: i.id, type: i.type, placeholder: i.placeholder, text: i.innerText
          })),
          hasRecaptcha: !!f.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"]')
        }));
      });
      console.log('Forms on page:', JSON.stringify(forms, null, 2));

      // If it's a valid form without recaptcha, let's submit it
      const validForm = forms.find(f => f.inputs.length >= 3 && !f.hasRecaptcha);
      if (validForm) {
        console.log(`Attempting submit on #${t.id}...`);
        const inputs = await page.$$('form input:not([type="hidden"]), form textarea');
        for (const input of inputs) {
          const meta = await page.evaluate(el => ({ name: el.name.toLowerCase(), id: el.id.toLowerCase(), placeholder: el.placeholder.toLowerCase(), type: el.type.toLowerCase() }), input);
          const combined = `${meta.name} ${meta.id} ${meta.placeholder}`;
          if (combined.includes('name')) await input.type(OUTREACH.fullName, { delay: 10 });
          else if (combined.includes('email') || meta.type === 'email') await input.type(OUTREACH.email, { delay: 10 });
          else if (combined.includes('phone') || meta.type === 'tel') await input.type(OUTREACH.phone, { delay: 10 });
          else if (combined.includes('message') || meta.type === 'textarea') await input.type(OUTREACH.message, { delay: 5 });
        }

        const btn = await page.$('form button[type="submit"], form input[type="submit"], form button');
        if (btn) {
          await btn.click();
          await new Promise(r => setTimeout(r, 4000));
          const text = await page.evaluate(() => document.body.innerText);
          const conf = text.match(/thank you|we have received|successfully sent|will be in touch/i);
          if (conf) {
            console.log(`Confirmed on #${t.id}:`, conf[0]);
            commitStatus(t.id, 'contacted', `Confirmed: Form submitted (${conf[0]})`);
          }
        }
      }

    } catch (e) {
      console.log(`Error on #${t.id}:`, e.message);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
}

run();
