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
  subject: 'Exploring Collaboration Opportunities',
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

  // 1. Lead #2608: S Construction Co (Wix)
  try {
    console.log('\n--- Submitting Lead #2608 S Construction Co ---');
    const page = await browser.newPage();
    await page.goto('https://www.sconstructionco.com/', { waitUntil: 'networkidle2', timeout: 25000 });

    const name = await page.$('#input_comp-jhsq8k9z');
    const email = await page.$('#input_comp-jhsq8n8i');
    const subj = await page.$('#input_comp-jhsq925h');
    const msg = await page.$('#textarea_comp-jhsq99b7');

    if (name) { await name.focus(); await page.keyboard.type(OUTREACH.fullName, { delay: 15 }); }
    if (email) { await email.focus(); await page.keyboard.type(OUTREACH.email, { delay: 15 }); }
    if (subj) { await subj.focus(); await page.keyboard.type(OUTREACH.subject, { delay: 15 }); }
    if (msg) { await msg.focus(); await page.keyboard.type(OUTREACH.message, { delay: 10 }); }

    const submitBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => (b.innerText || '').toLowerCase().includes('submit'));
    });

    if (submitBtn && submitBtn.asElement()) {
      console.log('Clicking Wix submit button for #2608...');
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
          console.log(`Lead #2608 confirmed at sec ${i+1}:`, res);
          commitStatus(2608, 'contacted', `Confirmed: Wix form submission received (${res.msg || 'Thanks for submitting'})`);
          break;
        }
      }
    }
    await page.close();
  } catch (e) {
    console.error('Lead #2608 error:', e.message);
  }

  // 2. Lead #2609: All Quality, Inc. (Duda)
  try {
    console.log('\n--- Submitting Lead #2609 All Quality, Inc. ---');
    const page = await browser.newPage();
    await page.goto('https://www.generalcontractingchicagoil.com/', { waitUntil: 'networkidle2', timeout: 25000 });

    const f0 = await page.$('input[name="dmform-0"]');
    const f1 = await page.$('input[name="dmform-1"]');
    const f2 = await page.$('input[name="dmform-2"]');
    const f3 = await page.$('textarea[name="dmform-3"]');

    if (f0) { await f0.focus(); await page.keyboard.type(OUTREACH.fullName, { delay: 15 }); }
    if (f1) { await f1.focus(); await page.keyboard.type(OUTREACH.email, { delay: 15 }); }
    if (f2) { await f2.focus(); await page.keyboard.type(OUTREACH.phone, { delay: 15 }); }
    if (f3) { await f3.focus(); await page.keyboard.type(OUTREACH.message, { delay: 10 }); }

    const submitBtn = await page.$('input[type="submit"], button[type="submit"], [class*="dmform-submit"]');
    if (submitBtn) {
      console.log('Clicking Duda submit for #2609...');
      await submitBtn.click();
      for (let i = 0; i < 8; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const res = await page.evaluate(() => {
          const text = document.body.innerText;
          const msg = document.querySelector('.dmform-response, .dmFormResponse, .dmformSuccess')?.innerText;
          return {
            hasSuccess: /thank you|received|sent successfully/i.test(text),
            msg
          };
        });
        if (res.hasSuccess || res.msg) {
          console.log(`Lead #2609 confirmed at sec ${i+1}:`, res);
          commitStatus(2609, 'contacted', `Confirmed: Duda form submitted (${res.msg || 'Thank you'})`);
          break;
        }
      }
    }
    await page.close();
  } catch (e) {
    console.error('Lead #2609 error:', e.message);
  }

  // 3. Lead #2606: Gladstone Builders
  try {
    console.log('\n--- Submitting Lead #2606 Gladstone Builders ---');
    const page = await browser.newPage();
    await page.goto('https://www.gladstonebuildersinc.com/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));

    const fName = await page.$('input[id*="first name" i], input[placeholder*="first name" i]');
    const fEmail = await page.$('input[id*="email" i], input[placeholder*="email" i]');
    const fPhone = await page.$('input[id*="Phone" i], input[placeholder*="number" i]');
    const fMsg = await page.$('textarea');

    if (fName) { await fName.type(OUTREACH.firstName, { delay: 10 }); }
    if (fEmail) { await fEmail.type(OUTREACH.email, { delay: 10 }); }
    if (fPhone) { await fPhone.type(OUTREACH.phone, { delay: 10 }); }
    if (fMsg) { await fMsg.type(OUTREACH.message, { delay: 5 }); }

    const submitBtn = await page.$('input[type="submit"], button[type="submit"]');
    if (submitBtn) {
      console.log('Submitting Gladstone form...');
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 4000));
      const postText = await page.evaluate(() => document.body.innerText);
      if (/thank you|received|sent|success/i.test(postText)) {
        console.log('Gladstone confirmed!');
        commitStatus(2606, 'contacted', 'Confirmed: Form submitted on gladstonebuildersinc.com');
      }
    }
    await page.close();
  } catch (e) {
    console.error('Lead #2606 error:', e.message);
  }

  await browser.close();
  console.log('Submission run finished.');
}

run();
