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
  message: 'Hello, I am reaching out to express our interest in your services. We would appreciate the opportunity to explore a potential business relationship. Thank you, Pamela Jameson'
};

async function testTargeted() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. Submit #3210 JA Precision (Wix with native typing)
  console.log('\n--- 3210 Wix Native Typing ---');
  try {
    const p = await browser.newPage();
    await p.goto('https://japrecision-machinin.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await p.waitForSelector('input[aria-label="First name"]', { timeout: 10000 });
    
    await p.type('input[aria-label="First name"]', OUTREACH.firstName, { delay: 20 });
    await p.type('input[aria-label="Last name"]', OUTREACH.lastName, { delay: 20 });
    await p.type('input[aria-label="Email"]', OUTREACH.email, { delay: 20 });
    await p.type('textarea[aria-label="Write a message"]', OUTREACH.message, { delay: 10 });
    
    await new Promise(r => setTimeout(r, 1000));
    
    const submitBtn = await p.$('form button, form [data-testid="buttonElement"]');
    if (submitBtn) {
      console.log('3210 clicking submit button...');
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 6000));
      const pageText = await p.evaluate(() => document.body.innerText);
      console.log('3210 page text snippet:', pageText.slice(0, 500).replace(/\s+/g, ' '));
      const confirmed = /thanks for submitting|thank you|received|sent|success|gracias|mensaje enviado/i.test(pageText);
      console.log('3210 confirmed:', confirmed);
      if (confirmed) {
        const match = pageText.match(/.{0,40}(thanks for submitting|thank you|received|sent|success|gracias|mensaje enviado).{0,40}/i);
        const note = match ? match[0].trim() : 'Wix submission confirmed';
        db.prepare('UPDATE leads SET status = ?, notes = notes || ? WHERE id = ?').run('contacted', ' | Wix contact form submitted & confirmed: "' + note + '"', 3210);
        db.prepare('INSERT INTO contact_logs (lead_id, action, notes) VALUES (?, ?, ?)').run(3210, 'sent', 'Confirmed: ' + note);
        console.log('3210 DB UPDATED TO CONTACTED');
      }
    }
    await p.close();
  } catch (e) {
    console.log('3210 error:', e.message);
  }

  // 2. Submit #3213 Precise Cast (Formidable Form)
  console.log('\n--- 3213 Precise Cast ---');
  try {
    const p = await browser.newPage();
    await p.goto('https://precisecast.com/contact-us-2/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await p.waitForSelector('form.frm-show-form', { timeout: 10000 });

    const formDetails = await p.evaluate(() => {
      const form = document.querySelector('form.frm-show-form');
      return Array.from(form.querySelectorAll('.frm_form_field')).map(f => ({
        label: f.querySelector('label')?.innerText.trim(),
        inputName: f.querySelector('input, textarea, select')?.name
      }));
    });
    console.log('3213 fields:', formDetails);

    // Fill via page.type
    for (const f of formDetails) {
      if (!f.inputName) continue;
      const l = (f.label || '').toLowerCase();
      const sel = `[name="${f.inputName}"]`;
      if (/first/i.test(l)) await p.type(sel, OUTREACH.firstName, { delay: 15 });
      else if (/last/i.test(l)) await p.type(sel, OUTREACH.lastName, { delay: 15 });
      else if (/email/i.test(l)) await p.type(sel, OUTREACH.email, { delay: 15 });
      else if (/phone/i.test(l)) await p.type(sel, OUTREACH.phone, { delay: 15 });
      else if (/company/i.test(l)) await p.type(sel, OUTREACH.company, { delay: 15 });
      else if (/message|comment|project|details/i.test(l)) await p.type(sel, OUTREACH.message, { delay: 10 });
    }

    await new Promise(r => setTimeout(r, 1000));
    console.log('3213 submitting...');
    const submitBtn = await p.$('form.frm-show-form button[type="submit"], form.frm-show-form input[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 6000));
      const text = await p.evaluate(() => {
        const msg = document.querySelector('.frm_message') || document.querySelector('.frm_error_style');
        return msg ? msg.innerText : document.body.innerText.slice(0, 400);
      });
      console.log('3213 result text:', text.replace(/\s+/g, ' '));
      if (/thank you|received|sent|success|your message has been/i.test(text)) {
        const note = 'Formidable form submitted & confirmed: ' + text.trim();
        db.prepare('UPDATE leads SET status = ?, notes = notes || ? WHERE id = ?').run('contacted', ' | ' + note, 3213);
        db.prepare('INSERT INTO contact_logs (lead_id, action, notes) VALUES (?, ?, ?)').run(3213, 'sent', note);
        console.log('3213 DB UPDATED TO CONTACTED');
      }
    }
    await p.close();
  } catch (e) {
    console.log('3213 error:', e.message);
  }

  // 3. Inspect #3212 Precision Engineering & Construction
  console.log('\n--- 3212 Precision Engineering & Construction ---');
  try {
    const p = await browser.newPage();
    await p.goto('https://precisionec-llc.com/contact-us-engineering-and-construction-denver-colorado/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    const text = await p.evaluate(() => document.body.innerText.slice(0, 500));
    console.log('3212 text:', text.replace(/\s+/g, ' '));
    const forms = await p.evaluate(() => Array.from(document.querySelectorAll('form')).map(f => ({
      action: f.action,
      inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => i.name || i.id || i.type)
    })));
    console.log('3212 forms:', forms);
    await p.close();
  } catch (e) {
    console.log('3212 error:', e.message);
  }

  // 4. Inspect #3216 Muller Engineering
  console.log('\n--- 3216 Muller Engineering ---');
  try {
    const p = await browser.newPage();
    await p.goto('https://www.mullereng.com/contact/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    const text = await p.evaluate(() => document.body.innerText.slice(0, 500));
    console.log('3216 text:', text.replace(/\s+/g, ' '));
    const forms = await p.evaluate(() => Array.from(document.querySelectorAll('form')).map(f => ({
      action: f.action,
      inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => i.name || i.id || i.type)
    })));
    console.log('3216 forms:', forms);
    await p.close();
  } catch (e) {
    console.log('3216 error:', e.message);
  }

  // 5. Inspect #3217 Frontier Precision
  console.log('\n--- 3217 Frontier Precision ---');
  try {
    const p = await browser.newPage();
    await p.goto('https://frontierprecision.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    const text = await p.evaluate(() => document.body.innerText.slice(0, 500));
    console.log('3217 text:', text.replace(/\s+/g, ' '));
    const forms = await p.evaluate(() => Array.from(document.querySelectorAll('form')).map(f => ({
      action: f.action,
      inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => i.name || i.id || i.type)
    })));
    console.log('3217 forms:', forms);
    await p.close();
  } catch (e) {
    console.log('3217 error:', e.message);
  }

  // 6. Inspect #3208 Black Eagle
  console.log('\n--- 3208 Black Eagle ---');
  try {
    const p = await browser.newPage();
    await p.goto('https://blackeagleeng.com', { waitUntil: 'domcontentloaded', timeout: 25000 });
    const text = await p.evaluate(() => document.body.innerText.slice(0, 500));
    console.log('3208 text:', text.replace(/\s+/g, ' '));
    const forms = await p.evaluate(() => Array.from(document.querySelectorAll('form')).map(f => ({
      action: f.action,
      inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => i.name || i.id || i.type)
    })));
    console.log('3208 forms:', forms);
    await p.close();
  } catch (e) {
    console.log('3208 error:', e.message);
  }

  // 7. Inspect #3211 RJS Engineering
  console.log('\n--- 3211 RJS Engineering ---');
  try {
    const p = await browser.newPage();
    await p.goto('https://rjsarcflash.com', { waitUntil: 'domcontentloaded', timeout: 25000 });
    const text = await p.evaluate(() => document.body.innerText.slice(0, 500));
    console.log('3211 text:', text.replace(/\s+/g, ' '));
    const forms = await p.evaluate(() => Array.from(document.querySelectorAll('form')).map(f => ({
      action: f.action,
      inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => i.name || i.id || i.type)
    })));
    console.log('3211 forms:', forms);
    await p.close();
  } catch (e) {
    console.log('3211 error:', e.message);
  }

  await browser.close();
}

testTargeted();
