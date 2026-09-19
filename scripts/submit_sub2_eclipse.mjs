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

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    console.log('Navigating to Eclipse Constructions...');
    const page = await browser.newPage();
    await page.goto('https://eclipseconstructions.com/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));

    const submitted = await page.evaluate((profile) => {
      const form = document.querySelector('form[action*="wpcf7-f547"]');
      if (!form) return { success: false, reason: 'Form not found' };

      const name = form.querySelector('input[name="your-name"]');
      const email = form.querySelector('input[name="your-email"]');
      const phone = form.querySelector('input[name="your-phone"]');
      const msg = form.querySelector('textarea');
      const checkbox = form.querySelector('input[type="checkbox"]');

      if (name) name.value = profile.fullName;
      if (email) email.value = profile.email;
      if (phone) phone.value = profile.phone;
      if (msg) msg.value = profile.message;
      if (checkbox) checkbox.checked = true;

      [name, email, phone, msg, checkbox].forEach(el => {
        if (el) {
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      const btn = form.querySelector('button[type="submit"], input[type="submit"]');
      if (btn) {
        btn.click();
        return { success: true };
      }
      return { success: false, reason: 'No submit button' };
    }, OUTREACH);

    console.log('Eclipse submit evaluate:', submitted);

    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const res = await page.evaluate(() => {
        const out = document.querySelector('form[action*="wpcf7-f547"] .wpcf7-response-output');
        return out ? out.innerText.trim() : null;
      });
      if (res) {
        console.log(`Eclipse response at sec ${i+1}: ${res}`);
        if (/thank you|received|sent/i.test(res)) {
          commitStatus(2779, 'contacted', `Confirmed WP CF7: ${res}`);
          break;
        }
      }
    }
    await page.close();
  } catch (e) {
    console.error('Lead 2779 error:', e.message);
  }

  await browser.close();
}

run();
