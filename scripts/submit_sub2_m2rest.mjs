import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
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
    console.log('Navigating to M2REST...');
    const page = await browser.newPage();
    await page.goto('https://www.m2rest.com/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 3000));

    const fName = await page.$('#input_comp-jvkrfoss');
    const lName = await page.$('#input_comp-ko2oyw2w');
    const email = await page.$('#input_comp-jvkrfosv');
    const phone = await page.$('#input_comp-jvkrfosx');
    const msg = await page.$('#textarea_comp-jvkrkh42');

    if (fName) { await fName.focus(); await page.keyboard.type(OUTREACH.firstName, { delay: 10 }); }
    if (lName) { await lName.focus(); await page.keyboard.type(OUTREACH.lastName, { delay: 10 }); }
    if (email) { await email.focus(); await page.keyboard.type(OUTREACH.email, { delay: 10 }); }
    if (phone) { await phone.focus(); await page.keyboard.type(OUTREACH.phone, { delay: 10 }); }
    if (msg) { await msg.focus(); await page.keyboard.type(OUTREACH.message, { delay: 5 }); }

    const submitBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => (b.innerText || '').toLowerCase().includes('submit'));
    });

    if (submitBtn && submitBtn.asElement()) {
      console.log('Clicking M2REST submit...');
      await submitBtn.asElement().click();
      for (let i = 0; i < 8; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const res = await page.evaluate(() => {
          const text = document.body.innerText;
          const msg = document.querySelector('[data-testid="form-submitted"], .wixui-form__message, [role="alert"]')?.innerText;
          return {
            hasSuccess: /thanks for submitting|thank you|message received|sent/i.test(text),
            msg
          };
        });
        if (res.hasSuccess || res.msg) {
          console.log(`Lead #2671 confirmed at sec ${i+1}:`, res);
          commitStatus(2671, 'contacted', `Confirmed: Wix form submission received (${res.msg || 'Thanks for submitting'})`);
          break;
        }
      }
    }
    await page.close();
  } catch (e) {
    console.error('M2REST error:', e.message);
  }

  await browser.close();
}

run();
