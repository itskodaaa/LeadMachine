import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH = {
  name: 'Pamela Jameson',
  first: 'Pamela',
  last: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express our interest in your contracting services and explore potential collaboration on upcoming commercial projects. Kindly arrange for a representative to contact us. Thank you.'
};

const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
const getStmt = db.prepare('SELECT id, notes FROM leads WHERE id = ?');

function commitStatus(id, status, note) {
  const current = getStmt.get(id);
  const newNotes = current?.notes ? current.notes + ' | ' + note : note;
  db.transaction(() => {
    updateStmt.run(newNotes, status, id);
    const action = status === 'contacted' ? 'sent' : 'bounced';
    logStmt.run(id, action, note);
  })();
  console.log(`[DB COMMIT] Lead #${id} -> status: ${status}, note: ${note}`);
}

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. Lead 2401: Desert Valley Contracting
  try {
    console.log('\n--- Checking Lead #2401 Desert Valley Contracting ---');
    const page = await browser.newPage();
    await page.goto('https://www.desertvalleycontracting.net/contact-las-vegas-contractor', { waitUntil: 'networkidle2', timeout: 20000 });
    const forms = await page.$$('form');
    console.log('Forms found on contact page:', forms.length);
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log('Page text snippet:', pageText.slice(0, 300));
    
    // Check if there are inputs
    const inputs = await page.$$('input:not([type="hidden"]), textarea');
    console.log('Inputs found:', inputs.length);
    if (inputs.length > 0) {
      for (const input of inputs) {
        const info = await page.evaluate(el => ({
          name: el.name,
          type: el.type,
          placeholder: el.placeholder,
          id: el.id
        }), input);
        console.log('Input:', info);
        const name = (info.name || info.placeholder || info.id || '').toLowerCase();
        if (name.includes('name') || name.includes('first')) {
          await input.type(OUTREACH.name, { delay: 20 });
        } else if (name.includes('email')) {
          await input.type(OUTREACH.email, { delay: 20 });
        } else if (name.includes('phone')) {
          await input.type(OUTREACH.phone, { delay: 20 });
        } else if (name.includes('message') || name.includes('comment') || info.type === 'textarea') {
          await input.type(OUTREACH.message, { delay: 20 });
        }
      }
      // Check submit button
      const submitBtn = await page.$('button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Send")');
      if (submitBtn) {
        console.log('Clicking submit...');
        await Promise.all([
          page.waitForNavigation({ timeout: 8000 }).catch(() => {}),
          submitBtn.click()
        ]);
        await new Promise(r => setTimeout(r, 4000));
        const afterText = await page.evaluate(() => document.body.innerText);
        if (/thank you|received|sent|success/i.test(afterText)) {
          commitStatus(2401, 'contacted', 'Confirmed: Contact form submitted on contact-las-vegas-contractor page');
        } else {
          console.log('Post submit text snippet:', afterText.slice(0, 300));
        }
      }
    }
    await page.close();
  } catch (e) {
    console.error('Lead 2401 error:', e.message);
  }

  // 2. Lead 2402: Contri Construction Co
  try {
    console.log('\n--- Checking Lead #2402 Contri Construction Co ---');
    const page = await browser.newPage();
    await page.goto('https://www.contriconstruction.com/', { waitUntil: 'networkidle2', timeout: 20000 });
    const formFields = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, textarea, button'));
      return inputs.map(i => ({ tag: i.tagName, type: i.type, name: i.name, id: i.id, placeholder: i.placeholder, text: i.innerText }));
    });
    console.log('Contri form fields:', formFields);

    // Let's inspect the contact form on Contri
    const nameInput = await page.$('input[name*="name" i], input[placeholder*="name" i]');
    const emailInput = await page.$('input[name*="email" i], input[placeholder*="email" i]');
    const phoneInput = await page.$('input[name*="phone" i], input[placeholder*="phone" i]');
    const msgInput = await page.$('textarea');
    const submitBtn = await page.$('button[type="submit"], input[type="submit"]');

    if (nameInput) await nameInput.type(OUTREACH.name, { delay: 20 });
    if (emailInput) await emailInput.type(OUTREACH.email, { delay: 20 });
    if (phoneInput) await phoneInput.type(OUTREACH.phone, { delay: 20 });
    if (msgInput) await msgInput.type(OUTREACH.message, { delay: 20 });

    if (submitBtn) {
      console.log('Clicking Contri submit button...');
      await Promise.all([
        page.waitForNavigation({ timeout: 8000 }).catch(() => {}),
        submitBtn.click()
      ]);
      await new Promise(r => setTimeout(r, 4000));
      const afterText = await page.evaluate(() => document.body.innerText);
      console.log('Contri after submit text snippet:', afterText.slice(0, 400));
      if (/thank you|received|sent|success|message was sent/i.test(afterText)) {
        commitStatus(2402, 'contacted', 'Confirmed: Form submitted successfully on contriconstruction.com');
      }
    }
    await page.close();
  } catch (e) {
    console.error('Lead 2402 error:', e.message);
  }

  // 3. Lead 2405: TERRA CONTRACTING
  try {
    console.log('\n--- Checking Lead #2405 TERRA CONTRACTING ---');
    const page = await browser.newPage();
    await page.goto('https://terracontracting.com/contact-us/', { waitUntil: 'networkidle2', timeout: 20000 }).catch(async () => {
      await page.goto('https://terracontracting.com/', { waitUntil: 'networkidle2', timeout: 20000 });
    });
    console.log('Terra current URL:', page.url());
    const forms = await page.$$('form');
    console.log('Forms found on Terra:', forms.length);
    const formFields = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('form input:not([type="hidden"]), form textarea, form button, form select'));
      return inputs.map(i => ({ tag: i.tagName, type: i.type, name: i.name, id: i.id, placeholder: i.placeholder, text: i.innerText }));
    });
    console.log('Terra form fields:', formFields);

    const nameInput = await page.$('input[name*="name" i], input[placeholder*="Name" i]');
    const emailInput = await page.$('input[name*="email" i], input[placeholder*="Email" i]');
    const phoneInput = await page.$('input[name*="phone" i], input[placeholder*="Phone" i]');
    const msgInput = await page.$('textarea');
    const submitBtn = await page.$('form button[type="submit"], form input[type="submit"], button.fusion-button');

    if (nameInput) await nameInput.type(OUTREACH.name, { delay: 20 });
    if (emailInput) await emailInput.type(OUTREACH.email, { delay: 20 });
    if (phoneInput) await phoneInput.type(OUTREACH.phone, { delay: 20 });
    if (msgInput) await msgInput.type(OUTREACH.message, { delay: 20 });

    if (submitBtn) {
      console.log('Submitting Terra form...');
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 4000));
      const afterText = await page.evaluate(() => document.body.innerText);
      if (/thank you|received|sent|success|message was sent/i.test(afterText)) {
        commitStatus(2405, 'contacted', 'Confirmed: Message submitted on terracontracting.com');
      } else {
        console.log('Terra post-submit snippet:', afterText.slice(0, 300));
      }
    }
    await page.close();
  } catch (e) {
    console.error('Lead 2405 error:', e.message);
  }

  // 4. Lead 2407: Lanz Construction LLC
  try {
    console.log('\n--- Checking Lead #2407 Lanz Construction LLC ---');
    const page = await browser.newPage();
    await page.goto('https://www.lanzconstructionllc.com/contact-us', { waitUntil: 'networkidle2', timeout: 20000 });
    console.log('Lanz URL:', page.url());
    const inputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, button')).map(i => ({
        tag: i.tagName, type: i.type, name: i.name, id: i.id, placeholder: i.placeholder, text: i.innerText
      }));
    });
    console.log('Lanz inputs:', inputs);

    const nameInput = await page.$('input[name*="name" i], input[placeholder*="Name" i]');
    const emailInput = await page.$('input[name*="email" i], input[placeholder*="Email" i]');
    const phoneInput = await page.$('input[name*="phone" i], input[placeholder*="Phone" i]');
    const msgInput = await page.$('textarea');
    const submitBtn = await page.$('form button[type="submit"], form input[type="submit"], form button');

    if (nameInput) await nameInput.type(OUTREACH.name, { delay: 20 });
    if (emailInput) await emailInput.type(OUTREACH.email, { delay: 20 });
    if (phoneInput) await phoneInput.type(OUTREACH.phone, { delay: 20 });
    if (msgInput) await msgInput.type(OUTREACH.message, { delay: 20 });

    if (submitBtn) {
      console.log('Submitting Lanz form...');
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 4000));
      const afterText = await page.evaluate(() => document.body.innerText);
      if (/thank you|received|sent|success|message was sent/i.test(afterText)) {
        commitStatus(2407, 'contacted', 'Confirmed: Contact form submitted on lanzconstructionllc.com/contact-us');
      } else {
        console.log('Lanz post-submit snippet:', afterText.slice(0, 300));
      }
    }
    await page.close();
  } catch (e) {
    console.error('Lead 2407 error:', e.message);
  }

  // 5. Lead 2408: Civil Werx
  try {
    console.log('\n--- Checking Lead #2408 Civil Werx ---');
    const page = await browser.newPage();
    await page.goto('https://civilwerx.com/contact-us/', { waitUntil: 'networkidle2', timeout: 25000 }).catch(async () => {
      await page.goto('https://civilwerx.com/', { waitUntil: 'networkidle2', timeout: 25000 });
    });
    console.log('Civil Werx URL:', page.url());
    const forms = await page.$$('form');
    console.log('Forms on Civil Werx:', forms.length);
    const inputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, button')).map(i => ({
        tag: i.tagName, type: i.type, name: i.name, id: i.id, placeholder: i.placeholder, text: i.innerText
      }));
    });
    console.log('Civil Werx inputs:', inputs);
    await page.close();
  } catch (e) {
    console.error('Lead 2408 error:', e.message);
  }

  // 6. Lead 2410: H & M Unlimited Inc.
  try {
    console.log('\n--- Checking Lead #2410 H & M Unlimited Inc. ---');
    const page = await browser.newPage();
    await page.goto('https://hmunlimitedinc.com/contact-us/', { waitUntil: 'networkidle2', timeout: 20000 });
    console.log('H & M URL:', page.url());
    const inputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, button')).map(i => ({
        tag: i.tagName, type: i.type, name: i.name, id: i.id, placeholder: i.placeholder, text: i.innerText
      }));
    });
    console.log('H & M inputs:', inputs);

    const nameInput = await page.$('input[name*="your-name"], input[name*="name" i]');
    const emailInput = await page.$('input[name*="your-email"], input[name*="email" i]');
    const phoneInput = await page.$('input[name*="your-phone"], input[name*="phone" i], input[name*="tel" i]');
    const subjInput = await page.$('input[name*="your-subject"], input[name*="subject" i]');
    const msgInput = await page.$('textarea');
    const submitBtn = await page.$('input[type="submit"], button[type="submit"]');

    if (nameInput) await nameInput.type(OUTREACH.name, { delay: 20 });
    if (emailInput) await emailInput.type(OUTREACH.email, { delay: 20 });
    if (phoneInput) await phoneInput.type(OUTREACH.phone, { delay: 20 });
    if (subjInput) await subjInput.type('Exploring Collaboration Opportunities', { delay: 20 });
    if (msgInput) await msgInput.type(OUTREACH.message, { delay: 20 });

    if (submitBtn) {
      console.log('Submitting H & M form...');
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 5000));
      const responseNotice = await page.evaluate(() => {
        const el = document.querySelector('.wpcf7-response-output, .wpcf7-mail-sent-ok, .wpcf7-not-valid-tip');
        return el ? el.innerText : null;
      });
      console.log('H & M responseNotice:', responseNotice);
      const afterText = await page.evaluate(() => document.body.innerText);
      if (responseNotice && /thank you|received|sent|success/i.test(responseNotice)) {
        commitStatus(2410, 'contacted', `Confirmed WP CF7: ${responseNotice}`);
      } else if (/thank you|received|sent|success/i.test(afterText)) {
        commitStatus(2410, 'contacted', 'Confirmed: Form submitted successfully on hmunlimitedinc.com');
      } else {
        console.log('H & M not confirmed, response was:', responseNotice);
      }
    }
    await page.close();
  } catch (e) {
    console.error('Lead 2410 error:', e.message);
  }

  // 7. Lead 2411: JKL Development, Inc.
  try {
    console.log('\n--- Checking Lead #2411 JKL Development, Inc. ---');
    const page = await browser.newPage();
    await page.goto('https://jkldev.com/contact', { waitUntil: 'networkidle2', timeout: 20000 });
    console.log('JKL URL:', page.url());
    const inputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, button')).map(i => ({
        tag: i.tagName, type: i.type, name: i.name, id: i.id, placeholder: i.placeholder, text: i.innerText
      }));
    });
    console.log('JKL inputs:', inputs);

    const nameInput = await page.$('input[name*="name" i], input[placeholder*="Name" i]');
    const emailInput = await page.$('input[name*="email" i], input[placeholder*="Email" i]');
    const phoneInput = await page.$('input[name*="phone" i], input[placeholder*="Phone" i]');
    const msgInput = await page.$('textarea');
    const submitBtn = await page.$('form button[type="submit"], form input[type="submit"], form button');

    if (nameInput) await nameInput.type(OUTREACH.name, { delay: 20 });
    if (emailInput) await emailInput.type(OUTREACH.email, { delay: 20 });
    if (phoneInput) await phoneInput.type(OUTREACH.phone, { delay: 20 });
    if (msgInput) await msgInput.type(OUTREACH.message, { delay: 20 });

    if (submitBtn) {
      console.log('Submitting JKL form...');
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 4000));
      const afterText = await page.evaluate(() => document.body.innerText);
      if (/thank you|received|sent|success|message was sent/i.test(afterText)) {
        commitStatus(2411, 'contacted', 'Confirmed: Contact form submitted on jkldev.com/contact');
      } else {
        console.log('JKL post-submit snippet:', afterText.slice(0, 300));
      }
    }
    await page.close();
  } catch (e) {
    console.error('Lead 2411 error:', e.message);
  }

  await browser.close();
  console.log('\n--- Deep submit run finished ---');
}

run();
