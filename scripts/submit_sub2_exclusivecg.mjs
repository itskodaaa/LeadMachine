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
  message: 'Hello, I am reaching out to express our interest in your commercial contracting services and explore potential collaboration on upcoming projects. Kindly arrange for a representative to contact us. Thank you.'
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
    console.log('Navigating to Exclusive Construction Group...');
    const page = await browser.newPage();
    await page.goto('https://www.exclusivecg.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const name = await page.$('form.js-ajax-form input[name="name"]');
    const email = await page.$('form.js-ajax-form input[name="email"]');
    const phone = await page.$('form.js-ajax-form input[name="phone"]');
    const company = await page.$('form.js-ajax-form input[name="company"]');
    const msg = await page.$('form.js-ajax-form textarea[name="message"]');

    if (name) { await name.focus(); await page.keyboard.type(OUTREACH.fullName, { delay: 15 }); }
    if (email) { await email.focus(); await page.keyboard.type(OUTREACH.email, { delay: 15 }); }
    if (phone) { await phone.focus(); await page.keyboard.type(OUTREACH.phone, { delay: 15 }); }
    if (company) { await company.focus(); await page.keyboard.type(OUTREACH.company, { delay: 15 }); }
    if (msg) { await msg.focus(); await page.keyboard.type(OUTREACH.message, { delay: 10 }); }

    const submitBtn = await page.$('form.js-ajax-form button[type="submit"], form.js-ajax-form input[type="submit"], form.js-ajax-form button');
    if (submitBtn) {
      console.log('Clicking SEND button on Exclusive Construction...');
      await submitBtn.click();
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const res = await page.evaluate(() => {
          const alert = document.querySelector('.alert-success, .success-message, .form-message');
          const text = document.body.innerText;
          return {
            alertText: alert ? alert.innerText : null,
            hasSuccess: /thank you|received|sent successfully|message has been sent/i.test(text)
          };
        });
        if (res.alertText || res.hasSuccess) {
          console.log(`Exclusive Construction confirmed at sec ${i+1}:`, res);
          commitStatus(2722, 'contacted', `Confirmed: AJAX form submitted on exclusivecg.com (${res.alertText || 'Thank you'})`);
          break;
        }
      }
    }
    await page.close();
  } catch (e) {
    console.error('Lead 2722 error:', e.message);
  }

  await browser.close();
}

run();
