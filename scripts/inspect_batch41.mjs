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
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: 'Hello, I am reaching out to express our interest in your metal fabrication and machining services. We would appreciate the opportunity to explore a potential business relationship on upcoming projects. Kindly arrange for a representative to contact us at your earliest convenience. Thank you, Pamela Jameson'
};

async function testBatch41() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. Inspect & Fix #1968 Burca Elevator
  console.log('\n--- 1968 Burca Elevator ---');
  try {
    const p = await browser.newPage();
    await p.goto('https://burcaelevator.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const contactLinks = await p.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => ({ href: a.href, text: a.innerText.trim() })).filter(a => /contact/i.test(a.href) || /contact/i.test(a.text)));
    if (contactLinks.length > 0) {
      await p.goto(contactLinks[0].href, { waitUntil: 'domcontentloaded', timeout: 20000 });
    }
    const formInfo = await p.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return null;
      return {
        action: form.action,
        inputs: Array.from(form.querySelectorAll('input, textarea, select')).map(i => ({
          tag: i.tagName,
          type: i.type,
          name: i.name,
          id: i.id,
          placeholder: i.placeholder,
          required: i.required,
          labels: Array.from(i.labels || []).map(l => l.innerText)
        }))
      };
    });
    console.log('1968 form info:', JSON.stringify(formInfo, null, 2));

    if (formInfo) {
      const inputs = await p.$$('form input, form textarea');
      for (const el of inputs) {
        const d = await p.evaluate(i => ({
          type: i.type,
          name: (i.name || '').toLowerCase(),
          id: (i.id || '').toLowerCase(),
          ph: (i.placeholder || '').toLowerCase(),
          labels: Array.from(i.labels || []).map(l => l.innerText.toLowerCase()).join(' ')
        }), el);
        const text = `${d.name} ${d.id} ${d.ph} ${d.labels}`;
        if (/first.*name/i.test(text)) await el.type(OUTREACH.firstName);
        else if (/last.*name/i.test(text)) await el.type(OUTREACH.lastName);
        else if (/name/i.test(text)) await el.type(OUTREACH.fullName);
        else if (/email/i.test(text)) await el.type(OUTREACH.email);
        else if (/phone|tel/i.test(text)) await el.type(OUTREACH.phone);
        else if (/subject/i.test(text)) await el.type(OUTREACH.subject);
        else if (/message|comment/i.test(text) || d.type === 'textarea') await el.type(OUTREACH.message);
      }
      await new Promise(r => setTimeout(r, 1000));
      const btn = await p.$('form button[type="submit"], form input[type="submit"]');
      if (btn) {
        await btn.click();
        await new Promise(r => setTimeout(r, 5000));
        const resp = await p.evaluate(() => document.body.innerText.slice(0, 400));
        console.log('1968 resp:', resp.replace(/\s+/g, ' '));
        if (/thank you|received|sent|success|message.*sent/i.test(resp)) {
          db.prepare('UPDATE leads SET status = ?, notes = notes || ? WHERE id = ?').run('contacted', ' | Form submitted & confirmed: ' + resp.slice(0, 100), 1968);
          db.prepare('INSERT INTO contact_logs (lead_id, action, notes) VALUES (?, ?, ?)').run(1968, 'sent', 'Confirmed: ' + resp.slice(0, 100));
          console.log('1968 DB UPDATED TO CONTACTED');
        }
      }
    }
    await p.close();
  } catch (e) {
    console.log('1968 error:', e.message);
  }

  // 2. Inspect #1972 Space City Fabrication
  console.log('\n--- 1972 Space City Fabrication ---');
  try {
    const p = await browser.newPage();
    await p.goto('https://spacecityfab.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const forms = await p.evaluate(() => Array.from(document.querySelectorAll('form')).map(f => ({
      action: f.action,
      inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => i.name || i.id || i.type)
    })));
    console.log('1972 forms:', forms);
    await p.close();
  } catch (e) {
    console.log('1972 error:', e.message);
  }

  // 3. Inspect #1973 Twisted Metal Concepts
  console.log('\n--- 1973 Twisted Metal Concepts ---');
  try {
    const p = await browser.newPage();
    await p.goto('https://twistedmetalconcepts.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const forms = await p.evaluate(() => Array.from(document.querySelectorAll('form')).map(f => ({
      action: f.action,
      inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => i.name || i.id || i.type)
    })));
    console.log('1973 forms:', forms);
    await p.close();
  } catch (e) {
    console.log('1973 error:', e.message);
  }

  // 4. Inspect #1975 Ross Metal Works
  console.log('\n--- 1975 Ross Metal Works ---');
  try {
    const p = await browser.newPage();
    await p.goto('https://rossmetalworks.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const forms = await p.evaluate(() => Array.from(document.querySelectorAll('form')).map(f => ({
      action: f.action,
      inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => i.name || i.id || i.type)
    })));
    console.log('1975 forms:', forms);
    await p.close();
  } catch (e) {
    console.log('1975 error:', e.message);
  }

  await browser.close();
}

testBatch41();
