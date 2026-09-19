import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  address: '100 Main St',
  city: 'Chicago',
  state: 'IL',
  zip: '60601',
  message: 'Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson'
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
  console.log(`[DB] Saved Lead #${id} as ${status}: ${note}`);
}

async function testOneStop(browser) {
  console.log('\n--- Retrying Lead #4074: One Stop Inventing with Consent checkbox ---');
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  try {
    await page.goto('https://onestopinventing.com', { waitUntil: 'networkidle2', timeout: 35000 });
  } catch (e) {
    console.log('Nav warning, continuing...', e.message);
  }

  try {
    await page.waitForSelector('#input_1_1_3', { timeout: 10000 });
    await page.type('#input_1_1_3', OUTREACH_PROFILE.firstName, { delay: 20 });
    await page.type('#input_1_1_6', OUTREACH_PROFILE.lastName, { delay: 20 });
    await page.type('#input_1_2', OUTREACH_PROFILE.email, { delay: 20 });
    await page.type('#input_1_3', OUTREACH_PROFILE.phone, { delay: 20 });

    // Check consent checkboxes
    await page.evaluate(() => {
      const checkboxes = document.querySelectorAll('#gform_1 input[type="checkbox"]');
      checkboxes.forEach(c => {
        c.checked = true;
        c.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });

    await new Promise(r => setTimeout(r, 1000));
    const submitBtn = await page.$('#gform_submit_button_1');
    if (submitBtn) {
      console.log('Clicking submit on One Stop...');
      await submitBtn.click();
    }

    await new Promise(r => setTimeout(r, 6000));

    const confirmation = await page.evaluate(() => {
      const conf = document.querySelector('.gform_confirmation_message, #gforms_confirmation_message_1, .gform_validation_errors');
      if (conf) return conf.innerText.trim();
      return document.body.innerText;
    });

    console.log('One Stop confirmation result:', confirmation.slice(0, 300));
    if (/thank you|thanks for contacting|received your|inquiry received/i.test(confirmation)) {
      saveLeadResult(4074, 'contacted', `Contact form: https://onestopinventing.com (Autofilled & verified: ${confirmation.slice(0, 100).trim()})`);
    } else {
      saveLeadResult(4074, 'unable_to_reach', `Contact form: https://onestopinventing.com (Submission issue: ${confirmation.slice(0, 100).trim()})`);
    }
  } catch (e) {
    console.log('Error testing One Stop:', e.message);
  } finally {
    await page.close();
  }
}

async function testJdMiami(browser) {
  console.log('\n--- Testing Lead #4077: JD-MIAMI ---');
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  try {
    await page.goto('https://www.jd-miami.com/', { waitUntil: 'networkidle2', timeout: 30000 });
  } catch (e) {
    console.log('Nav warning on JD-MIAMI:', e.message);
  }

  try {
    const inputs = await page.evaluate(() => {
      const form = document.querySelector('form.dmRespDesignRow');
      if (!form) return null;
      return Array.from(form.querySelectorAll('input:not([type="hidden"]), textarea')).map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        label: i.closest('.dmforminput')?.querySelector('label')?.innerText || ''
      }));
    });
    console.log('JD-Miami inputs:', inputs);

    if (inputs) {
      for (const inp of inputs) {
        const label = inp.label.toLowerCase();
        const sel = `#${inp.id}`;
        if (label.includes('name')) {
          await page.type(sel, OUTREACH_PROFILE.fullName, { delay: 10 });
        } else if (label.includes('email')) {
          await page.type(sel, OUTREACH_PROFILE.email, { delay: 10 });
        } else if (label.includes('phone')) {
          await page.type(sel, OUTREACH_PROFILE.phone, { delay: 10 });
        } else if (label.includes('message') || inp.type === 'textarea') {
          await page.type(sel, OUTREACH_PROFILE.message, { delay: 5 });
        }
      }

      await new Promise(r => setTimeout(r, 1000));
      await page.evaluate(() => {
        const btn = document.querySelector('form.dmRespDesignRow input[type="submit"], form.dmRespDesignRow button');
        if (btn) btn.click();
      });

      await new Promise(r => setTimeout(r, 6000));
      const confirmation = await page.evaluate(() => {
        const resp = document.querySelector('.dmform-response, [role="alert"], .alert');
        if (resp) return resp.innerText.trim();
        return document.body.innerText;
      });
      console.log('JD-Miami confirmation:', confirmation.slice(0, 250));

      if (/thank you|received your message|in touch shortly|sent successfully/i.test(confirmation)) {
        saveLeadResult(4077, 'contacted', `Contact form: https://www.jd-miami.com/ (Autofilled & verified: ${confirmation.slice(0, 100).trim()})`);
      } else {
        saveLeadResult(4077, 'unable_to_reach', `Contact form: https://www.jd-miami.com/ (Result: ${confirmation.slice(0, 100).trim()})`);
      }
    }
  } catch (e) {
    console.log('Error testing JD-MIAMI:', e.message);
  } finally {
    await page.close();
  }
}

