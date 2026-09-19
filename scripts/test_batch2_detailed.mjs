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
  message: 'Hello, I am reaching out to express our interest in your precision engineering and machining services. We would appreciate the opportunity to explore a potential business relationship on upcoming projects. Kindly contact us at your convenience. Thank you, Pamela Jameson'
};

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. Submit #3210 JA Precision Machining (Wix form)
  console.log('\n--- Processing #3210 JA Precision Machining ---');
  try {
    const p = await browser.newPage();
    await p.goto('https://japrecision-machinin.com', { waitUntil: 'networkidle2', timeout: 30000 });
    const inputs = await p.evaluate(() => {
      return Array.from(document.querySelectorAll('form input, form textarea')).map(el => ({
        id: el.id,
        type: el.type,
        ariaLabel: el.getAttribute('aria-label') || '',
        placeholder: el.placeholder || '',
        labels: Array.from(el.labels || []).map(l => l.innerText)
      }));
    });
    console.log('3210 form inputs:', inputs);

    // Fill inputs
    await p.evaluate((profile) => {
      const form = document.querySelector('form');
      if (!form) return;
      const textInputs = Array.from(form.querySelectorAll('input, textarea'));
      // Name
      if (textInputs[0]) textInputs[0].value = profile.fullName;
      // Phone / Company
      if (textInputs[1]) textInputs[1].value = profile.phone;
      // Email
      if (textInputs[2]) textInputs[2].value = profile.email;
      // Message
      if (textInputs[3]) textInputs[3].value = profile.message;

      textInputs.forEach(input => {
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }, OUTREACH);

    await new Promise(r => setTimeout(r, 1000));
    // Click submit
    await p.evaluate(() => {
      const submitBtn = document.querySelector('form button[type="submit"], form input[type="submit"], form button');
      if (submitBtn) submitBtn.click();
    });
    await new Promise(r => setTimeout(r, 6000));
    const result3210 = await p.evaluate(() => document.body.innerText);
    const confirmed3210 = /thank you|received|sent|success|gracias|mensaje enviado/i.test(result3210);
    console.log('3210 confirmed:', confirmed3210);
    if (confirmed3210) {
      const match = result3210.match(/.{0,40}(thank you|received|sent|success|gracias|mensaje enviado).{0,40}/i);
      const note = match ? match[0].trim() : 'Confirmed Wix submission';
      db.prepare('UPDATE leads SET status = ?, notes = notes || ? WHERE id = ?').run('contacted', ' | Wix contact form submitted & confirmed: "' + note + '"', 3210);
      db.prepare('INSERT INTO contact_logs (lead_id, action, notes) VALUES (?, ?, ?)').run(3210, 'sent', 'Confirmed: ' + note);
      console.log('3210 DB UPDATED TO CONTACTED');
    }
    await p.close();
  } catch (e) {
    console.log('3210 error:', e.message);
  }

  // 2. Submit #3213 Precise Cast Prototypes (Formidable Form - avoid honeypots!)
  console.log('\n--- Processing #3213 Precise Cast ---');
  try {
    const p = await browser.newPage();
    await p.goto('https://precisecast.com/contact-us-2/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Inspect fields and labels inside form
    const fieldDetails = await p.evaluate(() => {
      const form = document.querySelector('form.frm-show-form');
      if (!form) return [];
      const fields = Array.from(form.querySelectorAll('.frm_form_field'));
      return fields.map(f => {
        const label = f.querySelector('label')?.innerText.trim() || '';
        const input = f.querySelector('input, textarea, select');
        return {
          label,
          tag: input?.tagName,
          id: input?.id,
          name: input?.name,
          type: input?.type
        };
      });
    });
    console.log('3213 field details:', fieldDetails);

    // Carefully fill only legitimate visible fields (do not touch alt_s or ischly1941)
    await p.evaluate((profile) => {
      const form = document.querySelector('form.frm-show-form');
      const fields = Array.from(form.querySelectorAll('.frm_form_field'));
      fields.forEach(f => {
        const label = (f.querySelector('label')?.innerText || '').toLowerCase();
        const input = f.querySelector('input:not([type="hidden"]), textarea');
        if (!input) return;
        if (/first.*name/i.test(label)) input.value = profile.firstName;
        else if (/last.*name/i.test(label)) input.value = profile.lastName;
        else if (/name/i.test(label) && !/company/i.test(label)) input.value = profile.fullName;
        else if (/email/i.test(label)) input.value = profile.email;
        else if (/phone/i.test(label)) input.value = profile.phone;
        else if (/company/i.test(label)) input.value = profile.company;
        else if (/message|project|comment|how can we help/i.test(label)) input.value = profile.message;

        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }, OUTREACH);

    await new Promise(r => setTimeout(r, 1000));
    // Click submit
    await p.evaluate(() => {
      const submitBtn = document.querySelector('form.frm-show-form button[type="submit"], form.frm-show-form input[type="submit"]');
      if (submitBtn) submitBtn.click();
    });
    await new Promise(r => setTimeout(r, 6000));
    const result3213 = await p.evaluate(() => {
      const msg = document.querySelector('.frm_message');
      return msg ? msg.innerText : document.body.innerText;
    });
    console.log('3213 message:', result3213.slice(0, 300).replace(/\s+/g, ' '));
    const confirmed3213 = /thank you|received|sent|success|your message has been/i.test(result3213);
    console.log('3213 confirmed:', confirmed3213);
    if (confirmed3213) {
      const match = result3213.match(/.{0,40}(thank you|received|sent|success|message).{0,40}/i);
      const note = match ? match[0].trim() : 'Confirmed Formidable submission';
      db.prepare('UPDATE leads SET status = ?, notes = notes || ? WHERE id = ?').run('contacted', ' | Formidable contact form submitted & confirmed: "' + note + '"', 3213);
      db.prepare('INSERT INTO contact_logs (lead_id, action, notes) VALUES (?, ?, ?)').run(3213, 'sent', 'Confirmed: ' + note);
      console.log('3213 DB UPDATED TO CONTACTED');
    }
    await p.close();
  } catch (e) {
    console.log('3213 error:', e.message);
  }

  // 3. Inspect #3212 Precision Engineering & Construction
  console.log('\n--- Inspecting #3212 Precision Engineering & Construction ---');
  try {
    const p = await browser.newPage();
    await p.goto('https://precisionec-llc.com/contact-us-engineering-and-construction-denver-colorado/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const forms = await p.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder }))
      }));
    });
    console.log('3212 all forms:', JSON.stringify(forms, null, 2));
    await p.close();
  } catch (e) {
    console.log('3212 error:', e.message);
  }

  // 4. Inspect #3216 Muller Engineering
  console.log('\n--- Inspecting #3216 Muller Engineering ---');
  try {
    const p = await browser.newPage();
    await p.goto('https://www.mullereng.com/contact/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const forms = await p.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder }))
      }));
    });
    console.log('3216 contact forms:', JSON.stringify(forms, null, 2));
    const snippet = await p.evaluate(() => document.body.innerText.slice(0, 400));
    console.log('3216 snippet:', snippet.replace(/\s+/g, ' '));
    await p.close();
  } catch (e) {
    console.log('3216 error:', e.message);
  }

  // 5. Inspect #3217 Frontier Precision
  console.log('\n--- Inspecting #3217 Frontier Precision ---');
  try {
    const p = await browser.newPage();
    await p.goto('https://frontierprecision.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const forms = await p.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder }))
      }));
    });
    console.log('3217 forms:', JSON.stringify(forms, null, 2));
    await p.close();
  } catch (e) {
    console.log('3217 error:', e.message);
  }

  await browser.close();
}

run();
