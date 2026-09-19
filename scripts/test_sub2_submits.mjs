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

async function launchBrowser() {
  return await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
}

// 1. Submit EUA (#4399)
async function submitEUA(browser) {
  const page = await browser.newPage();
  try {
    console.log('\n--- Submitting EUA (#4399) ---');
    await page.goto('https://eua.com/contact/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Fill fields
    await page.waitForSelector('input[name="item_meta[1]"]', { timeout: 10000 });
    await page.type('input[name="item_meta[1]"]', PROFILE.fullName, { delay: 30 });
    await page.type('input[name="item_meta[3]"]', PROFILE.email, { delay: 30 });
    await page.type('input[name="item_meta[4]"]', PROFILE.subject, { delay: 30 });
    await page.type('textarea[name="item_meta[5]"]', PROFILE.message, { delay: 20 });

    // Submit
    const submitBtn = await page.$('form.frm-show-form button[type="submit"]');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
      submitBtn.click()
    ]);

    await new Promise(r => setTimeout(r, 4000));
    const bodyText = (await page.evaluate(() => document.body.innerText)).toLowerCase();
    const success = SUCCESS_SIGNALS.find(sig => bodyText.includes(sig));
    console.log('EUA result text contains success signal:', success);
    if (success) {
      saveLeadResult(4399, 'contacted', `Confirmed submission on https://eua.com/contact/ ("${success}")`);
      return { id: 4399, status: 'contacted', result: `Confirmed: ${success}` };
    } else {
      console.log('EUA snippet:', bodyText.substring(0, 300));
      return { id: 4399, status: 'unable_to_reach', result: 'Form submitted but no confirmation detected' };
    }
  } catch (e) {
    console.log('EUA error:', e.message);
    return { id: 4399, status: 'unable_to_reach', result: e.message };
  } finally {
    await page.close();
  }
}

// 2. Submit CPL (#4402)
async function submitCPL(browser) {
  const page = await browser.newPage();
  try {
    console.log('\n--- Submitting CPL (#4402) ---');
    await page.goto('https://cplteam.com/contact/', { waitUntil: 'networkidle2', timeout: 30000 });

    await page.waitForSelector('#input_1_4', { timeout: 10000 });
    await page.type('#input_1_4', PROFILE.fullName, { delay: 30 });
    await page.type('#input_1_6', PROFILE.email, { delay: 30 });
    await page.type('#input_1_5', PROFILE.phone, { delay: 30 });
    await page.type('#input_1_7', PROFILE.subject, { delay: 30 });
    await page.type('#input_1_3', PROFILE.message, { delay: 20 });
    // Do NOT touch input_1_9 or ak_hp_textarea (honeypots!)

    const submitBtn = await page.$('#gform_submit_button_1');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
      submitBtn.click()
    ]);

    await new Promise(r => setTimeout(r, 4000));
    const bodyText = (await page.evaluate(() => document.body.innerText)).toLowerCase();
    const success = SUCCESS_SIGNALS.find(sig => bodyText.includes(sig));
    console.log('CPL result text contains success signal:', success);
    if (success) {
      saveLeadResult(4402, 'contacted', `Confirmed submission on https://cplteam.com/contact/ ("${success}")`);
      return { id: 4402, status: 'contacted', result: `Confirmed: ${success}` };
    } else {
      console.log('CPL snippet:', bodyText.substring(0, 300));
      return { id: 4402, status: 'unable_to_reach', result: 'Form submitted but no confirmation detected' };
    }
  } catch (e) {
    console.log('CPL error:', e.message);
    return { id: 4402, status: 'unable_to_reach', result: e.message };
  } finally {
    await page.close();
  }
}

// 3. Submit BAA Mechanical (#4404)
async function submitBAA(browser) {
  const page = await browser.newPage();
  try {
    console.log('\n--- Submitting BAA Mechanical (#4404) ---');
    await page.goto('https://www.baamechanical.com/', { waitUntil: 'networkidle2', timeout: 30000 });

    await page.waitForSelector('#input_comp-jx4lmi5l', { timeout: 10000 });
    await page.type('#input_comp-jx4lmi5l', PROFILE.fullName, { delay: 30 });
    await page.type('#input_comp-jx4lmi7g', PROFILE.email, { delay: 30 });
    await page.type('#input_comp-jx4lmi8s', PROFILE.subject, { delay: 30 });
    await page.type('#textarea_comp-jx4lmia0', PROFILE.message, { delay: 20 });

    // Submit button in Wix form
    const submitBtn = await page.$('form button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
    }

    await new Promise(r => setTimeout(r, 6000));
    const bodyText = (await page.evaluate(() => document.body.innerText)).toLowerCase();
    const success = SUCCESS_SIGNALS.find(sig => bodyText.includes(sig));
    console.log('BAA result text contains success signal:', success);
    if (success) {
      saveLeadResult(4404, 'contacted', `Confirmed submission on https://www.baamechanical.com/ ("${success}")`);
      return { id: 4404, status: 'contacted', result: `Confirmed: ${success}` };
    } else {
      // Check for any alerts or notifications
      console.log('BAA snippet around form:', bodyText.substring(0, 300));
      return { id: 4404, status: 'unable_to_reach', result: 'Form submitted but no confirmation detected' };
    }
  } catch (e) {
    console.log('BAA error:', e.message);
    return { id: 4404, status: 'unable_to_reach', result: e.message };
  } finally {
    await page.close();
  }
}

// 4. Submit Converge Engineering (#4405)
async function submitConverge(browser) {
  const page = await browser.newPage();
  try {
    console.log('\n--- Submitting Converge Engineering (#4405) ---');
    await page.goto('https://www.convergeengineers.com/contact-7', { waitUntil: 'networkidle2', timeout: 30000 });

    await page.waitForSelector('#input_comp-me71m0523', { timeout: 10000 });
    await page.type('#input_comp-me71m0523', PROFILE.firstName, { delay: 30 });
    await page.type('#input_comp-me71m05c', PROFILE.lastName, { delay: 30 });
    await page.type('#input_comp-me71m05c3', PROFILE.email, { delay: 30 });
    await page.type('#textarea_comp-me71m05d2', PROFILE.message, { delay: 20 });

    const submitBtn = await page.$('form button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
    }

    await new Promise(r => setTimeout(r, 6000));
    const bodyText = (await page.evaluate(() => document.body.innerText)).toLowerCase();
    const success = SUCCESS_SIGNALS.find(sig => bodyText.includes(sig));
    console.log('Converge result text contains success signal:', success);
    if (success) {
      saveLeadResult(4405, 'contacted', `Confirmed submission on https://www.convergeengineers.com/contact-7 ("${success}")`);
      return { id: 4405, status: 'contacted', result: `Confirmed: ${success}` };
    } else {
      console.log('Converge snippet:', bodyText.substring(0, 300));
      return { id: 4405, status: 'unable_to_reach', result: 'Form submitted but no confirmation detected' };
    }
  } catch (e) {
    console.log('Converge error:', e.message);
    return { id: 4405, status: 'unable_to_reach', result: e.message };
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await launchBrowser();
  const results = [];

  results.push(await submitEUA(browser));
  results.push(await submitCPL(browser));
  results.push(await submitBAA(browser));
  results.push(await submitConverge(browser));

  await browser.close();
  console.log('\n=== Submissions Summary ===');
  console.table(results);
}

main();
