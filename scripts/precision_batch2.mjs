import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '7085683708',
  phoneFormatted: '(708) 568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  address: '100 Main St',
  city: 'Chicago',
  state: 'IL',
  zip: '60601',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');

function saveLeadResult(id, status, note) {
  db.transaction(() => {
    updateStmt.run(note, status, id);
    const action = status === 'contacted' ? 'sent' : 'bounced';
    logStmt.run(id, action, note);
  })();
}

async function runBatch2Precision() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  // ==========================================
  // LEAD #176: Intelligent Construction, Inc.
  // ==========================================
  console.log('\n--- Processing Lead #176: Intelligent Construction, Inc. ---');
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://intelligentcons.com/contact', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));

    // Type with keyboard into React form
    const nameIn = await page.$('input[name="name"], input[placeholder*="Name"]');
    if (nameIn) { await nameIn.click(); await nameIn.type(OUTREACH_PROFILE.fullName, { delay: 30 }); }

    const emailIn = await page.$('input[name="email"], input[placeholder*="Email"]');
    if (emailIn) { await emailIn.click(); await emailIn.type(OUTREACH_PROFILE.email, { delay: 30 }); }

    const phoneIn = await page.$('input[name="phone"], input[placeholder*="Phone"]');
    if (phoneIn) { await phoneIn.click(); await phoneIn.type(OUTREACH_PROFILE.phoneFormatted, { delay: 30 }); }

    const msgIn = await page.$('textarea[name="message"], textarea[placeholder*="project"]');
    if (msgIn) { await msgIn.click(); await msgIn.type(OUTREACH_PROFILE.message, { delay: 10 }); }

    await new Promise(r => setTimeout(r, 1000));

    // Submit
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
    }

    await new Promise(r => setTimeout(r, 5000));

    const verify = await page.evaluate(() => {
      const body = document.body?.innerText.toLowerCase() || '';
      const alerts = Array.from(document.querySelectorAll('[role="alert"], .alert, .toast, [data-state="open"]')).map(a => a.innerText).join(' ');
      return { bodySnippet: body.substring(0, 300), alerts };
    });

    console.log('#176 Result:', verify.alerts, 'Snippet:', verify.bodySnippet);
    if (verify.alerts.toLowerCase().includes('thank') || verify.alerts.toLowerCase().includes('sent') || verify.alerts.toLowerCase().includes('success') || verify.bodySnippet.includes('thank')) {
      saveLeadResult(176, 'contacted', `Contact form: https://intelligentcons.com/contact (Verified: ${verify.alerts.trim() || 'Thank you'})`);
    } else {
      saveLeadResult(176, 'unable_to_reach', `Contact form: https://intelligentcons.com/contact (${verify.alerts || 'Validation error post-submission'})`);
    }
    await page.close();
  } catch (e) {
    console.log('#176 Error:', e.message);
    saveLeadResult(176, 'unable_to_reach', `Error: ${e.message}`);
  }

  // ==========================================
  // LEAD #177: Madison Construction Group Inc.
  // ==========================================
  console.log('\n--- Processing Lead #177: Madison Construction Group Inc. ---');
  try {
    const page = await browser.newPage();
    let loaded = false;
    for (const u of ['https://madisongc.com', 'http://madisongc.com', 'https://www.madisongc.com']) {
      try {
        await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 15000 });
        loaded = true;
        break;
      } catch (err) {}
    }
    if (!loaded) {
      console.log('#177: Site Inaccessible / Timeout');
      saveLeadResult(177, 'unable_to_reach', 'Site inaccessible / connection timeout');
    } else {
      await new Promise(r => setTimeout(r, 2000));
      const hasForm = await page.evaluate(() => document.querySelectorAll('form input').length >= 2);
      if (!hasForm) {
        saveLeadResult(177, 'unable_to_reach', `Checked ${page.url()}: No online web contact form found`);
      }
    }
    await page.close();
  } catch (e) {
    saveLeadResult(177, 'unable_to_reach', `Error: ${e.message}`);
  }

  // ==========================================
  // LEAD #178: Stephenson Construction, Inc
  // ==========================================
  console.log('\n--- Processing Lead #178: Stephenson Construction, Inc ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.dstephenson.com/where-we-are', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 3000));

    const pageInfo = await page.evaluate(() => {
      const forms = document.querySelectorAll('form').length;
      const text = document.body ? document.body.innerText.substring(0, 400) : '';
      return { forms, text };
    });

    console.log('#178 Forms on /where-we-are:', pageInfo.forms);
    if (pageInfo.forms === 0) {
      saveLeadResult(178, 'unable_to_reach', 'Checked https://www.dstephenson.com/where-we-are: Office locations & phone directory only; no online web contact form');
    }
    await page.close();
  } catch (e) {
    saveLeadResult(178, 'unable_to_reach', `Error: ${e.message}`);
  }

  // ==========================================
  // LEAD #179: JRG Construction Group
  // ==========================================
  console.log('\n--- Processing Lead #179: JRG Construction Group ---');
  try {
    const page = await browser.newPage();
    let loaded = false;
    for (const u of ['https://jrgconstructiongroup.com', 'http://jrgconstructiongroup.com', 'https://www.jrgconstructiongroup.com']) {
      try {
        await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 15000 });
        loaded = true;
        break;
      } catch (err) {}
    }
    if (!loaded) {
      saveLeadResult(179, 'unable_to_reach', 'Site inaccessible / connection timeout');
    } else {
      const hasForm = await page.evaluate(() => document.querySelectorAll('form input').length >= 2);
      if (!hasForm) {
        saveLeadResult(179, 'unable_to_reach', `Checked ${page.url()}: No online web contact form found`);
      }
    }
    await page.close();
  } catch (e) {
    saveLeadResult(179, 'unable_to_reach', `Error: ${e.message}`);
  }

  // ==========================================
  // LEAD #180: Persant Construction Co Inc
  // ==========================================
  console.log('\n--- Processing Lead #180: Persant Construction Co Inc ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://persantconstruction.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));

    const info = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea, button')).map(i => ({
          type: i.type,
          name: i.name,
          placeholder: i.placeholder
        }))
      }));
      return { forms, body: document.body?.innerText.substring(0, 400) };
    });

    console.log('#180 Forms on /contact-us/:', JSON.stringify(info.forms, null, 2));
    if (info.forms.filter(f => f.inputs.length > 2).length === 0) {
      saveLeadResult(180, 'unable_to_reach', 'Checked https://persantconstruction.com/contact-us/: Direct phone & office address only; no web contact form');
    }
    await page.close();
  } catch (e) {
    saveLeadResult(180, 'unable_to_reach', `Error: ${e.message}`);
  }

  // ==========================================
  // LEAD #183: Ortega Construction Company
  // ==========================================
  console.log('\n--- Processing Lead #183: Ortega Construction Company ---');
  try {
    const page = await browser.newPage();
    let loaded = false;
    for (const u of ['https://ortegacc.com', 'http://ortegacc.com', 'https://www.ortegacc.com']) {
      try {
        await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 15000 });
        loaded = true;
        break;
      } catch (err) {}
    }
    if (!loaded) {
      saveLeadResult(183, 'unable_to_reach', 'Site inaccessible / connection timeout');
    } else {
      const hasForm = await page.evaluate(() => document.querySelectorAll('form input').length >= 2);
      if (!hasForm) {
        saveLeadResult(183, 'unable_to_reach', `Checked ${page.url()}: No online web contact form found`);
      }
    }
    await page.close();
  } catch (e) {
    saveLeadResult(183, 'unable_to_reach', `Error: ${e.message}`);
  }

  // ==========================================
  // LEAD #185: Thales Builders Corporation
  // ==========================================
  console.log('\n--- Processing Lead #185: Thales Builders Corporation ---');
  try {
    const page = await browser.newPage();
    let loaded = false;
    for (const u of ['https://thalesbuilders.com', 'http://thalesbuilders.com', 'https://www.thalesbuilders.com']) {
      try {
        await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 15000 });
        loaded = true;
        break;
      } catch (err) {}
    }
    if (!loaded) {
      saveLeadResult(185, 'unable_to_reach', 'Site inaccessible / domain resolution timeout');
    }
    await page.close();
  } catch (e) {
    saveLeadResult(185, 'unable_to_reach', `Error: ${e.message}`);
  }

  // ==========================================
  // LEAD #186: E. GOMEZ CONSTRUCTION
  // ==========================================
  console.log('\n--- Processing Lead #186: E. GOMEZ CONSTRUCTION ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://egomezconstruction.com/contact-us', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));

    const info186 = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea, select, button')).map(i => ({
          type: i.type,
          name: i.name,
          placeholder: i.placeholder,
          required: i.required
        }))
      }));
      return { forms, body: document.body?.innerText.substring(0, 400) };
    });

    console.log('#186 Forms on /contact-us:', JSON.stringify(info186.forms, null, 2));

    if (info186.forms.length > 0 && info186.forms[0].inputs.length >= 3) {
      // Fill form
      await page.evaluate((p) => {
        const form = document.querySelector('form');
        const inputs = Array.from(form.querySelectorAll('input:not([type="hidden"]), textarea'));
        for (const input of inputs) {
          const type = (input.type || '').toLowerCase();
          const name = (input.name || '').toLowerCase();
          const placeholder = (input.placeholder || '').toLowerCase();
          const combined = `${name} ${placeholder}`;

          if (input.tagName.toLowerCase() === 'textarea' || combined.includes('message')) input.value = p.message;
          else if (type === 'email' || combined.includes('email')) input.value = p.email;
          else if (type === 'tel' || combined.includes('phone')) input.value = p.phoneFormatted;
          else if (combined.includes('name')) input.value = p.fullName;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
        if (submitBtn) submitBtn.click();
      }, OUTREACH_PROFILE);

      await new Promise(r => setTimeout(r, 5000));

      const verify = await page.evaluate(() => {
        const body = document.body?.innerText.toLowerCase() || '';
        return { bodySnippet: body.substring(0, 300) };
      });

      if (verify.bodySnippet.includes('thank') || verify.bodySnippet.includes('received') || verify.bodySnippet.includes('sent')) {
        saveLeadResult(186, 'contacted', 'Contact form: https://egomezconstruction.com/contact-us (Verified: Thank you)');
      } else {
        saveLeadResult(186, 'unable_to_reach', 'Contact form: https://egomezconstruction.com/contact-us (Unconfirmed submission)');
      }
    } else {
      saveLeadResult(186, 'unable_to_reach', 'Checked https://egomezconstruction.com/contact-us: No online web form found');
    }
    await page.close();
  } catch (e) {
    saveLeadResult(186, 'unable_to_reach', `Error: ${e.message}`);
  }

  await browser.close();
}

runBatch2Precision();