async function testGoDaddyInspect(browser, leadId, url, name) {
  console.log(`\n--- Inspecting GoDaddy site #${leadId}: ${name} (${url}) ---`);
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  } catch (e) {
    console.log(`Nav warning on ${url}:`, e.message);
  }

  try {
    const formDetails = await page.evaluate(() => {
      const form = document.querySelector('form[data-ux="Form"]');
      if (!form) return null;
      return {
        inputs: Array.from(form.querySelectorAll('input, textarea')).map(i => ({
          tag: i.tagName,
          type: i.type,
          dataAid: i.getAttribute('data-aid'),
          placeholder: i.placeholder,
          value: i.value,
          ariaLabel: i.getAttribute('aria-label')
        })),
        button: form.querySelector('button') ? form.querySelector('button').innerText : null
      };
    });
    console.log('GoDaddy Form Details:', formDetails);

    const nameInput = await page.$('input[data-aid="CONTACT_FORM_NAME"]');
    if (nameInput) await nameInput.type(OUTREACH_PROFILE.fullName, { delay: 20 });

    const emailInput = await page.$('input[data-aid="CONTACT_FORM_EMAIL"]');
    if (emailInput) await emailInput.type(OUTREACH_PROFILE.email, { delay: 20 });

    const phoneInput = await page.$('input[data-aid="CONTACT_FORM_PHONE"]');
    if (phoneInput) await phoneInput.type(OUTREACH_PROFILE.phone, { delay: 20 });

    const msgInput = await page.$('textarea[data-aid="CONTACT_FORM_MESSAGE"]');
    if (msgInput) await msgInput.type(OUTREACH_PROFILE.message, { delay: 10 });

    await new Promise(r => setTimeout(r, 1000));

    const submitBtn = await page.$('button[data-aid="CONTACT_FORM_SUBMIT_BUTTON_REND"]');
    if (submitBtn) {
      console.log('Clicking GoDaddy submit button...');
      await submitBtn.click();
    }

    await new Promise(r => setTimeout(r, 5000));

    const result = await page.evaluate(() => {
      const success = document.querySelector('[data-aid="CONTACT_FORM_SUBMIT_SUCCESS_MESSAGE_REND"]');
      if (success) return success.innerText.trim();
      const error = document.querySelector('[data-aid="CONTACT_FORM_SUBMIT_ERROR_MESSAGE_REND"]');
      if (error) return 'Error: ' + error.innerText.trim();
      return null;
    });

    console.log('GoDaddy submission result:', result);
    if (result && /thank you|thank you for reaching out/i.test(result)) {
      saveLeadResult(leadId, 'contacted', `Contact form: ${url} (Autofilled & verified: ${result})`);
    } else {
      saveLeadResult(leadId, 'unable_to_reach', `Contact form: ${url} (${result || 'No confirmation message displayed'})`);
    }
  } catch (e) {
    console.log(`Error testing ${name}:`, e.message);
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 60000,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    await testOneStop(browser);
    await testJdMiami(browser);
    await testGoDaddyInspect(browser, 4079, 'https://protek.engineering', 'Protek Engineering');
    await testGoDaddyInspect(browser, 4080, 'https://egscfl.com', 'EGSC Engineering Consultants, Inc.');
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
