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
  address: '100 Main St',
  city: 'Denver',
  state: 'CO',
  zip: '80202',
  message: 'Hello, I am reaching out to express our interest in your precision engineering and machining services. We would appreciate the opportunity to explore a potential business relationship on upcoming projects. Kindly arrange for a representative to contact us at your earliest convenience. Thank you, Pamela Jameson'
};

async function processTargets() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. Submit #3212 Precision Engineering & Construction (CF7)
  console.log('\n--- 3212 Precision E&C (CF7) ---');
  try {
    const p = await browser.newPage();
    await p.goto('https://precisionec-llc.com/contact-us-engineering-and-construction-denver-colorado/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await p.waitForSelector('form.wpcf7-form', { timeout: 10000 });
    
    await p.type('input[name="your-name"]', OUTREACH.fullName, { delay: 15 });
    await p.type('input[name="your-email"]', OUTREACH.email, { delay: 15 });
    await p.type('input[name="your-subject"]', OUTREACH.subject, { delay: 15 });
    await p.type('textarea[name="your-message"]', OUTREACH.message, { delay: 10 });
    
    await new Promise(r => setTimeout(r, 1000));
    await p.evaluate(() => {
      const submitBtn = document.querySelector('form.wpcf7-form input[type="submit"]');
      if (submitBtn) {
        submitBtn.scrollIntoView();
        submitBtn.click();
      }
    });
    await new Promise(r => setTimeout(r, 6000));
    const cf7Response = await p.evaluate(() => {
      const out = document.querySelector('form.wpcf7-form .wpcf7-response-output');
      return out ? out.innerText.trim() : '';
    });
    console.log('3212 CF7 response:', cf7Response);
    if (/thank you|received|sent|success/i.test(cf7Response)) {
      db.prepare('UPDATE leads SET status = ?, notes = notes || ? WHERE id = ?').run('contacted', ' | CF7 submitted & confirmed: "' + cf7Response + '"', 3212);
      db.prepare('INSERT INTO contact_logs (lead_id, action, notes) VALUES (?, ?, ?)').run(3212, 'sent', 'Confirmed CF7: ' + cf7Response);
      console.log('3212 DB UPDATED TO CONTACTED');
    }
    await p.close();
  } catch (e) {
    console.log('3212 error:', e.message);
  }

  // 2. Submit #3217 Frontier Precision (Gravity Forms)
  console.log('\n--- 3217 Frontier Precision (Gravity Forms) ---');
  try {
    const p = await browser.newPage();
    await p.goto('https://frontierprecision.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await p.waitForSelector('form#gform_2', { timeout: 10000 });
    
    // Inspect inputs in gform_2
    const gInputs = await p.evaluate(() => {
      const form = document.querySelector('form#gform_2');
      return Array.from(form.querySelectorAll('input, textarea, select')).map(i => ({
        name: i.name,
        id: i.id,
        type: i.type,
        placeholder: i.placeholder
      }));
    });
    console.log('3217 gform_2 inputs:', gInputs);

    // Type fields
    if (await p.$('input[name="input_1.3"]')) await p.type('input[name="input_1.3"]', OUTREACH.firstName);
    if (await p.$('input[name="input_1.6"]')) await p.type('input[name="input_1.6"]', OUTREACH.lastName);
    if (await p.$('input[name="input_3"]')) await p.type('input[name="input_3"]', OUTREACH.phone);
    if (await p.$('input[name="input_4"]')) await p.type('input[name="input_4"]', OUTREACH.email);
    if (await p.$('input[name="input_13"]')) await p.type('input[name="input_13"]', OUTREACH.company);
    if (await p.$('textarea[name="input_9"]')) await p.type('textarea[name="input_9"]', OUTREACH.message);
    if (await p.$('input[name="input_14"]')) await p.type('input[name="input_14"]', OUTREACH.subject);

    // Select dropdown if required
    await p.evaluate(() => {
      const selects = document.querySelectorAll('form#gform_2 select');
      selects.forEach(s => {
        if (s.options.length > 1) s.selectedIndex = 1;
        s.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });

    await new Promise(r => setTimeout(r, 1000));
    console.log('3217 clicking gform submit...');
    await p.evaluate(() => {
      const btn = document.querySelector('form#gform_2 input[type="submit"], form#gform_2 button[type="submit"]');
      if (btn) {
        btn.scrollIntoView();
        btn.click();
      }
    });
    await new Promise(r => setTimeout(r, 6000));
    const gformResp = await p.evaluate(() => {
      const conf = document.querySelector('.gform_confirmation_message, .gforms_confirmation_message');
      if (conf) return conf.innerText.trim();
      const err = document.querySelector('.gform_validation_errors, .validation_error');
      if (err) return 'Validation error: ' + err.innerText.trim();
      return document.body.innerText.slice(0, 400).replace(/\s+/g, ' ');
    });
    console.log('3217 gform response:', gformResp);
    if (/thank you|received|sent|success|thanks for contacting/i.test(gformResp)) {
      db.prepare('UPDATE leads SET status = ?, notes = notes || ? WHERE id = ?').run('contacted', ' | Gravity Form submitted & confirmed: "' + gformResp.slice(0, 100) + '"', 3217);
      db.prepare('INSERT INTO contact_logs (lead_id, action, notes) VALUES (?, ?, ?)').run(3217, 'sent', 'Confirmed Gravity Form: ' + gformResp.slice(0, 100));
      console.log('3217 DB UPDATED TO CONTACTED');
    }
    await p.close();
  } catch (e) {
    console.log('3217 error:', e.message);
  }

  // 3. Inspect & Submit #3208 Black Eagle
  console.log('\n--- 3208 Black Eagle ---');
  try {
    const p = await browser.newPage();
    await p.goto('https://blackeagleeng.com', { waitUntil: 'domcontentloaded', timeout: 25000 });
    const inputs = await p.evaluate(() => {
      const form = document.querySelectorAll('form')[1];
      if (!form) return [];
      return Array.from(form.querySelectorAll('input, textarea')).map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        placeholder: i.placeholder,
        ariaLabel: i.getAttribute('aria-label')
      }));
    });
    console.log('3208 form 1 inputs:', inputs);
    
    // Type into form 1 inputs
    const form1 = (await p.$$('form'))[1];
    if (form1) {
      await p.evaluate((profile) => {
        const f = document.querySelectorAll('form')[1];
        const textInputs = Array.from(f.querySelectorAll('input:not([style*="display:none"]), textarea'));
        if (textInputs[0]) textInputs[0].value = profile.fullName;
        if (textInputs[1]) textInputs[1].value = profile.email;
        if (textInputs[2]) textInputs[2].value = profile.phone;
        if (textInputs[3]) textInputs[3].value = profile.message;
        textInputs.forEach(i => {
          i.dispatchEvent(new Event('input', { bubbles: true }));
          i.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }, OUTREACH);
      await new Promise(r => setTimeout(r, 1000));
      await p.evaluate(() => {
        const f = document.querySelectorAll('form')[1];
        const btn = f.querySelector('button[type="submit"], input[type="submit"], button');
        if (btn) btn.click();
      });
      await new Promise(r => setTimeout(r, 5000));
      const pageText = await p.evaluate(() => {
        const f = document.querySelectorAll('form')[1];
        return f ? f.innerText : document.body.innerText;
      });
      console.log('3208 text after submit:', pageText.replace(/\s+/g, ' '));
      if (/thank you|received|sent|success/i.test(pageText)) {
        db.prepare('UPDATE leads SET status = ?, notes = notes || ? WHERE id = ?').run('contacted', ' | Contact form submitted & confirmed: "' + pageText.slice(0, 100) + '"', 3208);
        db.prepare('INSERT INTO contact_logs (lead_id, action, notes) VALUES (?, ?, ?)').run(3208, 'sent', 'Confirmed: ' + pageText.slice(0, 100));
        console.log('3208 DB UPDATED TO CONTACTED');
      }
    }
    await p.close();
  } catch (e) {
    console.log('3208 error:', e.message);
  }

  // 4. Verify #3213 Precise Cast Formidable response
  console.log('\n--- 3213 Verification ---');
  try {
    const p = await browser.newPage();
    await p.goto('https://precisecast.com/contact-us-2/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    // Dismiss cookie banner
    await p.evaluate(() => {
      const acceptBtn = document.querySelector('#cookie_action_close_header, .cookie-accept, #wt-cli-accept-btn');
      if (acceptBtn) acceptBtn.click();
    });
    // Check if form has honeypot or captcha
    const formInfo = await p.evaluate(() => {
      const f = document.querySelector('form.frm-show-form');
      return {
        hasCaptcha: !!f?.querySelector('.g-recaptcha, iframe'),
        action: f?.action
      };
    });
    console.log('3213 form status:', formInfo);
    await p.close();
  } catch (e) {
    console.log('3213 error:', e.message);
  }

  // 5. Inspect Muller Engineering (#3216) real contact link
  console.log('\n--- 3216 Muller Navigation ---');
  try {
    const p = await browser.newPage();
    await p.goto('https://www.mullereng.com/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    const allLinks = await p.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({ href: a.href, text: a.innerText.trim() }));
    });
    const contactLinks = allLinks.filter(l => /contact/i.test(l.href) || /contact/i.test(l.text));
    console.log('3216 contact links:', contactLinks);
    if (contactLinks.length > 0) {
      await p.goto(contactLinks[0].href, { waitUntil: 'domcontentloaded', timeout: 20000 });
      console.log('3216 real contact URL:', p.url());
      const bodyText = await p.evaluate(() => document.body.innerText.slice(0, 400));
      console.log('3216 contact body snippet:', bodyText.replace(/\s+/g, ' '));
      const forms = await p.evaluate(() => Array.from(document.querySelectorAll('form')).map(f => ({
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => i.name || i.id || i.type)
      })));
      console.log('3216 forms:', forms);
    }
    await p.close();
  } catch (e) {
    console.log('3216 error:', e.message);
  }

  await browser.close();
}

processTargets();
