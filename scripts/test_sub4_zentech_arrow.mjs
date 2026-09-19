import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const PROFILE = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: 'Hello, I am reaching out to express interest in your precision manufacturing and engineering services. Please have a representative contact us regarding collaboration and upcoming project quotes. Thank you, Pamela Jameson'
};

const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
const getStmt = db.prepare('SELECT id, company_name, status, notes FROM leads WHERE id = ?');

function saveLeadResult(id, status, note) {
  const current = getStmt.get(id);
  const newNotes = current?.notes ? current.notes + ' | ' + note : note;
  db.transaction(() => {
    updateStmt.run(newNotes, status, id);
    const action = status === 'contacted' ? 'sent' : 'bounced';
    logStmt.run(id, action, note);
  })();
  console.log(`[DB] Saved #${id} -> status: ${status}, note: ${note}`);
}

async function testZentech(browser) {
  console.log('\n--- Deep Testing #4268 Zentech Inc ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://www.zentech-usa.com/contact', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Fill the inputs using page.evaluate to directly set values and dispatch input events
    await page.evaluate((prof) => {
      const inputs = Array.from(document.querySelectorAll('form input, form textarea'));
      for (const inp of inputs) {
        const id = inp.id;
        if (id.includes('40234178')) inp.value = prof.firstName;
        else if (id.includes('28348a8d')) inp.value = prof.lastName;
        else if (id.includes('c2421216')) inp.value = 'Procurement Manager';
        else if (id.includes('2e3f9eda')) inp.value = prof.phone;
        else if (id.includes('74fff1ea')) inp.value = prof.email;
        else if (id.includes('6b7fa4c3')) inp.value = prof.subject;
        else if (id.includes('b0ce88f0')) inp.value = prof.message;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, PROFILE);

    console.log('Zentech values dispatched. Clicking submit button via JS...');
    const clicked = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Submit');
      if (btn) {
        btn.scrollIntoView();
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Submit button clicked:', clicked);

    await new Promise(r => setTimeout(r, 6000));

    const state = await page.evaluate(() => {
      const body = document.body.innerText;
      const notifications = Array.from(document.querySelectorAll('[data-testid="notifications"], [role="alert"], [aria-live]')).map(el => el.innerText);
      const isSubmitted = /thanks for submitting|thank you/i.test(body);
      return { isSubmitted, notifications, snippet: body.slice(0, 300) };
    });

    console.log('Zentech state:', state);
    if (state.isSubmitted || state.notifications.some(n => /thank/i.test(n))) {
      console.log('✅ #4268 SUCCESS CONFIRMED!');
      saveLeadResult(4268, 'contacted', 'Submitted Wix contact form on /contact - Confirmed: Thanks for submitting');
    } else {
      saveLeadResult(4268, 'unable_to_reach', `Wix submission unconfirmed. Notifications: ${state.notifications.join('; ')}`);
    }
  } catch (e) {
    console.log('Error on Zentech:', e.message);
  } finally {
    await page.close();
  }
}

async function testArrow(browser) {
  console.log('\n--- Deep Testing #4259 Arrow Science & Tech ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://www.arrowscitech.com/contact-us', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Inspect all form elements including custom selects / radio / checkboxes
    const formInfo = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return { error: 'No form' };
      const allDescendants = Array.from(form.querySelectorAll('*')).filter(el => {
        return el.getAttribute('data-testid') || el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'BUTTON' || el.getAttribute('role');
      }).map(el => ({
        tag: el.tagName,
        testid: el.getAttribute('data-testid'),
        role: el.getAttribute('role'),
        text: el.innerText ? el.innerText.slice(0, 30) : '',
        id: el.id
      }));
      return { count: allDescendants.length, allDescendants };
    });
    console.log('Arrow form descendants:', JSON.stringify(formInfo.allDescendants?.slice(0, 30), null, 2));

    // Fill inputs
    await page.evaluate((prof) => {
      const inputs = Array.from(document.querySelectorAll('form input, form textarea'));
      for (const inp of inputs) {
        const id = inp.id;
        if (id.includes('7e9d7a34')) inp.value = prof.firstName;
        else if (id.includes('4f006c2a')) inp.value = prof.lastName;
        else if (id.includes('8ffeec5e')) inp.value = prof.email;
        else if (id.includes('84ef3f29')) inp.value = prof.email;
        else if (id.includes('601426de')) inp.value = prof.phone;
        else if (id.includes('d33d6dc4')) inp.value = prof.company;
        else if (id.includes('8aeac2cb')) inp.value = prof.message;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, PROFILE);

    // Look for dropdown / select for "SERVICE YOU ARE REQUESTING*"
    const hasDropdown = await page.evaluate(() => {
      const dd = document.querySelector('[role="combobox"], [data-testid="select-trigger"], select, [aria-haspopup="listbox"]');
      if (dd) {
        dd.click();
        return true;
      }
      return false;
    });
    console.log('Has dropdown:', hasDropdown);
    if (hasDropdown) {
      await new Promise(r => setTimeout(r, 1000));
      await page.evaluate(() => {
        const opt = document.querySelector('[role="option"], option:nth-child(2), li[role="option"]');
        if (opt) opt.click();
      });
    }

    // Submit
    const clicked = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => /submit/i.test(b.innerText.trim()));
      if (btn) {
        btn.scrollIntoView();
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Arrow submit clicked:', clicked);

    await new Promise(r => setTimeout(r, 6000));
    const state = await page.evaluate(() => {
      const body = document.body.innerText;
      const notifications = Array.from(document.querySelectorAll('[data-testid="notifications"], [role="alert"], [aria-live]')).map(el => el.innerText);
      const isSubmitted = /thanks for submitting|thank you/i.test(body);
      return { isSubmitted, notifications, snippet: body.slice(0, 300) };
    });

    console.log('Arrow state:', state);
    if (state.isSubmitted || state.notifications.some(n => /thank/i.test(n))) {
      console.log('✅ #4259 SUCCESS CONFIRMED!');
      saveLeadResult(4259, 'contacted', 'Submitted Wix contact form on /contact-us - Confirmed: Thanks for submitting');
    } else {
      saveLeadResult(4259, 'unable_to_reach', `Wix submission unconfirmed. Notifications: ${state.notifications.join('; ')}`);
    }
  } catch (e) {
    console.log('Error on Arrow:', e.message);
  } finally {
    await page.close();
  }
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  await testZentech(browser);
  await testArrow(browser);

  await browser.close();
}

run();
