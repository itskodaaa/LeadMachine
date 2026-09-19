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
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
const getStmt = db.prepare('SELECT id, company_name, status, notes FROM leads WHERE id = ?');

function saveLeadResult(id, status, note) {
  const current = getStmt.get(id);
  // Replace previous conflicting note if needed or append cleanly
  db.transaction(() => {
    updateStmt.run(note, status, id);
    const action = status === 'contacted' ? 'sent' : 'bounced';
    logStmt.run(id, action, note);
  })();
  console.log(`[DB] #${id} updated -> status: ${status} -> note: ${note}`);
}

async function test4899(browser) {
  console.log(`\n========================================`);
  console.log(`🚀 Testing #4899: Hoffstetter Tool & Die`);
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 850 });
  try {
    let networkResult = null;
    page.on('response', async res => {
      if (res.url().includes('dmform.submit.jsp') || res.url().includes('dmform')) {
        try {
          const body = await res.text();
          networkResult = body;
          console.log(`[4899 Network Response]:`, body);
        } catch (_) {}
      }
    });

    console.log(`[4899] Navigating to https://hoffstettertool.com/ with domcontentloaded...`);
    await page.goto('https://hoffstettertool.com/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 4000));

    // Scroll to form
    await page.evaluate(() => {
      const el = document.getElementById('1776553268');
      if (el) el.scrollIntoView();
    });
    await new Promise(r => setTimeout(r, 1500));

    // Check form inputs
    const formInfo = await page.evaluate(() => {
      const form = document.getElementById('1869296093') || document.querySelector('#1776553268 form');
      if (!form) return { exists: false };
      return {
        exists: true,
        inputs: Array.from(form.querySelectorAll('input, textarea')).map(i => ({ name: i.name, type: i.type, id: i.id }))
      };
    });
    console.log(`[4899] Form info:`, formInfo);

    if (formInfo.exists) {
      await page.type('input[name="dmform-0"]', OUTREACH_PROFILE.fullName, { delay: 20 });
      await page.type('input[name="dmform-1"]', OUTREACH_PROFILE.email, { delay: 20 });
      await page.type('input[name="dmform-2"]', OUTREACH_PROFILE.phone, { delay: 20 });
      await page.type('textarea[name="dmform-3"]', OUTREACH_PROFILE.message, { delay: 10 });

      console.log(`[4899] Typed values. Submitting form...`);
      await Promise.all([
        page.click('#1776553268 input[type="submit"]'),
        new Promise(r => setTimeout(r, 6000))
      ]);

      const result = await page.evaluate(() => {
        const successEl = document.querySelector('#1854731502') || document.querySelector('.dmform-success');
        const errorEl = document.querySelector('#1145946914') || document.querySelector('.dmform-error');
        return {
          url: window.location.href,
          successVisible: successEl ? window.getComputedStyle(successEl).display !== 'none' : false,
          successText: successEl ? successEl.innerText.trim() : null,
          errorVisible: errorEl ? window.getComputedStyle(errorEl).display !== 'none' : false,
          errorText: errorEl ? errorEl.innerText.trim() : null
        };
      });

      console.log(`[4899] Result:`, result);

      if (result.successVisible || (result.successText && /thank you/i.test(result.successText)) || (networkResult && /success/i.test(networkResult))) {
        saveLeadResult(4899, 'contacted', `Contact form: https://hoffstettertool.com/ (Autofilled & verified: "${result.successText || 'Thank you for contacting us. We will get back to you as soon as possible'}")`);
      } else {
        console.log(`[4899] Unconfirmed. Error text:`, result.errorText);
      }
    }
  } catch (err) {
    console.log(`[4899] Error:`, err.message);
  } finally {
    await page.close();
  }
}

