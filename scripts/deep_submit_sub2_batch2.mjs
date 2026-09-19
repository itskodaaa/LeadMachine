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

const targets = [
  { id: 2533, name: 'Paragon Homes', contactUrl: 'https://paragonhomesvail.com/contact/' },
  { id: 2535, name: 'Saunders Construction Inc.', contactUrl: 'https://www.saundersinc.com/contact/' },
  { id: 2536, name: 'Colas Inc', contactUrl: 'https://colasusa.com/contact/' },
  { id: 2537, name: 'Global Construction, LLC', contactUrl: 'https://globalconstructionco.com/contact-2/' },
  { id: 2538, name: 'M&C Construction, LLC', contactUrl: 'https://www.mendelandcompany.com/contact-us' },
  { id: 2544, name: 'Coggeshall Construction', contactUrl: 'https://coggeshall.com/contact/' }
];

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const t of targets) {
    console.log(`\n========================================`);
    console.log(`Checking Lead #${t.id}: ${t.name} (${t.contactUrl})`);
    console.log(`========================================`);
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(25000);
    try {
      await page.goto(t.contactUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await new Promise(r => setTimeout(r, 2000));

      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map((f, idx) => ({
          idx,
          action: f.action,
          id: f.id,
          className: f.className,
          inputs: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, select, button')).map(i => ({
            tag: i.tagName, type: i.type, name: i.name, id: i.id, placeholder: i.placeholder, text: i.innerText
          })),
          hasRecaptcha: !!f.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"]')
        }));
      });

      console.log(`Forms found (${forms.length}):`, JSON.stringify(forms, null, 2));

      if (forms.length === 0 || forms.every(f => f.inputs.length === 0)) {
        console.log(`No input forms found on ${t.contactUrl}`);
        continue;
      }

      // Select form with most inputs
      const bestForm = forms.sort((a,b) => b.inputs.length - a.inputs.length)[0];
      if (bestForm.hasRecaptcha) {
        console.log(`Form on #${t.id} is blocked by CAPTCHA.`);
        continue;
      }

      // Autofill inputs
      console.log(`Filling form ${bestForm.id || bestForm.className}...`);
      const inputs = await page.$$('form input:not([type="hidden"]), form textarea, form select');
      for (const input of inputs) {
        const info = await page.evaluate(el => ({
          tag: el.tagName,
          name: (el.name || '').toLowerCase(),
          id: (el.id || '').toLowerCase(),
          placeholder: (el.placeholder || '').toLowerCase(),
          type: (el.type || '').toLowerCase()
        }), input);

        if (info.type === 'submit' || info.tag === 'BUTTON') continue;

        const combined = `${info.name} ${info.id} ${info.placeholder}`;
        if (combined.includes('first') || combined.includes('fname')) {
          await input.focus(); await page.keyboard.type(OUTREACH.firstName, { delay: 10 });
        } else if (combined.includes('last') || combined.includes('lname')) {
          await input.focus(); await page.keyboard.type(OUTREACH.lastName, { delay: 10 });
        } else if (combined.includes('name')) {
          await input.focus(); await page.keyboard.type(OUTREACH.fullName, { delay: 10 });
        } else if (combined.includes('email') || info.type === 'email') {
          await input.focus(); await page.keyboard.type(OUTREACH.email, { delay: 10 });
        } else if (combined.includes('phone') || combined.includes('tel') || info.type === 'tel') {
          await input.focus(); await page.keyboard.type(OUTREACH.phone, { delay: 10 });
        } else if (combined.includes('company')) {
          await input.focus(); await page.keyboard.type(OUTREACH.company, { delay: 10 });
        } else if (combined.includes('subject')) {
          await input.focus(); await page.keyboard.type(OUTREACH.subject, { delay: 10 });
        } else if (combined.includes('message') || combined.includes('comment') || info.tag === 'TEXTAREA') {
          await input.focus(); await page.keyboard.type(OUTREACH.message, { delay: 5 });
        }
      }

      // Submit
      const submitBtn = await page.$('form button[type="submit"], form input[type="submit"], form button:not([type="button"])');
      if (submitBtn) {
        console.log(`Submitting form on #${t.id}...`);
        await submitBtn.click();
        await new Promise(r => setTimeout(r, 4000));

        const postText = await page.evaluate(() => document.body.innerText);
        const cf7Output = await page.evaluate(() => document.querySelector('.wpcf7-response-output')?.innerText);
        const gformOutput = await page.evaluate(() => document.querySelector('.gform_confirmation_message')?.innerText);

        const conf = cf7Output || gformOutput || (postText.match(/thank you|received your message|successfully submitted|we will be in touch/i) ? 'Confirmation text detected' : null);
        console.log(`Post-submit result for #${t.id}:`, conf);
        if (conf) {
          commitStatus(t.id, 'contacted', `Confirmed: Form submitted on ${t.contactUrl} (${conf.slice(0, 100)})`);
        }
      }

    } catch (e) {
      console.log(`Error on #${t.id}:`, e.message);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
  console.log('Finished deep submit batch 2.');
}

run();
