import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  phonePlain: '7085683708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: 'Hello, I am reaching out to express our interest in your equipment and automation services. We would appreciate the opportunity to explore potential collaboration. Please contact us at your convenience. Thank you, Pamela Jameson'
};

async function testBatch3() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. Inspect Washtown (#1611) - Fix "please enter a valid"
  console.log('\n--- Inspecting #1611 Washtown Equipment ---');
  try {
    const p = await browser.newPage();
    await p.goto('https://washtownequipment.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const contactLinks = await p.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => ({ href: a.href, text: a.innerText.trim() })).filter(a => /contact/i.test(a.href) || /contact/i.test(a.text)));
    console.log('1611 contact links:', contactLinks);
    if (contactLinks.length > 0) {
      await p.goto(contactLinks[0].href, { waitUntil: 'domcontentloaded', timeout: 20000 });
    }
    const formInputs = await p.evaluate(() => {
      const f = document.querySelector('form');
      if (!f) return null;
      return {
        action: f.action,
        fields: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
          tag: i.tagName,
          name: i.name,
          id: i.id,
          type: i.type,
          placeholder: i.placeholder,
          required: i.required,
          pattern: i.pattern
        }))
      };
    });
    console.log('1611 form inputs:', JSON.stringify(formInputs, null, 2));

    // Fill form carefully
    if (formInputs) {
      const pInputs = await p.$$('form input, form textarea');
      for (const el of pInputs) {
        const info = await p.evaluate(i => ({ name: (i.name || '').toLowerCase(), id: (i.id || '').toLowerCase(), type: i.type, ph: (i.placeholder || '').toLowerCase() }), el);
        const combined = `${info.name} ${info.id} ${info.ph}`;
        if (/first.*name/i.test(combined)) await el.type(OUTREACH.firstName);
        else if (/last.*name/i.test(combined)) await el.type(OUTREACH.lastName);
        else if (/name/i.test(combined)) await el.type(OUTREACH.fullName);
        else if (/email/i.test(combined)) await el.type(OUTREACH.email);
        else if (/phone|tel/i.test(combined)) await el.type(OUTREACH.phone);
        else if (/subject/i.test(combined)) await el.type(OUTREACH.subject);
        else if (/message|comment/i.test(combined) || info.type === 'textarea') await el.type(OUTREACH.message);
      }
      await new Promise(r => setTimeout(r, 1000));
      const submitBtn = await p.$('form button[type="submit"], form input[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        await new Promise(r => setTimeout(r, 5000));
        const pageText = await p.evaluate(() => document.body.innerText.slice(0, 500));
        console.log('1611 result snippet:', pageText.replace(/\s+/g, ' '));
        if (/thank you|received|sent|success|message has been/i.test(pageText)) {
          db.prepare('UPDATE leads SET status = ?, notes = notes || ? WHERE id = ?').run('contacted', ' | Form submitted & confirmed: ' + pageText.slice(0, 100), 1611);
          db.prepare('INSERT INTO contact_logs (lead_id, action, notes) VALUES (?, ?, ?)').run(1611, 'sent', 'Confirmed: ' + pageText.slice(0, 100));
          console.log('1611 DB UPDATED TO CONTACTED');
        }
      }
    }
    await p.close();
  } catch (e) {
    console.log('1611 error:', e.message);
  }

  // 2. Inspect City Sewing Machine (#1483)
  console.log('\n--- Inspecting #1483 City Sewing Machine ---');
  try {
    const p = await browser.newPage();
    await p.goto('https://citysewingmachine.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const contactLinks = await p.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => ({ href: a.href, text: a.innerText.trim() })).filter(a => /contact/i.test(a.href) || /contact/i.test(a.text)));
    console.log('1483 contact links:', contactLinks);
    if (contactLinks.length > 0) {
      await p.goto(contactLinks[0].href, { waitUntil: 'domcontentloaded', timeout: 20000 });
      const forms = await p.evaluate(() => Array.from(document.querySelectorAll('form')).map(f => ({
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => ({ name: i.name, type: i.type, id: i.id }))
      })));
      console.log('1483 forms on contact page:', forms);
    }
    await p.close();
  } catch (e) {
    console.log('1483 error:', e.message);
  }

  // 3. Inspect EU Automation (#1599)
  console.log('\n--- Inspecting #1599 EU Automation ---');
  try {
    const p = await browser.newPage();
    await p.goto('https://www.euautomation.com/us/contact-us', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const formInfo = await p.evaluate(() => {
      const f = document.querySelector('form');
      return {
        action: f?.action,
        hasCaptcha: !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], .cf-turnstile'),
        inputs: Array.from(document.querySelectorAll('form input, form textarea')).map(i => i.name || i.id || i.type)
      };
    });
    console.log('1599 contact form:', formInfo);
    await p.close();
  } catch (e) {
    console.log('1599 error:', e.message);
  }

  // 4. Check 1604 Advance Automation
  console.log('\n--- Checking #1604 Advance Automation ---');
  try {
    const p = await browser.newPage();
    const res = await p.goto('https://advanceautomationco.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log('1604 status:', res?.status());
    await p.close();
  } catch (e) {
    console.log('1604 error:', e.message);
  }

  await browser.close();
}

testBatch3();
