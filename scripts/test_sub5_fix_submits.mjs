import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const PROFILE = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  zip: '60601',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Sincerely, Pamela Jameson'
};

async function runFixes() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  // 1. MANA ENGINEERING (#4219)
  console.log('\n=== Submitting #4219 MANA ENGINEERING ===');
  try {
    const page = await browser.newPage();
    await page.goto('https://mana-ce.com/contact.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    await page.type('#fname', PROFILE.fullName, { delay: 20 });
    await page.type('#email', PROFILE.email, { delay: 20 });
    await page.type('#subject', PROFILE.subject, { delay: 20 });
    await page.type('#message', PROFILE.message, { delay: 10 });

    console.log('MANA: Clicking submit and waiting for navigation...');
    const [response] = await Promise.all([
      page.waitForNavigation({ timeout: 15000 }).catch(e => null),
      page.click('button[type="submit"]')
    ]);

    await new Promise(r => setTimeout(r, 3000));
    const currentUrl = page.url();
    const content = await page.evaluate(() => document.body?.innerText || '');
    console.log('MANA post-submit URL:', currentUrl);
    console.log('MANA post-submit content snippet:', content.substring(0, 300).replace(/\n+/g, ' '));

    const confirmed = /thank|sent|success|received/i.test(content) || /contact\.php/i.test(currentUrl);
    if (confirmed) {
      console.log('✅ MANA SUBMISSION CONFIRMED!');
      db.prepare('UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run('contacted', `Confirmed: Submitted via contact.php (${currentUrl})`, 4219);
      db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
        .run(4219, 'sent', `Confirmed: Submitted via contact.php (${currentUrl})`);
    } else {
      console.log('MANA: Not confirmed');
    }
    await page.close();
  } catch (e) {
    console.log('MANA error:', e.message);
  }

  // 2. CS Mechanical (#4221)
  console.log('\n=== Submitting #4221 CS Mechanical ===');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.csmechanical.co/contact', { waitUntil: 'networkidle2', timeout: 30000 });

    await page.type('#field_qh4icy3', PROFILE.firstName, { delay: 20 });
    await page.type('#field_ocfup13', PROFILE.lastName, { delay: 20 });
    await page.type('#field_29yf4d3', PROFILE.email, { delay: 20 });
    await page.type('#field_79qyc3', PROFILE.company, { delay: 20 });
    await page.type('#field_exy0k2', PROFILE.zip, { delay: 20 });
    await page.type('#field_av51o2', PROFILE.phone, { delay: 20 });
    
    // Select dropdowns
    await page.select('#field_2njou2', 'Industrial' /* or first option */).catch(() => {});
    await page.evaluate(() => {
      const s1 = document.getElementById('field_2njou2');
      if (s1 && s1.options.length > 1) s1.selectedIndex = 1;
      const s2 = document.getElementById('field_rk3vc2');
      if (s2 && s2.options.length > 1) s2.selectedIndex = 1;
    });

    await page.type('#field_e6lis63', PROFILE.subject, { delay: 20 });
    await page.type('#field_9jv0r13', PROFILE.message, { delay: 10 });

    console.log('CS Mechanical: Submitting Formidable Form...');
    const submitBtn = await page.$('#form_contact-us button[type="submit"], #form_contact-us .frm_button_submit');
    if (submitBtn) {
      await Promise.all([
        submitBtn.click(),
        new Promise(r => setTimeout(r, 6000))
      ]);
      const bodyText = await page.evaluate(() => document.body.innerText);
      const frmMsg = await page.evaluate(() => document.querySelector('.frm_message')?.innerText || '');
      console.log('CS Mechanical .frm_message:', frmMsg);
      console.log('CS Mechanical snippet:', bodyText.substring(0, 300).replace(/\n+/g, ' '));
      const confirmed = /thank|received|success/i.test(frmMsg) || /thank you|thanks for|received your message|successfully submitted/i.test(bodyText);
      if (confirmed) {
        console.log('✅ CS MECHANICAL SUBMISSION CONFIRMED!');
        db.prepare('UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run('contacted', `Confirmed: Formidable Form submitted (${frmMsg || 'Thank you message displayed'})`, 4221);
        db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
          .run(4221, 'sent', `Confirmed: Formidable Form submitted (${frmMsg || 'Thank you message displayed'})`);
      } else {
        console.log('CS Mechanical: Not confirmed');
      }
    }
    await page.close();
  } catch (e) {
    console.log('CS Mechanical error:', e.message);
  }

  // 3. CAM Integrated Solutions (#4216)
  console.log('\n=== Inspecting & Submitting #4216 CAM Integrated Solutions ===');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.camintegrated.com/contact', { waitUntil: 'networkidle2', timeout: 30000 });

    // Wix inputs
    await page.evaluate((prof) => {
      const nameInput = document.getElementById('input_comp-k66juqeu');
      const emailInput = document.getElementById('input_comp-k66juqfq');
      const subInput = document.getElementById('input_comp-k66juqgk');
      const msgInput = document.getElementById('textarea_comp-k66juqhm');
      
      function setVal(el, val) {
        if (!el) return;
        el.focus();
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.blur();
      }

      setVal(nameInput, prof.fullName);
      setVal(emailInput, prof.email);
      setVal(subInput, prof.subject);
      setVal(msgInput, prof.message);
    }, PROFILE);

    // Let's also type a character into each to trigger Wix React synthetic state
    const nameEl = await page.$('#input_comp-k66juqeu');
    if (nameEl) { await nameEl.focus(); await page.keyboard.press('Space'); await page.keyboard.press('Backspace'); }
    const emailEl = await page.$('#input_comp-k66juqfq');
    if (emailEl) { await emailEl.focus(); await page.keyboard.press('Space'); await page.keyboard.press('Backspace'); }

    console.log('CAM: Clicking submit button...');
    const submitBtn = await page.$('form#comp-k66juqee1 button, button[data-testid="buttonElement"]');
    if (submitBtn) {
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 6000));
      
      const res = await page.evaluate(() => {
        const notif = document.querySelector('[data-testid="form-notifications"], [aria-live="polite"], .wix-form-notification');
        const text = document.body.innerText;
        return {
          notifText: notif?.innerText || '',
          snippet: text.substring(0, 400).replace(/\n+/g, ' ')
        };
      });
      console.log('CAM Notification:', res.notifText);
      console.log('CAM Snippet:', res.snippet);

      const confirmed = /thank|received|sent|success/i.test(res.notifText) || /thanks for submitting/i.test(res.snippet);
      if (confirmed) {
        console.log('✅ CAM SUBMISSION CONFIRMED!');
        db.prepare('UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run('contacted', `Confirmed: Wix form submitted (${res.notifText || 'Thanks for submitting'})`, 4216);
        db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
          .run(4216, 'sent', `Confirmed: Wix form submitted (${res.notifText || 'Thanks for submitting'})`);
      }
    }
    await page.close();
  } catch (e) {
    console.log('CAM error:', e.message);
  }

  await browser.close();
}

runFixes();
