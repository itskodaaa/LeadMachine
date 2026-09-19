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

  // 1. Lead #2401: Desert Valley Contracting
  try {
    console.log('\n=== Lead #2401 Desert Valley Contracting ===');
    const page = await browser.newPage();
    await page.goto('https://www.desertvalleycontracting.net/contact-las-vegas-contractor', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    const dudaForm = await page.evaluate(() => {
      const f = document.querySelector('form.dmRespDesignForm, form');
      if (!f) return null;
      const inputs = Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, button'));
      return {
        action: f.action,
        id: f.id,
        inputs: inputs.map(i => ({ name: i.name, id: i.id, type: i.type, placeholder: i.placeholder, text: i.innerText }))
      };
    });
    console.log('Desert Valley duda form:', dudaForm);

    if (dudaForm) {
      const f0 = await page.$('input[name="dmform-0"]'); // Name
      const f1 = await page.$('input[name="dmform-1"]'); // Email
      const f2 = await page.$('input[name="dmform-2"]'); // Tel
      const f4 = await page.$('input[name="dmform-4"]'); // Maybe Subject or Last Name
      const f5 = await page.$('input[name="dmform-5"]'); // Additional field
      const msg = await page.$('textarea[name="dmform-3"]');

      if (f0) await f0.type(OUTREACH.fullName, { delay: 10 });
      if (f1) await f1.type(OUTREACH.email, { delay: 10 });
      if (f2) await f2.type(OUTREACH.phone, { delay: 10 });
      if (f4) await f4.type('Commercial Contracting Collaboration', { delay: 10 });
      if (f5) await f5.type('General Inquiry', { delay: 10 });
      if (msg) await msg.type(OUTREACH.message, { delay: 10 });

      const submitBtn = await page.$('input[type="submit"], button[type="submit"], .dmform-submit-button');
      if (submitBtn) {
        console.log('Clicking Desert Valley submit button...');
        await submitBtn.click();
        await new Promise(r => setTimeout(r, 5000));
        const afterText = await page.evaluate(() => document.body.innerText);
        const dudaMessage = await page.evaluate(() => {
          const el = document.querySelector('.dmform-response, .dmFormResponse, .dmformSuccess, .form-message');
          return el ? el.innerText : null;
        });
        console.log('Duda response message:', dudaMessage);
        if (dudaMessage || /thank you|received|sent|success/i.test(afterText)) {
          commitStatus(2401, 'contacted', `Confirmed: Duda form submitted (${dudaMessage || 'Thank you'})`);
        }
      }
    }
    await page.close();
  } catch (e) {
    console.error('Desert Valley error:', e.message);
  }

  // 2. Lead #2403: Yack Construction Inc
  try {
    console.log('\n=== Lead #2403 Yack Construction Inc ===');
    const page = await browser.newPage();
    await page.goto('https://yackconstruction.net', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    // Inspect links on Yack Construction
    const yackLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText.trim(), href: a.href }));
    });
    console.log('Yack links:', yackLinks.filter(l => /estimate|contact|touch|quote/i.test(l.text || l.href)));

    // Look for form or modal
    const forms = await page.$$('form');
    console.log('Yack forms on homepage:', forms.length);

    // Let's check estimate link if any
    const estimateLink = yackLinks.find(l => /estimate|quote|contact/i.test(l.text || l.href));
    if (estimateLink && estimateLink.href && estimateLink.href !== page.url()) {
      console.log('Navigating to Yack estimate/contact link:', estimateLink.href);
      await page.goto(estimateLink.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
      const estForms = await page.$$('form');
      console.log('Forms on estimate page:', estForms.length);
      const inputs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea')).map(i => ({
          name: i.name, id: i.id, type: i.type, placeholder: i.placeholder
        }));
      });
      console.log('Estimate inputs:', inputs);
    }
    await page.close();
  } catch (e) {
    console.error('Yack error:', e.message);
  }

  // 3. Lead #2409: Gibson Construction of Nevada, Inc.
  try {
    console.log('\n=== Lead #2409 Gibson Construction ===');
    const page = await browser.newPage();
    await page.goto('https://gibsonconstruction.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    const gibsonLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText.trim(), href: a.href }));
    });
    const contactLink = gibsonLinks.find(l => /contact/i.test(l.text || l.href));
    console.log('Gibson contact link:', contactLink);

    if (contactLink) {
      await page.goto(contactLink.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
      const forms = await page.$$('form');
      console.log('Forms on Gibson contact page:', forms.length);
      const text = await page.evaluate(() => document.body.innerText);
      console.log('Gibson contact page text snippet:', text.slice(0, 400));
      const inputs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea')).map(i => ({
          name: i.name, id: i.id, type: i.type, placeholder: i.placeholder
        }));
      });
      console.log('Gibson contact inputs:', inputs);
    }
    await page.close();
  } catch (e) {
    console.error('Gibson error:', e.message);
  }

  await browser.close();
}

run();
