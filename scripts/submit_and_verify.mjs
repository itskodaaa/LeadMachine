import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const profile = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
const getStmt = db.prepare('SELECT id, company_name, notes FROM leads WHERE id = ?');

function markContacted(id, note) {
  const current = getStmt.get(id);
  const newNotes = current?.notes ? current.notes + ' | ' + note : note;
  db.transaction(() => {
    updateStmt.run(newNotes, 'contacted', id);
    logStmt.run(id, 'sent', note);
  })();
  console.log(`[Lead #${id}] ✅ DB updated to contacted!`);
}

function markUnable(id, note) {
  const current = getStmt.get(id);
  const newNotes = current?.notes ? current.notes + ' | ' + note : note;
  db.transaction(() => {
    updateStmt.run(newNotes, 'unable_to_reach', id);
    logStmt.run(id, 'bounced', note);
  })();
  console.log(`[Lead #${id}] ⚠️ DB updated to unable_to_reach: ${note}`);
}

async function submitMagee(browser) {
  // Lead #3422: Magee Machine
  console.log('\n=============================================');
  console.log('--- Submitting #3422: Magee Machine & Manufacturing Inc. ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://www.mageemachine.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2500));

    // Scroll down to form
    await page.evaluate(() => {
      const el = document.querySelector('button[data-testid="buttonElement"]');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 1500));

    await page.type('#input_comp-kf4o71qz', profile.fullName, { delay: 25 });
    await page.type('#input_comp-kf4o71rc', profile.email, { delay: 25 });
    await page.type('#input_comp-kf4o71rh', profile.phone, { delay: 25 });
    await page.type('#input_comp-kf4o71ro', profile.subject, { delay: 25 });
    await page.type('#textarea_comp-kf4o71ru', profile.message, { delay: 15 });

    console.log('Filled all fields. Clicking Send...');
    await page.click('button[data-testid="buttonElement"]');

    // Wait for submission response
    let confirmed = false;
    let confirmMsg = '';
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const status = await page.evaluate(() => {
        const text = document.body.innerText;
        const matches = ['thanks for submitting', 'thank you', 'we received your message', 'message has been sent', 'we will get back to you', 'sent'];
        for (const m of matches) {
          if (text.toLowerCase().includes(m)) {
            // Find the element containing it
            return m;
          }
        }
        // Check notifications / success elements
        const notif = document.querySelector('[data-testid="notifications"], .notifications, [role="alert"]');
        if (notif && notif.innerText) return notif.innerText;
        return null;
      });

      if (status) {
        confirmed = true;
        confirmMsg = status;
        break;
      }
    }

    if (confirmed) {
      console.log(`[#3422] Submission Confirmed: "${confirmMsg}"`);
      markContacted(3422, `Contact form submitted on https://www.mageemachine.com/. Confirmation: "${confirmMsg}"`);
    } else {
      const snippet = await page.evaluate(() => document.body.innerText.slice(0, 500));
      console.log(`[#3422] No explicit confirmation text detected. Snippet:`, snippet);
      // Let's check Wix form status
      const wixStatus = await page.evaluate(() => {
        const form = document.querySelector('form');
        return form ? form.innerText : 'no form';
      });
      console.log(`[#3422] Wix Form text:`, wixStatus);
    }
  } catch (e) {
    console.error('Magee error:', e.message);
  } finally {
    await page.close();
  }
}

