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
  zip: '90001',
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
  { id: 2928, name: 'Pinnacle Construction', url: 'https://pinnacleconstructionremodeling.com' },
  { id: 2930, name: 'GH Remodeling', url: 'https://ghremodel.com' },
  { id: 2933, name: 'DPT Construction', url: 'https://dptconstructionca.com' },
  { id: 2934, name: 'EPI General Contractors', url: 'https://epiconst.com' },
  { id: 2935, name: 'MC Construction & Design', url: 'https://mcconstructiondesign.com' }
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
          inputs: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, select, button')).map(i => ({
            tag: i.tagName, name: i.name, id: i.id, type: i.type, placeholder: i.placeholder, text: i.innerText, required: i.required
          })),
          hasRecaptcha: !!f.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"]')
        }));
      });
      console.log('Forms on page:', JSON.stringify(forms, null, 2));

      // Attempt smart fill if form exists without recaptcha
      const validForm = forms.find(f => f.inputs.length >= 3 && !f.hasRecaptcha);
      if (validForm) {
        console.log(`Filling form for #${t.id}...`);
        const inputs = await page.$$('form input:not([type="hidden"]), form textarea, form select');
        for (const input of inputs) {
          const meta = await page.evaluate(el => ({
            tag: el.tagName,
            type: el.type.toLowerCase(),
            name: (el.name || '').toLowerCase(),
            id: (el.id || '').toLowerCase(),
            placeholder: (el.placeholder || '').toLowerCase()
          }), input);

          if (meta.type === 'submit' || meta.tag === 'BUTTON') continue;

          const combined = `${meta.name} ${meta.id} ${meta.placeholder}`;
          if (meta.type === 'checkbox') {
            await input.click();
          } else if (meta.tag === 'SELECT') {
            await page.evaluate(el => { if (el.options.length > 1) el.selectedIndex = 1; el.dispatchEvent(new Event('change', { bubbles: true })); }, input);
          } else if (combined.includes('first')) {
            await input.type(OUTREACH.firstName, { delay: 10 });
          } else if (combined.includes('last')) {
            await input.type(OUTREACH.lastName, { delay: 10 });
          } else if (combined.includes('name')) {
            await input.type(OUTREACH.fullName, { delay: 10 });
          } else if (combined.includes('email') || meta.type === 'email') {
            await input.type(OUTREACH.email, { delay: 10 });
          } else if (combined.includes('phone') || meta.type === 'tel') {
            await input.type(OUTREACH.phone, { delay: 10 });
          } else if (combined.includes('zip') || combined.includes('postal')) {
            await input.type(OUTREACH.zip, { delay: 10 });
          } else if (combined.includes('message') || meta.type === 'textarea') {
            await input.type(OUTREACH.message, { delay: 5 });
          } else {
            await input.type('Commercial Inquiry', { delay: 10 });
          }
        }

        const btn = await page.$('form button[type="submit"], form input[type="submit"], form button');
        if (btn) {
          console.log(`Submitting form on #${t.id}...`);
          await btn.click();
          await new Promise(r => setTimeout(r, 4000));
          const text = await page.evaluate(() => document.body.innerText);
          const conf = text.match(/thank you|we have received|successfully sent|will be in touch|message has been sent/i);
          if (conf) {
            console.log(`Confirmed on #${t.id}:`, conf[0]);
            commitStatus(t.id, 'contacted', `Confirmed: Form submitted (${conf[0]})`);
          } else {
            console.log(`No success text on #${t.id}, text snippet:`, text.slice(0, 300));
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
