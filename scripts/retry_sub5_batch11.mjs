/**
 * Targeted retry for #3757 Chiron America and #3759 AirBorn Manufacturing
 * Both have usable forms and no CAPTCHAs — retrying with careful field targeting
 */
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const P = {
  firstName: 'Pamela', lastName: 'Jameson', fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  zip: '60601',
  message: `Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson`
};

const SUCCESS_SIGNALS = ['thank you', 'thanks for', 'message has been sent', 'we have received', 'will contact you', 'will get back', 'submission was successful', 'submitted successfully', 'in touch shortly', 'inquiry received', 'form received', 'successfully submitted', 'your message was sent', 'we will be in touch', 'sent successfully', 'request received', 'danke', 'vielen dank'];

const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
const getStmt = db.prepare('SELECT notes FROM leads WHERE id = ?');

function saveResult(id, status, note) {
  const cur = getStmt.get(id);
  const newNotes = cur?.notes ? cur.notes + ' | ' + note : note;
  db.transaction(() => {
    updateStmt.run(newNotes, status, id);
    logStmt.run(id, status === 'contacted' ? 'sent' : 'bounced', note);
  })();
}

async function typeIntoField(page, selector, value) {
  try {
    await page.click(selector, { clickCount: 3 });
    await page.keyboard.type(value, { delay: 30 });
  } catch (e) {}
}

async function tryChinronAmerica(browser) {
  console.log('\n🌐 Retrying #3757 Chiron America: https://chiron-group.com/contact');
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch (_) {} });
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  
  try {
    await page.goto('https://chiron-group.com/contact', { waitUntil: 'networkidle0', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));

    // Check for privacy / cookie modal and close it
    try {
      const cookieBtn = await page.$('button#onetrust-accept-btn-handler, button[class*="accept"], button[class*="cookie"], [data-test="cookie-accept"]');
      if (cookieBtn) { await cookieBtn.click(); await new Promise(r => setTimeout(r, 1000)); }
    } catch (e) {}

    // Check for title dropdown (required)
    try {
      await page.select('#Title', page.evaluate(() => {
        const sel = document.querySelector('#Title');
        return sel?.options[1]?.value || '';
      }));
    } catch(e) {}
    
    // Type into named fields
    await typeIntoField(page, 'input[name="first_name"]', P.firstName);
    await typeIntoField(page, 'input[name="last_name"]', P.lastName);
    await typeIntoField(page, 'input[name="company"]', P.company);
    await typeIntoField(page, 'input[name="email"]', P.email);
    await typeIntoField(page, 'input[name="phone"]', P.phone);
    await typeIntoField(page, 'input[name="zip"]', P.zip);

    // Find message/subject textarea
    try {
      const textareas = await page.$$('textarea');
      for (const ta of textareas) {
        const isVisible = await ta.evaluate(el => el.offsetWidth > 0 && el.offsetHeight > 0);
        if (isVisible) {
          await ta.click({ clickCount: 3 });
          await ta.type(P.message, { delay: 10 });
          break;
        }
      }
    } catch (e) {}

    const initialUrl = page.url();
    
    // Submit
    try {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button[type="submit"], input[type="submit"], button'));
        for (const btn of buttons) {
          const text = (btn.innerText || btn.value || '').toLowerCase();
          if (btn.type === 'submit' || text.includes('send') || text.includes('submit') || text.includes('contact')) {
            btn.click(); return;
          }
        }
        const form = document.querySelector('form');
        if (form) form.requestSubmit ? form.requestSubmit() : form.submit();
      });
    } catch (e) {}

    await new Promise(r => setTimeout(r, 5000));

    const body = await page.evaluate(() => document.body?.innerText?.toLowerCase() || '');
    const currentUrl = page.url();
    
    let confirmed = false;
    let phrase = '';
    for (const sig of SUCCESS_SIGNALS) {
      if (body.includes(sig)) { confirmed = true; phrase = sig; break; }
    }
    if (!confirmed && currentUrl !== initialUrl && (currentUrl.includes('thank') || currentUrl.includes('success'))) {
      confirmed = true; phrase = 'Redirected: ' + currentUrl;
    }

    if (confirmed) {
      console.log(`   ✅ Confirmed: "${phrase}"`);
      saveResult(3757, 'contacted', `Contact form: https://chiron-group.com/contact (Autofilled & verified: ${phrase})`);
    } else {
      console.log(`   ⚠️ Still unconfirmed. Body snippet: "${body.substring(0, 300)}"`);
      saveResult(3757, 'unable_to_reach', `Contact form: https://chiron-group.com/contact (Retry: form autofilled with named fields; no confirmation signal detected - complex multi-step form requires mandatory Title dropdown)`);
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    saveResult(3757, 'unable_to_reach', `Contact form: https://chiron-group.com/contact (Retry error: ${e.message.split('\n')[0]})`);
  } finally {
    await page.close();
  }
}

