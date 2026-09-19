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
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

const SUCCESS_SIGNALS = [
  'thank you',
  'thanks for contacting',
  'thanks for reaching out',
  'thanks for submitting',
  'message has been sent',
  'we have received your',
  'we will contact you',
  'will get back to you',
  'submission was successful',
  'submitted successfully',
  'in touch shortly',
  'inquiry received',
  'form received',
  'successfully submitted',
  'your message was sent',
  'we will be in touch',
  'sent successfully'
];

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
}

async function submitBAA() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    console.log('\n--- Retrying BAA Mechanical (#4404) ---');
    await page.goto('https://www.baamechanical.com/', { waitUntil: 'networkidle2', timeout: 30000 });

    await page.waitForSelector('#input_comp-jx4lmi5l', { timeout: 10000 });
    await page.type('#input_comp-jx4lmi5l', PROFILE.fullName, { delay: 20 });
    await page.type('#input_comp-jx4lmi7g', PROFILE.email, { delay: 20 });
    await page.type('#input_comp-jx4lmi8s', PROFILE.subject, { delay: 20 });
    await page.type('#textarea_comp-jx4lmia0', PROFILE.message, { delay: 10 });

    // Inspect submit element
    const submitInfo = await page.evaluate(() => {
      const form = document.querySelector('form');
      const submitEl = form ? form.querySelector('[type="submit"]') : null;
      return submitEl ? { tagName: submitEl.tagName, className: submitEl.className, id: submitEl.id, outerHTML: submitEl.outerHTML } : null;
    });
    console.log('BAA submit element:', submitInfo);

    // Click submit
    const submitEl = await page.$('form [type="submit"]');
    if (submitEl) {
      await submitEl.click();
      console.log('Clicked BAA submit!');
    }

    await new Promise(r => setTimeout(r, 6000));
    const pageText = (await page.evaluate(() => document.body.innerText)).toLowerCase();
    const success = SUCCESS_SIGNALS.find(s => pageText.includes(s));
    console.log('BAA success signal:', success);
    if (success) {
      saveLeadResult(4404, 'contacted', `Confirmed submission on https://www.baamechanical.com/ ("${success}")`);
      return { id: 4404, status: 'contacted', result: `Confirmed: ${success}` };
    } else {
      // Look for any notification message inside form
      const formText = await page.evaluate(() => {
        const form = document.querySelector('form');
        return form ? form.innerText : '';
      });
      console.log('BAA form text post submit:', formText);
      const formSuccess = SUCCESS_SIGNALS.find(s => formText.toLowerCase().includes(s));
      if (formSuccess) {
        saveLeadResult(4404, 'contacted', `Confirmed submission on https://www.baamechanical.com/ ("${formSuccess}")`);
        return { id: 4404, status: 'contacted', result: `Confirmed: ${formSuccess}` };
      }
      return { id: 4404, status: 'unable_to_reach', result: 'Form submitted but no confirmation detected' };
    }
  } catch (e) {
    console.log('BAA error:', e.message);
    return { id: 4404, status: 'unable_to_reach', result: e.message };
  } finally {
    await browser.close();
  }
}

async function submitConverge() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    console.log('\n--- Retrying Converge Engineering (#4405) ---');
    await page.goto('https://www.convergeengineers.com/contact-7', { waitUntil: 'networkidle2', timeout: 30000 });

    await page.waitForSelector('#input_comp-me71m0523', { timeout: 10000 });
    await page.type('#input_comp-me71m0523', PROFILE.firstName, { delay: 20 });
    await page.type('#input_comp-me71m05c', PROFILE.lastName, { delay: 20 });
    await page.type('#input_comp-me71m05c3', PROFILE.email, { delay: 20 });
    await page.type('#textarea_comp-me71m05d2', PROFILE.message, { delay: 10 });

    // Inspect submit element
    const submitInfo = await page.evaluate(() => {
      const form = document.querySelector('form');
      const submitEl = form ? form.querySelector('[type="submit"]') : null;
      return submitEl ? { tagName: submitEl.tagName, className: submitEl.className, id: submitEl.id, outerHTML: submitEl.outerHTML } : null;
    });
    console.log('Converge submit element:', submitInfo);

    // Click submit
    const submitEl = await page.$('form [type="submit"]');
    if (submitEl) {
      await submitEl.click();
      console.log('Clicked Converge submit!');
    }

    await new Promise(r => setTimeout(r, 6000));
    const pageText = (await page.evaluate(() => document.body.innerText)).toLowerCase();
    const success = SUCCESS_SIGNALS.find(s => pageText.includes(s));
    console.log('Converge success signal:', success);
    if (success) {
      saveLeadResult(4405, 'contacted', `Confirmed submission on https://www.convergeengineers.com/contact-7 ("${success}")`);
      return { id: 4405, status: 'contacted', result: `Confirmed: ${success}` };
    } else {
      const formText = await page.evaluate(() => {
        const form = document.querySelector('form');
        return form ? form.innerText : '';
      });
      console.log('Converge form text post submit:', formText);
      const formSuccess = SUCCESS_SIGNALS.find(s => formText.toLowerCase().includes(s));
      if (formSuccess) {
        saveLeadResult(4405, 'contacted', `Confirmed submission on https://www.convergeengineers.com/contact-7 ("${formSuccess}")`);
        return { id: 4405, status: 'contacted', result: `Confirmed: ${formSuccess}` };
      }
      return { id: 4405, status: 'unable_to_reach', result: 'Form submitted but no confirmation detected' };
    }
  } catch (e) {
    console.log('Converge error:', e.message);
    return { id: 4405, status: 'unable_to_reach', result: e.message };
  } finally {
    await browser.close();
  }
}

async function main() {
  const r1 = await submitBAA();
  const r2 = await submitConverge();
  console.log('Results:', r1, r2);
}

main();
