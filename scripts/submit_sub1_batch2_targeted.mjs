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
  subject: 'Commercial Metal Fabrication Inquiry',
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

  // ==========================================
  // 1. Submit Lead #2210 Elite Custom Metal Fab
  // ==========================================
  try {
    console.log('\n=== Submitting Lead #2210: Elite Custom Metal Fab ===');
    const page = await browser.newPage();
    await page.goto('https://elitecustommetal.com/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));

    const nameInput = await page.$('[data-aid="CONTACT_FORM_NAME"]');
    if (nameInput) {
      await nameInput.focus();
      await page.keyboard.type(OUTREACH.fullName, { delay: 20 });
    }

    const emailInput = await page.$('[data-aid="CONTACT_FORM_EMAIL"]');
    if (emailInput) {
      await emailInput.focus();
      await page.keyboard.type(OUTREACH.email, { delay: 20 });
    }

    const msgInput = await page.$('[data-aid="CONTACT_FORM_MESSAGE"]');
    if (msgInput) {
      await msgInput.focus();
      await page.keyboard.type(OUTREACH.message, { delay: 10 });
    }

    const submitBtn = await page.$('[data-aid="CONTACT_SUBMIT_BUTTON_REND"], button[type="submit"]');
    if (submitBtn) {
      console.log('Clicking Send on GoDaddy form...');
      await submitBtn.click();
      let confirmed = false;
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const res = await page.evaluate(() => {
          const text = document.body.innerText;
          const alert = document.querySelector('[data-aid="CONTACT_FORM_CONFIRMATION"], [role="alert"], [data-ux="ConfirmationMessage"], .form-confirmation')?.innerText;
          return {
            hasSuccess: /thank you|thanks for|message sent|we've received your message|in touch shortly/i.test(text),
            alert
          };
        });
        console.log(`Sec ${i + 1}:`, res);
        if (res.hasSuccess || res.alert) {
          commitStatus(2210, 'contacted', `Contact form: https://elitecustommetal.com/ (Autofilled & verified: ${res.alert || 'Thank you for reaching out'})`);
          confirmed = true;
          break;
        }
      }
      if (!confirmed) {
        console.log('2210 did not show explicit confirmation.');
      }
    }
    await page.close();
  } catch (e) {
    console.error('Error on 2210:', e.message);
  }

  // ==========================================
  // 2. Submit Lead #2214 Custom Tube Works
  // ==========================================
  try {
    console.log('\n=== Submitting Lead #2214: Custom Tube Works ===');
    const page = await browser.newPage();
    await page.goto('https://customtubeworks.com/contact/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));

    const nameInput = await page.$('input[name="your-name"]');
    if (nameInput) {
      await nameInput.focus();
      await page.keyboard.type(OUTREACH.fullName, { delay: 15 });
    }

    const emailInput = await page.$('input[name="your-email"]');
    if (emailInput) {
      await emailInput.focus();
      await page.keyboard.type(OUTREACH.email, { delay: 15 });
    }

    const subjectInput = await page.$('input[name="your-subject"]');
    if (subjectInput) {
      await subjectInput.focus();
      await page.keyboard.type(OUTREACH.subject, { delay: 15 });
    }

    const msgInput = await page.$('textarea[name="your-message"]');
    if (msgInput) {
      await msgInput.focus();
      await page.keyboard.type(OUTREACH.message, { delay: 10 });
    }

    const submitBtn = await page.$('form.wpcf7-form input[type="submit"]');
    if (submitBtn) {
      console.log('Clicking Submit on CF7 form...');
      await submitBtn.click();
      let confirmed = false;
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const res = await page.evaluate(() => {
          const text = document.body.innerText;
          const output = document.querySelector('.wpcf7-response-output')?.innerText;
          const sentOk = document.querySelector('.wpcf7-mail-sent-ok, .wpcf7-response-output');
          return {
            hasSuccess: /thank you|thanks for|your message was sent|message has been sent/i.test(text) || (sentOk && sentOk.classList.contains('wpcf7-mail-sent-ok')),
            output
          };
        });
        console.log(`Sec ${i + 1}:`, res);
        if (res.hasSuccess || (res.output && /thank/i.test(res.output))) {
          commitStatus(2214, 'contacted', `Contact form: https://customtubeworks.com/contact/ (Autofilled & verified: ${res.output || 'Thank you for your message. It has been sent.'})`);
          confirmed = true;
          break;
        }
      }
      if (!confirmed) {
        console.log('2214 CF7 did not confirm.');
      }
    }
    await page.close();
  } catch (e) {
    console.error('Error on 2214:', e.message);
  }

  await browser.close();
})();
