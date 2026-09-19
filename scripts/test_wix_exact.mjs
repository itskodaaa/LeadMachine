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
    console.log('\n================ BAA Mechanical (#4404) ================');
    page.on('response', resp => {
      const u = resp.url();
      if (u.includes('wix-forms') || u.includes('submissions') || u.includes('forms')) {
        console.log('BAA Network Resp:', resp.status(), u);
      }
    });

    await page.goto('https://www.baamechanical.com/', { waitUntil: 'networkidle2', timeout: 30000 });

    await page.waitForSelector('#input_comp-jx4lmi5l');
    await page.click('#input_comp-jx4lmi5l');
    await page.type('#input_comp-jx4lmi5l', PROFILE.fullName, { delay: 20 });

    await page.click('#input_comp-jx4lmi7g');
    await page.type('#input_comp-jx4lmi7g', PROFILE.email, { delay: 20 });

    await page.click('#input_comp-jx4lmi8s');
    await page.type('#input_comp-jx4lmi8s', PROFILE.subject, { delay: 20 });

    await page.click('#textarea_comp-jx4lmia0');
    await page.type('#textarea_comp-jx4lmia0', PROFILE.message, { delay: 10 });

    console.log('Clicking BAA button[data-testid="buttonElement"]...');
    const submitBtn = await page.$('form button[data-testid="buttonElement"]');
    if (!submitBtn) {
      console.log('BAA submit button not found!');
      return { id: 4404, status: 'unable_to_reach', result: 'Submit button not found' };
    }

    await submitBtn.click();
    console.log('Clicked! Waiting 8 seconds...');
    await new Promise(r => setTimeout(r, 8000));

    const formText = await page.evaluate(() => {
      const f = document.querySelector('form');
      return f ? f.innerText : document.body.innerText;
    });
    console.log('BAA Post-submit Form Text:\n', formText);

    const success = SUCCESS_SIGNALS.find(s => formText.toLowerCase().includes(s));
    if (success) {
      console.log(`✅ BAA CONFIRMED: "${success}"`);
      saveLeadResult(4404, 'contacted', `Confirmed submission on https://www.baamechanical.com/ ("${success}")`);
      return { id: 4404, status: 'contacted', result: `Confirmed: ${success}` };
    } else {
      return { id: 4404, status: 'unable_to_reach', result: 'Form submitted but no confirmation message detected' };
    }
  } catch (e) {
    console.log('BAA Error:', e.message);
    return { id: 4404, status: 'unable_to_reach', result: e.message };
  } finally {
    await browser.close();
  }
}

async function submitConverge() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    console.log('\n================ Converge Engineering (#4405) ================');
    page.on('response', resp => {
      const u = resp.url();
      if (u.includes('wix-forms') || u.includes('submissions') || u.includes('forms')) {
        console.log('Converge Network Resp:', resp.status(), u);
      }
    });

    await page.goto('https://www.convergeengineers.com/contact-7', { waitUntil: 'networkidle2', timeout: 30000 });

    await page.waitForSelector('#input_comp-me71m0523');
    await page.click('#input_comp-me71m0523');
    await page.type('#input_comp-me71m0523', PROFILE.firstName, { delay: 20 });

    await page.click('#input_comp-me71m05c');
    await page.type('#input_comp-me71m05c', PROFILE.lastName, { delay: 20 });

    await page.click('#input_comp-me71m05c3');
    await page.type('#input_comp-me71m05c3', PROFILE.email, { delay: 20 });

    await page.click('#textarea_comp-me71m05d2');
    await page.type('#textarea_comp-me71m05d2', PROFILE.message, { delay: 10 });

    console.log('Clicking Converge button[data-testid="buttonElement"]...');
    const submitBtn = await page.$('form button[data-testid="buttonElement"]');
    if (!submitBtn) {
      console.log('Converge submit button not found!');
      return { id: 4405, status: 'unable_to_reach', result: 'Submit button not found' };
    }

    await submitBtn.click();
    console.log('Clicked! Waiting 8 seconds...');
    await new Promise(r => setTimeout(r, 8000));

    const formText = await page.evaluate(() => {
      const f = document.querySelector('form');
      return f ? f.innerText : document.body.innerText;
    });
    console.log('Converge Post-submit Form Text:\n', formText);

    const success = SUCCESS_SIGNALS.find(s => formText.toLowerCase().includes(s));
    if (success) {
      console.log(`✅ Converge CONFIRMED: "${success}"`);
      saveLeadResult(4405, 'contacted', `Confirmed submission on https://www.convergeengineers.com/contact-7 ("${success}")`);
      return { id: 4405, status: 'contacted', result: `Confirmed: ${success}` };
    } else {
      return { id: 4405, status: 'unable_to_reach', result: 'Form submitted but no confirmation message detected' };
    }
  } catch (e) {
    console.log('Converge Error:', e.message);
    return { id: 4405, status: 'unable_to_reach', result: e.message };
  } finally {
    await browser.close();
  }
}

async function run() {
  const r1 = await submitBAA();
  const r2 = await submitConverge();
  console.log('\nFinal Results:', r1, r2);
}

run();