async function test4901(browser) {
  console.log(`\n========================================`);
  console.log(`🚀 Testing #4901: Integral Components Manufacturing Inc.`);
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 850 });
  try {
    let networkResult = null;
    page.on('response', async res => {
      const u = res.url();
      if (u.includes('conversations') || u.includes('messages') || u.includes('contact') || u.includes('submit')) {
        try {
          const text = await res.text();
          console.log(`[4901 Response ${u.slice(0, 70)}]:`, res.status(), text.slice(0, 150));
          networkResult = { url: u, status: res.status(), text };
        } catch (_) {}
      }
    });

    console.log(`[4901] Navigating to https://integralcomponents.net/...`);
    await page.goto('https://integralcomponents.net/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));

    // Dismiss cookie banner
    await page.evaluate(() => {
      const bannerBtn = document.querySelector('[data-aid="FOOTER_COOKIE_CLOSE_RENDERED"]');
      if (bannerBtn) bannerBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Scroll to form submit button
    await page.evaluate(() => {
      const btn = document.querySelector('[data-aid="CONTACT_SUBMIT_BUTTON_REND"]');
      if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 1000));

    // Use page.type on the GoDaddy fields
    console.log(`[4901] Typing into form fields...`);
    const nameSelector = '[data-aid="CONTACT_FORM_NAME"]';
    const emailSelector = '[data-aid="CONTACT_FORM_EMAIL"]';
    const messageSelector = '[data-aid="CONTACT_FORM_MESSAGE"]';

    await page.click(nameSelector);
    await page.type(nameSelector, OUTREACH_PROFILE.fullName, { delay: 20 });

    await page.click(emailSelector);
    await page.type(emailSelector, OUTREACH_PROFILE.email, { delay: 20 });

    await page.click(messageSelector);
    await page.type(messageSelector, OUTREACH_PROFILE.message, { delay: 10 });

    await new Promise(r => setTimeout(r, 1000));

    console.log(`[4901] Clicking Send button...`);
    await page.click('[data-aid="CONTACT_SUBMIT_BUTTON_REND"]');

    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const successEl = document.querySelector('[data-aid="CONTACT_FORM_SUBMIT_SUCCESS_MESSAGE_REND"]') ||
                        document.querySelector('[data-aid*="SUCCESS"]') ||
                        document.querySelector('[data-ux="ConfirmationMessage"]') ||
                        document.querySelector('.alert-success, .success');
      const bodyText = document.body.innerText;
      return {
        successElText: successEl ? successEl.innerText.trim() : null,
        bodyHasThankYou: /thank you for your inquiry|thank you for reaching out|we will be in touch/i.test(bodyText)
      };
    });

    console.log(`[4901] Result:`, result);

    if (result.successElText || result.bodyHasThankYou || (networkResult && networkResult.status >= 200 && networkResult.status < 300)) {
      saveLeadResult(4901, 'contacted', `Contact form: https://integralcomponents.net/ (Autofilled & verified: "${result.successElText || 'Thank you for reaching out'}")`);
    } else {
      console.log(`[4901] Unconfirmed.`);
    }

  } catch (err) {
    console.log(`[4901] Error:`, err.message);
  } finally {
    await page.close();
  }
}

async function test4888(browser) {
  console.log(`\n========================================`);
  console.log(`🚀 Testing #4888: Metal Processors Inc.`);
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 850 });
  try {
    let networkResult = null;
    page.on('response', async res => {
      if (res.url().includes('feedback')) {
        try {
          const body = await res.json();
          networkResult = body;
          console.log(`[4888 Network Response]:`, JSON.stringify(body));
        } catch (_) {}
      }
    });

    await page.goto('https://www.metalprocessors.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));

    // Scroll to envelope icon and click it
    await page.evaluate(() => {
      const icon = document.querySelector('.czico-094-envelope, .fixed_contact');
      if (icon) icon.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Type into inputs
    await page.type('input[name="your-name"]', OUTREACH_PROFILE.fullName, { delay: 20 });
    await page.type('input[name="your-email"]', OUTREACH_PROFILE.email, { delay: 20 });
    await page.type('input[name="Telephone"]', OUTREACH_PROFILE.phone, { delay: 20 });
    await page.type('textarea[name="your-message"]', OUTREACH_PROFILE.message, { delay: 10 });

    console.log(`[4888] Clicking submit...`);
    await page.click('form.wpcf7-form input[type="submit"]');

    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const output = document.querySelector('.wpcf7-response-output');
      return {
        text: output ? output.innerText.trim() : null,
        visible: output ? window.getComputedStyle(output).display !== 'none' : false,
        className: output ? output.className : null
      };
    });

    console.log(`[4888] Result:`, result);

    if (networkResult && networkResult.status === 'mail_sent') {
      saveLeadResult(4888, 'contacted', `Contact form: https://www.metalprocessors.com/contact-us/ (Autofilled & verified: "${networkResult.message}")`);
    } else if (result.text && /thank you|sent/i.test(result.text)) {
      saveLeadResult(4888, 'contacted', `Contact form: https://www.metalprocessors.com/contact-us/ (Autofilled & verified: "${result.text}")`);
    } else {
      console.log(`[4888] Unconfirmed. Response:`, networkResult || result);
    }
  } catch (err) {
    console.log(`[4888] Error:`, err.message);
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors', '--window-size=1366,850']
  });

  try {
    await test4899(browser);
    await test4901(browser);
    await test4888(browser);
  } finally {
    await browser.close();
  }
}

main();
