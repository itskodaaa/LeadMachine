import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  message: 'Hello, We are interested in your commercial metal fabrication services. Please contact us at your convenience.'
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

  const page = await browser.newPage();
  page.on('response', async res => {
    if (res.url().includes('contact') || res.url().includes('email') || res.url().includes('form')) {
      console.log('Response:', res.status(), res.url());
    }
  });

  await page.goto('https://elitecustommetal.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  const revealBtn = await page.$('button[data-aid="CONTACT_FORM_REVEAL_BUTTON_REND"]');
  if (revealBtn) {
    console.log('Clicking reveal...');
    await page.evaluate(() => {
      const btn = document.querySelector('button[data-aid="CONTACT_FORM_REVEAL_BUTTON_REND"]');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 2000));
  }

  const nameInput = await page.$('input[data-aid="CONTACT_FORM_NAME"]');
  const emailInput = await page.$('input[data-aid="CONTACT_FORM_EMAIL"]');
  const msgInput = await page.$('textarea[data-aid="CONTACT_FORM_MESSAGE"]');

  if (nameInput) {
    console.log('Typing name...');
    await nameInput.focus();
    await page.keyboard.type(OUTREACH.fullName, { delay: 20 });
  }
  if (emailInput) {
    console.log('Typing email...');
    await emailInput.focus();
    await page.keyboard.type(OUTREACH.email, { delay: 20 });
    await page.keyboard.press('Tab');
  }
  if (msgInput) {
    console.log('Typing message...');
    await msgInput.focus();
    await page.keyboard.type(OUTREACH.message, { delay: 10 });
    await page.keyboard.press('Tab');
  }

  await new Promise(r => setTimeout(r, 1000));

  const clickRes = await page.evaluate(() => {
    const btn = document.querySelector('button[data-aid="CONTACT_SUBMIT_BUTTON_REND"]');
    if (!btn) return 'Button not found';
    btn.scrollIntoView();
    btn.click();
    return 'Clicked';
  });
  console.log('Click result:', clickRes);

  let confirmed = false;
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const res = await page.evaluate(() => {
      const text = document.body.innerText;
      const alert = document.querySelector('[data-aid="CONTACT_FORM_SUCCESS_MSG"], [data-aid="CONTACT_FORM_CONFIRMATION"], [role="alert"], [data-ux="ConfirmationMessage"], .form-confirmation')?.innerText;
      return {
        hasSuccess: /thank you|thanks for|message sent|we've received your message|in touch shortly/i.test(text),
        alert
      };
    });
    console.log(`Sec ${i + 1}:`, res);
    if (res.hasSuccess || res.alert) {
      commitStatus(2210, 'contacted', `Contact form: https://elitecustommetal.com/ (Autofilled & verified: ${res.alert || 'Thank you for your message.'})`);
      confirmed = true;
      break;
    }
  }

  if (!confirmed) {
    const bodySnippet = await page.evaluate(() => document.body.innerText.slice(0, 500));
    console.log('Final body snippet:', bodySnippet);
  }

  await browser.close();
})();