async function submitKeith(browser) {
  // Lead #3423: Keith and Company, Inc.
  console.log('\n=============================================');
  console.log('--- Submitting #3423: Keith and Company, Inc. ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://keithmachine.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2500));

    // Find the inputs for Name, Email, Message
    const filled = await page.evaluate((prof) => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="file"]):not([type="submit"]), textarea'));
      // Usually first visible input is Name, second is Email, textarea is Message
      if (inputs.length >= 3) {
        inputs[0].value = prof.fullName;
        inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        inputs[0].dispatchEvent(new Event('change', { bubbles: true }));

        inputs[1].value = prof.email;
        inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
        inputs[1].dispatchEvent(new Event('change', { bubbles: true }));

        inputs[2].value = prof.message;
        inputs[2].dispatchEvent(new Event('input', { bubbles: true }));
        inputs[2].dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    }, profile);

    console.log('Keith form filled:', filled);

    // Scroll to submit button and click
    const btnFound = await page.evaluate(() => {
      const btn = document.querySelector('form button[type="submit"], form input[type="submit"]');
      if (btn) {
        btn.scrollIntoView();
        btn.click();
        return true;
      }
      return false;
    });

    console.log('Keith submit button clicked:', btnFound);

    let confirmed = false;
    let confirmMsg = '';
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const res = await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        const matches = ['thank you', 'thanks', 'message has been sent', 'we will get back', 'submission successful', 'sent successfully', 'we received'];
        for (const m of matches) {
          if (text.includes(m)) return m;
        }
        return null;
      });
      if (res) {
        confirmed = true;
        confirmMsg = res;
        break;
      }
    }

    if (confirmed) {
      console.log(`[#3423] Submission Confirmed: "${confirmMsg}"`);
      markContacted(3423, `Contact form submitted on https://keithmachine.com/. Confirmation: "${confirmMsg}"`);
    } else {
      console.log(`[#3423] No explicit confirmation detected.`);
      const bodySnippet = await page.evaluate(() => document.body.innerText.slice(0, 500));
      console.log(`[#3423] Snippet:`, bodySnippet);
    }
  } catch (e) {
    console.error('Keith error:', e.message);
  } finally {
    await page.close();
  }
}

async function submitMicrospace(browser) {
  // Lead #3425: Microspace Instruments Inc.
  console.log('\n=============================================');
  console.log('--- Submitting #3425: Microspace Instruments Inc. ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://mspace.com/request-for-quote', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2500));

    const filled = await page.evaluate((prof) => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]), textarea'));
      if (inputs.length >= 3) {
        inputs[0].value = prof.fullName;
        inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        inputs[0].dispatchEvent(new Event('change', { bubbles: true }));

        inputs[1].value = prof.email;
        inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
        inputs[1].dispatchEvent(new Event('change', { bubbles: true }));

        inputs[2].value = prof.message;
        inputs[2].dispatchEvent(new Event('input', { bubbles: true }));
        inputs[2].dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    }, profile);

    console.log('Microspace form filled:', filled);

    const clicked = await page.evaluate(() => {
      const btn = document.querySelector('form button[type="submit"], form input[type="submit"]');
      if (btn) {
        btn.scrollIntoView();
        btn.click();
        return true;
      }
      return false;
    });

    console.log('Microspace submit clicked:', clicked);

    let confirmed = false;
    let confirmMsg = '';
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const res = await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        const matches = ['thank you', 'thanks', 'message has been sent', 'we will get back', 'submission successful', 'sent successfully', 'we received'];
        for (const m of matches) {
          if (text.includes(m)) return m;
        }
        return null;
      });
      if (res) {
        confirmed = true;
        confirmMsg = res;
        break;
      }
    }

    if (confirmed) {
      console.log(`[#3425] Submission Confirmed: "${confirmMsg}"`);
      markContacted(3425, `Contact form submitted on https://mspace.com/request-for-quote. Confirmation: "${confirmMsg}"`);
    } else {
      console.log(`[#3425] No explicit confirmation detected.`);
      const bodySnippet = await page.evaluate(() => document.body.innerText.slice(0, 500));
      console.log(`[#3425] Snippet:`, bodySnippet);
    }
  } catch (e) {
    console.error('Microspace error:', e.message);
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  await submitMagee(browser);
  await submitKeith(browser);
  await submitMicrospace(browser);

  await browser.close();
}

main();