async function tryAirBorn(browser) {
  console.log('\n🌐 Retrying #3759 AirBorn Manufacturing: https://airbornusa.com/contact');
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch (_) {} });
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  try {
    await page.goto('https://airbornusa.com/contact', { waitUntil: 'networkidle0', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    // Fill named fields
    await typeIntoField(page, 'input[name="name"]', P.fullName);
    await typeIntoField(page, 'input[name="email"]', P.email);
    await typeIntoField(page, 'textarea[name="message"]', P.message);

    // Check checkbox if visible
    try {
      const checkbox = await page.$('input[name="manufacturingConfirmation"]');
      if (checkbox) {
        const checked = await checkbox.evaluate(el => el.checked);
        if (!checked) await checkbox.click();
      }
    } catch (e) {}

    // Handle howHeard select
    try {
      await page.select('select[name="howHeard"]', 'Other');
    } catch (e) {
      try {
        await page.evaluate(() => {
          const sel = document.querySelector('select[name="howHeard"]');
          if (sel && sel.options.length > 0) { sel.selectedIndex = 1; sel.dispatchEvent(new Event('change', {bubbles: true})); }
        });
      } catch (_) {}
    }

    const initialUrl = page.url();

    // Submit
    try {
      await page.evaluate(() => {
        const btn = document.querySelector('button[type="submit"], input[type="submit"], form button');
        if (btn) { btn.click(); return; }
        const form = document.querySelector('form');
        if (form) form.requestSubmit ? form.requestSubmit() : form.submit();
      });
    } catch (e) {}

    await new Promise(r => setTimeout(r, 5000));

    const body = await page.evaluate(() => document.body?.innerText?.toLowerCase() || '');
    const currentUrl = page.url();

    let confirmed = false;
    let phrase = '';
    for (const sig of SUCCESS_SIGNALS) {
      if (body.includes(sig)) { confirmed = true; phrase = sig; break; }
    }
    if (!confirmed && currentUrl !== initialUrl && (currentUrl.includes('thank') || currentUrl.includes('success'))) {
      confirmed = true; phrase = 'Redirected: ' + currentUrl;
    }

    if (confirmed) {
      console.log(`   ✅ Confirmed: "${phrase}"`);
      saveResult(3759, 'contacted', `Contact form: https://airbornusa.com/contact (Autofilled & verified: ${phrase})`);
    } else {
      console.log(`   ⚠️ Still unconfirmed. Body snippet: "${body.substring(0, 300)}"`);
      saveResult(3759, 'unable_to_reach', `Contact form: https://airbornusa.com/contact (Retry: Netlify/static form with bot-field honeypot; form submitted but confirmation not captured — may have succeeded silently)`);
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    saveResult(3759, 'unable_to_reach', `Contact form: https://airbornusa.com/contact (Retry error: ${e.message.split('\n')[0]})`);
  } finally {
    await page.close();
  }
}

// Also update notes for #3752 and #3756 to reflect confirmed CAPTCHA blocker
async function updateCaptchaBlockedNotes() {
  const cur3752 = getStmt.get(3752);
  const newNotes3752 = cur3752?.notes 
    ? cur3752.notes.replace('No explicit confirmation detected post-submission', 'Blocked by Google reCAPTCHA (Wix form; form fields autofilled but reCAPTCHA v2 prevents submission)')
    : 'Contact form: https://lwengineer.com/contact-us (Blocked by Google reCAPTCHA)';
  updateStmt.run(newNotes3752, 'unable_to_reach', 3752);

  const cur3756 = getStmt.get(3756);
  const newNotes3756 = cur3756?.notes
    ? cur3756.notes.replace('Validation error: "there was a problem"', 'Blocked by Google reCAPTCHA (Gravity Forms; reCAPTCHA v2 required; form cannot be submitted headlessly)')
    : 'Contact form: https://machinetechcnc.com/contact/ (Blocked by Google reCAPTCHA)';
  updateStmt.run(newNotes3756, 'unable_to_reach', 3756);

  const cur3755 = getStmt.get(3755);
  const newNotes3755 = cur3755?.notes
    ? cur3755.notes.replace('No explicit confirmation detected post-submission', 'No proper contact form — only a newsletter email subscription field found on the page; no name/message fields available')
    : 'Checked https://intergemm.com/expert-machining-support: Only newsletter signup found, no contact form';
  updateStmt.run(newNotes3755, 'unable_to_reach', 3755);

  console.log('✅ Updated CAPTCHA/no-form notes for #3752, #3755, #3756');
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  await updateCaptchaBlockedNotes();
  await tryChinronAmerica(browser);
  await tryAirBorn(browser);

  try { await browser.close(); } catch (_) {}
  console.log('\n✅ Retry run complete.');
}

run();
